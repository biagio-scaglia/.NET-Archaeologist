using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using DotNetArchaeologist.Core.Contracts;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Analysis.Engines;

/// <summary>
/// Motore archeologico per l'ispezione passiva di una Solution .NET (.sln) o cartella di progetto.
/// Mappa i progetti proprietari, localizza gli assembly compilati e rileva ruoli architetturali
/// (Microservizi WCF/REST, Database DbContext/Repository/Stored Procedure, Processi Batch, Dominio).
/// Rispetta il principio di Zero-Execution: nessuna esecuzione di codice target.
/// </summary>
public sealed class SolutionInspector : ISolutionInspector
{
    private static readonly Regex SolutionProjectRegex = new(
        @"^Project\(""\{[A-F0-9\-]+\}""\)\s*=\s*""([^""]+)"",\s*""([^""]+)"",\s*""\{[A-F0-9\-]+\}""",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.Multiline);

    private readonly IAssemblyInspector _assemblyInspector;

    public SolutionInspector(IAssemblyInspector? assemblyInspector = null)
    {
        _assemblyInspector = assemblyInspector ?? new MetadataAssemblyInspector();
    }

    public async Task<SolutionDescriptor> InspectSolutionAsync(
        string solutionOrFolderPath,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(solutionOrFolderPath);

        var (solutionPath, solutionName) = ResolveSolutionFile(solutionOrFolderPath);
        var solutionDir = Path.GetDirectoryName(solutionPath) ?? AppContext.BaseDirectory;

        var slnContent = await File.ReadAllTextAsync(solutionPath, cancellationToken).ConfigureAwait(false);
        var projectEntries = ParseSolutionProjects(slnContent, solutionDir);

        var indexedEntries = projectEntries.Select((entry, index) => (entry, index)).ToList();
        var analysisResults = new System.Collections.Concurrent.ConcurrentBag<ProjectAnalysisResult>();

        await Parallel.ForEachAsync(
            indexedEntries,
            new ParallelOptions
            {
                MaxDegreeOfParallelism = Math.Max(1, Environment.ProcessorCount),
                CancellationToken = cancellationToken
            },
            async (item, ct) =>
            {
                var (entry, index) = item;
                var projDesc = await AnalyzeProjectAsync(entry, ct).ConfigureAwait(false);
                var pServices = new List<DiscoveredServiceDescriptor>();
                var pDatabases = new List<DiscoveredDatabaseDescriptor>();
                var pBatchWorkers = new List<DiscoveredBatchWorkerDescriptor>();
                var pDomainComponents = new List<DiscoveredDomainComponentDescriptor>();

                // Se l'assembly compilato esiste, procediamo con l'analisi profonda a zero-execution
                if (projDesc.AssemblyExists && !string.IsNullOrEmpty(projDesc.OutputAssemblyPath))
                {
                    try
                    {
                        var asmDesc = await _assemblyInspector.InspectFileAsync(
                            projDesc.OutputAssemblyPath,
                            ct).ConfigureAwait(false);

                        ExtractArchitecturalRoles(projDesc, asmDesc, pServices, pDatabases, pBatchWorkers, pDomainComponents);
                    }
                    catch
                    {
                        // Fallback silenzioso su euristica del progetto se l'assembly è parziale o corrotto
                        FallbackArchitecturalRoles(projDesc, pServices, pDatabases, pBatchWorkers, pDomainComponents);
                    }
                }
                else
                {
                    FallbackArchitecturalRoles(projDesc, pServices, pDatabases, pBatchWorkers, pDomainComponents);
                }

                analysisResults.Add(new ProjectAnalysisResult(index, projDesc, pServices, pDatabases, pBatchWorkers, pDomainComponents));
            }).ConfigureAwait(false);

        var sortedResults = analysisResults.OrderBy(r => r.OriginalIndex).ToList();
        var projects = new List<SolutionProjectDescriptor>(sortedResults.Count);
        var services = new List<DiscoveredServiceDescriptor>();
        var databases = new List<DiscoveredDatabaseDescriptor>();
        var batchWorkers = new List<DiscoveredBatchWorkerDescriptor>();
        var domainComponents = new List<DiscoveredDomainComponentDescriptor>();

        foreach (var res in sortedResults)
        {
            projects.Add(res.Project);
            services.AddRange(res.Services);
            databases.AddRange(res.Databases);
            batchWorkers.AddRange(res.BatchWorkers);
            domainComponents.AddRange(res.DomainComponents);
        }

        return new SolutionDescriptor(
            Name: solutionName,
            SolutionPath: solutionPath,
            Projects: projects,
            Services: services,
            Databases: databases,
            BatchWorkers: batchWorkers,
            DomainComponents: domainComponents);
    }

    private static (string SolutionPath, string SolutionName) ResolveSolutionFile(string inputPath)
    {
        if (File.Exists(inputPath))
        {
            var ext = Path.GetExtension(inputPath).ToLowerInvariant();
            if (ext == ".sln" || ext == ".slnx")
            {
                return (Path.GetFullPath(inputPath), Path.GetFileNameWithoutExtension(inputPath));
            }
        }

        if (Directory.Exists(inputPath))
        {
            var slnFiles = Directory.GetFiles(inputPath, "*.sln", SearchOption.TopDirectoryOnly);
            if (slnFiles.Length > 0)
            {
                return (Path.GetFullPath(slnFiles[0]), Path.GetFileNameWithoutExtension(slnFiles[0]));
            }

            var slnxFiles = Directory.GetFiles(inputPath, "*.slnx", SearchOption.TopDirectoryOnly);
            if (slnxFiles.Length > 0)
            {
                return (Path.GetFullPath(slnxFiles[0]), Path.GetFileNameWithoutExtension(slnxFiles[0]));
            }

            // Ricerca fino a 2 livelli di profondità
            var subSln = Directory.GetFiles(inputPath, "*.sln", SearchOption.AllDirectories).FirstOrDefault();
            if (subSln != null)
            {
                return (Path.GetFullPath(subSln), Path.GetFileNameWithoutExtension(subSln));
            }

            throw new FileNotFoundException(
                $"Nessun file di Solution (.sln) trovato nella cartella specificata: {inputPath}");
        }

        throw new FileNotFoundException($"Percorso non trovato: {inputPath}");
    }

    private sealed record ProjectEntry(string Name, string RelativePath, string FullPath);

    private sealed record ProjectAnalysisResult(
        int OriginalIndex,
        SolutionProjectDescriptor Project,
        List<DiscoveredServiceDescriptor> Services,
        List<DiscoveredDatabaseDescriptor> Databases,
        List<DiscoveredBatchWorkerDescriptor> BatchWorkers,
        List<DiscoveredDomainComponentDescriptor> DomainComponents);

    private static List<ProjectEntry> ParseSolutionProjects(string slnContent, string solutionDir)
    {
        var entries = new List<ProjectEntry>();
        var matches = SolutionProjectRegex.Matches(slnContent);

        foreach (Match match in matches)
        {
            var name = match.Groups[1].Value.Trim();
            var relPath = match.Groups[2].Value.Trim().Replace('\\', Path.DirectorySeparatorChar);

            // Ignoriamo cartelle di solution e file non C#/VB/F# project
            if (!relPath.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase) &&
                !relPath.EndsWith(".vbproj", StringComparison.OrdinalIgnoreCase) &&
                !relPath.EndsWith(".fsproj", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var fullPath = Path.GetFullPath(Path.Combine(solutionDir, relPath));
            entries.Add(new ProjectEntry(name, relPath, fullPath));
        }

        return entries;
    }

    private static async Task<SolutionProjectDescriptor> AnalyzeProjectAsync(
        ProjectEntry entry,
        CancellationToken cancellationToken)
    {
        var projectReferences = new List<string>();
        var packageReferences = new List<string>();
        var detectedTechnologies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var category = ComponentCategory.Library;
        string? assemblyName = null;
        string? outputType = null;

        if (File.Exists(entry.FullPath))
        {
            try
            {
                var content = await File.ReadAllTextAsync(entry.FullPath, cancellationToken).ConfigureAwait(false);

                // Lettura riferimenti di progetto
                var pRefMatches = Regex.Matches(content, @"<ProjectReference\s+Include=""([^""]+)""", RegexOptions.IgnoreCase);
                foreach (Match m in pRefMatches)
                {
                    var pRef = Path.GetFileNameWithoutExtension(m.Groups[1].Value);
                    if (!string.IsNullOrEmpty(pRef) && !projectReferences.Contains(pRef))
                    {
                        projectReferences.Add(pRef);
                    }
                }

                // Lettura package NuGet o References
                var pkgMatches = Regex.Matches(content, @"<PackageReference\s+Include=""([^""]+)""", RegexOptions.IgnoreCase);
                foreach (Match m in pkgMatches)
                {
                    packageReferences.Add(m.Groups[1].Value);
                }

                var refMatches = Regex.Matches(content, @"<Reference\s+Include=""([^"",]+)", RegexOptions.IgnoreCase);
                foreach (Match m in refMatches)
                {
                    var refName = m.Groups[1].Value.Trim();
                    if (!packageReferences.Contains(refName))
                    {
                        packageReferences.Add(refName);
                    }
                }

                // AssemblyName e OutputType
                var asmMatch = Regex.Match(content, @"<AssemblyName>([^<]+)</AssemblyName>", RegexOptions.IgnoreCase);
                if (asmMatch.Success) assemblyName = asmMatch.Groups[1].Value.Trim();

                var outMatch = Regex.Match(content, @"<OutputType>([^<]+)</OutputType>", RegexOptions.IgnoreCase);
                if (outMatch.Success) outputType = outMatch.Groups[1].Value.Trim();

                // Rilevamento tecnologie nel csproj
                if (content.Contains("EntityFramework", StringComparison.OrdinalIgnoreCase) ||
                    content.Contains("System.Data.Entity", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("Entity Framework");
                }
                if (content.Contains("System.ServiceModel", StringComparison.OrdinalIgnoreCase) ||
                    content.Contains(".svc", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("WCF Service (SOAP)");
                }
                if (content.Contains("System.Web.Mvc", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("ASP.NET MVC");
                }
                if (content.Contains("System.Web.Http", StringComparison.OrdinalIgnoreCase) ||
                    content.Contains("Microsoft.AspNetCore.Mvc", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("ASP.NET Web API");
                }
                if (content.Contains("Quartz", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("Quartz Scheduler");
                }
                if (content.Contains("Autofac", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("Autofac IoC");
                }
                if (content.Contains("Dapper", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("Dapper");
                }
                if (content.Contains("nunit", StringComparison.OrdinalIgnoreCase) ||
                    content.Contains("xunit", StringComparison.OrdinalIgnoreCase) ||
                    content.Contains("QualityTools", StringComparison.OrdinalIgnoreCase))
                {
                    detectedTechnologies.Add("Test Suite");
                }
            }
            catch
            {
                // Ignora errori di parsing XML non fatali
            }
        }

        assemblyName ??= entry.Name;

        // Localizzazione binario compilato
        var (assemblyPath, exists) = LocateOutputAssembly(entry.FullPath, assemblyName);

        // Determinazione categoria
        category = DeduceCategory(entry.Name, outputType, detectedTechnologies);

        return new SolutionProjectDescriptor(
            Name: entry.Name,
            ProjectPath: entry.FullPath,
            RelativePath: entry.RelativePath,
            OutputAssemblyPath: assemblyPath,
            AssemblyExists: exists,
            Category: category,
            ProjectReferences: projectReferences,
            PackageReferences: packageReferences,
            DetectedTechnologies: detectedTechnologies.ToList());
    }

    private static (string? AssemblyPath, bool Exists) LocateOutputAssembly(string projectFullPath, string assemblyName)
    {
        var projectDir = Path.GetDirectoryName(projectFullPath);
        if (projectDir == null || !Directory.Exists(projectDir))
        {
            return (null, false);
        }

        var binDir = Path.Combine(projectDir, "bin");
        if (!Directory.Exists(binDir))
        {
            return (null, false);
        }

        var fileCandidates = new[]
        {
            Path.Combine(binDir, "Debug", $"{assemblyName}.dll"),
            Path.Combine(binDir, "Release", $"{assemblyName}.dll"),
            Path.Combine(binDir, $"{assemblyName}.dll"),
            Path.Combine(binDir, "Debug", $"{assemblyName}.exe"),
            Path.Combine(binDir, "Release", $"{assemblyName}.exe"),
            Path.Combine(binDir, $"{assemblyName}.exe")
        };

        foreach (var candidate in fileCandidates)
        {
            if (File.Exists(candidate))
            {
                return (Path.GetFullPath(candidate), true);
            }
        }

        // Ricerca ricorsiva se non nelle posizioni standard
        try
        {
            var found = Directory.GetFiles(binDir, $"{assemblyName}.dll", SearchOption.AllDirectories).FirstOrDefault();
            if (found != null) return (Path.GetFullPath(found), true);

            var foundExe = Directory.GetFiles(binDir, $"{assemblyName}.exe", SearchOption.AllDirectories).FirstOrDefault();
            if (foundExe != null) return (Path.GetFullPath(foundExe), true);
        }
        catch
        {
            // Ignora eccezioni di accesso
        }

        return (null, false);
    }

    private static ComponentCategory DeduceCategory(
        string projectName,
        string? outputType,
        HashSet<string> technologies)
    {
        var nameLower = projectName.ToLowerInvariant();

        if (technologies.Contains("Test Suite") || nameLower.Contains("test"))
        {
            return ComponentCategory.Test;
        }

        if (nameLower.Contains("batch") || nameLower.Contains("worker") || nameLower.Contains("job") ||
            (outputType?.Equals("Exe", StringComparison.OrdinalIgnoreCase) == true && !nameLower.Contains("web")))
        {
            return ComponentCategory.Batch;
        }

        if (technologies.Contains("WCF Service (SOAP)") || technologies.Contains("ASP.NET Web API") ||
            nameLower.Contains("service") || nameLower.Contains("api") || nameLower.Contains("notify"))
        {
            return ComponentCategory.Service;
        }

        if (technologies.Contains("Entity Framework") || technologies.Contains("Dapper") ||
            nameLower.Contains("data") || nameLower.Contains("repository"))
        {
            return ComponentCategory.Database;
        }

        if (technologies.Contains("ASP.NET MVC") || nameLower.Contains("web"))
        {
            return ComponentCategory.Web;
        }

        if (nameLower.Contains("common") || nameLower.Contains("core") || nameLower.Contains("domain") || nameLower.Contains("model"))
        {
            return ComponentCategory.Domain;
        }

        return ComponentCategory.Library;
    }

    private static void ExtractArchitecturalRoles(
        SolutionProjectDescriptor project,
        AssemblyDescriptor assembly,
        List<DiscoveredServiceDescriptor> services,
        List<DiscoveredDatabaseDescriptor> databases,
        List<DiscoveredBatchWorkerDescriptor> batchWorkers,
        List<DiscoveredDomainComponentDescriptor> domainComponents)
    {
        // 1. Rilevamento Servizi WCF, REST e SOAP
        foreach (var type in assembly.Types)
        {
            bool isWcfContract = type.Attributes.Any(a => a.Contains("ServiceContract", StringComparison.OrdinalIgnoreCase)) ||
                                 type.ImplementedInterfaces.Any(i => i.Contains("ServiceContract", StringComparison.OrdinalIgnoreCase));
            bool isController = type.BaseTypeFullName?.Contains("Controller", StringComparison.OrdinalIgnoreCase) == true ||
                                type.Name.EndsWith("Controller", StringComparison.OrdinalIgnoreCase);

            if (isWcfContract || isController)
            {
                var endpoints = new List<ServiceEndpointDescriptor>();
                foreach (var method in type.GetMethods().Where(m => m.Accessibility == AccessibilityModifier.Public))
                {
                    bool isOperation = isWcfContract
                        ? method.Attributes.Any(a => a.Contains("OperationContract", StringComparison.OrdinalIgnoreCase)) || isWcfContract
                        : true;

                    if (isOperation)
                    {
                        var httpMethod = isController ? DeduceHttpMethod(method.Name, method.Attributes) : "SOAP Action";
                        var parameters = method.Parameters.Select(p => $"{p.Type} {p.Name}").ToList();

                        endpoints.Add(new ServiceEndpointDescriptor(
                            Name: method.Name,
                            HttpMethodOrContract: httpMethod,
                            RouteOrAction: method.Name,
                            ReturnType: method.ReturnTypeOrType,
                            Parameters: parameters));
                    }
                }

                string tech = isWcfContract
                    ? "WCF Service (SOAP)"
                    : (type.BaseTypeFullName?.Contains("ApiController") == true ? "ASP.NET Web API (REST)" : "ASP.NET MVC Controller");

                services.Add(new DiscoveredServiceDescriptor(
                    ServiceName: type.Name,
                    ProjectName: project.Name,
                    Technology: tech,
                    ContractInterface: isWcfContract && type.Kind == TypeKind.Interface ? type.FullName : null,
                    ImplementationType: type.Kind != TypeKind.Interface ? type.FullName : null,
                    AssemblyPath: project.OutputAssemblyPath,
                    Endpoints: endpoints));
            }

            // 2. Rilevamento Database: DbContext, ObjectContext, Repositories, Stored Procedures
            bool isDbContext = type.BaseTypeFullName?.Contains("DbContext", StringComparison.OrdinalIgnoreCase) == true ||
                               type.BaseTypeFullName?.Contains("ObjectContext", StringComparison.OrdinalIgnoreCase) == true ||
                               type.Name.EndsWith("Context", StringComparison.OrdinalIgnoreCase);

            bool isRepository = type.Name.EndsWith("Repository", StringComparison.OrdinalIgnoreCase) ||
                                type.Name.EndsWith("DataProvider", StringComparison.OrdinalIgnoreCase) ||
                                type.Name.EndsWith("Data", StringComparison.OrdinalIgnoreCase);

            if (isDbContext || (isRepository && project.Category == ComponentCategory.Database))
            {
                var entities = type.GetProperties()
                    .Where(p => p.ReturnTypeOrType.Contains("DbSet") || p.ReturnTypeOrType.Contains("IQueryable") || p.ReturnTypeOrType.Contains("ObjectSet"))
                    .Select(p => p.Name)
                    .ToList();

                var storedProcsOrQueries = new List<string>();
                foreach (var method in type.GetMethods())
                {
                    if (method.Name.StartsWith("sp_", StringComparison.OrdinalIgnoreCase) ||
                        method.Name.StartsWith("usp_", StringComparison.OrdinalIgnoreCase) ||
                        method.Name.Contains("StoredProc", StringComparison.OrdinalIgnoreCase) ||
                        method.Name.Contains("Execute", StringComparison.OrdinalIgnoreCase))
                    {
                        storedProcsOrQueries.Add(method.Name);
                    }
                }

                string dbTech = isDbContext ? "Entity Framework ObjectContext/DbContext" : "ADO.NET / Data Repository";
                databases.Add(new DiscoveredDatabaseDescriptor(
                    Name: type.Name,
                    ProjectName: project.Name,
                    Technology: dbTech,
                    BaseTypeOrPattern: type.BaseTypeFullName ?? (isRepository ? "Repository Pattern" : "Data Access"),
                    AssemblyPath: project.OutputAssemblyPath,
                    EntitiesOrTables: entities,
                    DetectedStoredProceduresOrQueries: storedProcsOrQueries));
            }

            // 3. Rilevamento Batch / Worker Jobs
            bool isBatchClass = type.Name.Contains("Batch", StringComparison.OrdinalIgnoreCase) ||
                                type.Name.Contains("Task", StringComparison.OrdinalIgnoreCase) ||
                                type.Name.EndsWith("Job", StringComparison.OrdinalIgnoreCase) ||
                                (type.Name == "Program" && project.Category == ComponentCategory.Batch);

            if (isBatchClass && (project.Category == ComponentCategory.Batch || project.Name.Contains("Batch", StringComparison.OrdinalIgnoreCase)))
            {
                var triggers = new List<string>();
                if (type.GetMethods().Any(m => m.Name == "Main")) triggers.Add("Console EntryPoint (Main)");
                if (type.GetMethods().Any(m => m.Name.Contains("Execute", StringComparison.OrdinalIgnoreCase))) triggers.Add("Job Execute Pipeline");

                batchWorkers.Add(new DiscoveredBatchWorkerDescriptor(
                    WorkerName: type.Name,
                    ProjectName: project.Name,
                    Technology: "Console Batch Job / Worker",
                    EntryPointOrJobClass: type.FullName,
                    AssemblyPath: project.OutputAssemblyPath,
                    TriggersOrSchedules: triggers));
            }
        }

        // 4. Se è un modulo di dominio o comune
        if (project.Category == ComponentCategory.Domain || project.Category == ComponentCategory.Library)
        {
            var sampleTypes = assembly.Types
                .Where(t => !t.Name.StartsWith("<") && !t.Name.Contains("Attribute"))
                .Take(8)
                .Select(t => t.Name)
                .ToList();

            domainComponents.Add(new DiscoveredDomainComponentDescriptor(
                Name: project.Name,
                ProjectName: project.Name,
                Category: project.Category.ToString(),
                AssemblyPath: project.OutputAssemblyPath,
                TotalTypes: assembly.Types.Count,
                SampleTypes: sampleTypes));
        }
    }

    private static void FallbackArchitecturalRoles(
        SolutionProjectDescriptor project,
        List<DiscoveredServiceDescriptor> services,
        List<DiscoveredDatabaseDescriptor> databases,
        List<DiscoveredBatchWorkerDescriptor> batchWorkers,
        List<DiscoveredDomainComponentDescriptor> domainComponents)
    {
        switch (project.Category)
        {
            case ComponentCategory.Service:
                services.Add(new DiscoveredServiceDescriptor(
                    ServiceName: project.Name,
                    ProjectName: project.Name,
                    Technology: project.DetectedTechnologies.FirstOrDefault() ?? "WCF / Web API Service",
                    ContractInterface: null,
                    ImplementationType: null,
                    AssemblyPath: project.OutputAssemblyPath,
                    Endpoints: Array.Empty<ServiceEndpointDescriptor>()));
                break;

            case ComponentCategory.Database:
                databases.Add(new DiscoveredDatabaseDescriptor(
                    Name: project.Name,
                    ProjectName: project.Name,
                    Technology: project.DetectedTechnologies.FirstOrDefault() ?? "Data Access Layer",
                    BaseTypeOrPattern: "Repository / ORM",
                    AssemblyPath: project.OutputAssemblyPath,
                    EntitiesOrTables: Array.Empty<string>(),
                    DetectedStoredProceduresOrQueries: Array.Empty<string>()));
                break;

            case ComponentCategory.Batch:
                batchWorkers.Add(new DiscoveredBatchWorkerDescriptor(
                    WorkerName: project.Name,
                    ProjectName: project.Name,
                    Technology: "Batch / Worker Service",
                    EntryPointOrJobClass: null,
                    AssemblyPath: project.OutputAssemblyPath,
                    TriggersOrSchedules: new[] { "Command Line / Scheduled Task" }));
                break;

            case ComponentCategory.Domain:
            case ComponentCategory.Library:
                domainComponents.Add(new DiscoveredDomainComponentDescriptor(
                    Name: project.Name,
                    ProjectName: project.Name,
                    Category: project.Category.ToString(),
                    AssemblyPath: project.OutputAssemblyPath,
                    TotalTypes: 0,
                    SampleTypes: Array.Empty<string>()));
                break;
        }
    }

    private static string DeduceHttpMethod(string methodName, IReadOnlyList<string> attributes)
    {
        if (attributes.Any(a => a.Contains("HttpPost", StringComparison.OrdinalIgnoreCase))) return "POST";
        if (attributes.Any(a => a.Contains("HttpGet", StringComparison.OrdinalIgnoreCase))) return "GET";
        if (attributes.Any(a => a.Contains("HttpPut", StringComparison.OrdinalIgnoreCase))) return "PUT";
        if (attributes.Any(a => a.Contains("HttpDelete", StringComparison.OrdinalIgnoreCase))) return "DELETE";

        var lower = methodName.ToLowerInvariant();
        if (lower.StartsWith("get") || lower.StartsWith("find") || lower.StartsWith("list")) return "GET";
        if (lower.StartsWith("post") || lower.StartsWith("create") || lower.StartsWith("add") || lower.StartsWith("insert")) return "POST";
        if (lower.StartsWith("update") || lower.StartsWith("put")) return "PUT";
        if (lower.StartsWith("delete") || lower.StartsWith("remove")) return "DELETE";

        return "POST/GET";
    }
}
