using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Analysis.Engines;
using DotNetArchaeologist.Analysis.Reporting;
using DotNetArchaeologist.Api.Services;
using DotNetArchaeologist.Core.Contracts;
using DotNetArchaeologist.Core.Domain;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Configurazione policy CORS ristretta a localhost per il frontend locale
const string localCorsPolicy = "LocalFrontendPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(localCorsPolicy, policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Configurazione sessioni di ispezione e limiti di memoria
builder.Services.Configure<AssemblySessionOptions>(
    builder.Configuration.GetSection(AssemblySessionOptions.SectionName));
builder.Services.AddSingleton(TimeProvider.System);

// Registrazione servizi di analisi e dominio
builder.Services.AddSingleton<IAssemblyInspector, MetadataAssemblyInspector>();
builder.Services.AddSingleton<IDecompilerService, CSharpDecompilerService>();
builder.Services.AddSingleton<IArchitectureGraphBuilder, ArchitectureGraphBuilder>();
builder.Services.AddSingleton<ISolutionInspector, SolutionInspector>();
builder.Services.AddSingleton<IExecutiveReportGenerator, ExecutiveReportGenerator>();
builder.Services.AddSingleton<IAssemblySessionStore, InMemoryAssemblySessionStore>();

// Registrazione del servizio AI dell'Archeologo (Ollama / Cloud)
builder.Services.Configure<ArchaeologistAiOptions>(
    builder.Configuration.GetSection(ArchaeologistAiOptions.SectionName));
builder.Services.AddHttpClient<IArchaeologistAiService, ArchaeologistAiService>();

// Configurazione serializzazione JSON HTTP (converte gli enum in stringhe descrittive)
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

var app = builder.Build();

app.UseMiddleware<LocalOriginValidationMiddleware>();
app.UseCors(localCorsPolicy);

// ==============================================================================
// Endpoint API
// ==============================================================================

// Health check
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "DotNetArchaeologist.Api",
    version = "1.0.0"
}));

// Ispezione Assembly via file upload multipart
app.MapPost("/api/assemblies/inspect", async (
    HttpRequest request,
    IAssemblyInspector inspector,
    IAssemblySessionStore sessionStore,
    CancellationToken ct) =>
{
    if (!request.HasFormContentType || request.Form.Files.Count == 0)
    {
        return Results.BadRequest(new { error = "È necessario caricare un file binario .NET valido tramite form multipart." });
    }

    var file = request.Form.Files[0];
    var validation = LocalPathSecurityValidator.ValidateUploadedFile(file);
    if (!validation.IsValid)
    {
        return Results.Json(new { error = validation.ErrorMessage }, statusCode: validation.StatusCode);
    }

    await using var ms = new MemoryStream();
    await file.CopyToAsync(ms, ct);
    var rawBytes = ms.ToArray();

    try
    {
        using var readStream = new MemoryStream(rawBytes, writable: false);
        var descriptor = await inspector.InspectAsync(readStream, file.FileName, ct);
        var sessionId = sessionStore.Register(descriptor, rawBytes);

        return Results.Ok(new
        {
            sessionId,
            assembly = descriptor
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante l'ispezione dell'assembly: {ex.Message}" });
    }
}).DisableAntiforgery();

// Ispezione Assembly via percorso file locale (se eseguito in locale)
app.MapPost("/api/assemblies/inspect-path", async (
    InspectPathRequest request,
    IAssemblyInspector inspector,
    IAssemblySessionStore sessionStore,
    CancellationToken ct) =>
{
    var validation = LocalPathSecurityValidator.ValidateAssemblyPath(request.FilePath);
    if (!validation.IsValid)
    {
        return Results.Json(new { error = validation.ErrorMessage }, statusCode: validation.StatusCode);
    }

    var validatedPath = validation.NormalizedPath!;

    try
    {
        var rawBytes = await File.ReadAllBytesAsync(validatedPath, ct);
        using var readStream = new MemoryStream(rawBytes, writable: false);
        var descriptor = await inspector.InspectAsync(readStream, Path.GetFileName(validatedPath), ct);
        var sessionId = sessionStore.Register(descriptor, rawBytes);

        return Results.Ok(new
        {
            sessionId,
            assembly = descriptor
        });
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Json(new { error = $"Accesso negato durante la lettura del file: '{validatedPath}'." }, statusCode: StatusCodes.Status403Forbidden);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante l'ispezione dell'assembly: {ex.Message}" });
    }
});

// Scansione e ispezione ricorsiva di una cartella di progetto locale
app.MapPost("/api/assemblies/inspect-folder", async (
    InspectFolderPathRequest request,
    CancellationToken ct) =>
{
    var validation = LocalPathSecurityValidator.ValidateFolderPath(request.FolderPath);
    if (!validation.IsValid)
    {
        return Results.Json(new { error = validation.ErrorMessage }, statusCode: validation.StatusCode);
    }

    var validatedFolder = validation.NormalizedPath!;

    try
    {
        var dirInfo = new DirectoryInfo(validatedFolder);
        var enumerationOptions = new EnumerationOptions
        {
            RecurseSubdirectories = true,
            IgnoreInaccessible = true,
            MaxRecursionDepth = 8
        };

        var dllFiles = dirInfo.EnumerateFiles("*.dll", enumerationOptions);
        var exeFiles = dirInfo.EnumerateFiles("*.exe", enumerationOptions);

        var candidateFiles = dllFiles.Concat(exeFiles)
            .Where(f => !f.FullName.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase))
            .Take(LocalPathSecurityValidator.DefaultMaxDiscoveredAssemblies)
            .ToList();

        var foundAssemblies = new List<DiscoveredAssemblyItem>();

        foreach (var file in candidateFiles)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                await using var stream = new FileStream(file.FullName, FileMode.Open, FileAccess.Read, FileShare.Read);
                using var peReader = new PEReader(stream);
                if (peReader.HasMetadata)
                {
                    var mdReader = peReader.GetMetadataReader();
                    if (mdReader.IsAssembly)
                    {
                        var assemblyDef = mdReader.GetAssemblyDefinition();
                        var name = mdReader.GetString(assemblyDef.Name);
                        var version = assemblyDef.Version.ToString();
                        var typesCount = Math.Max(0, mdReader.TypeDefinitions.Count - 1);

                        foundAssemblies.Add(new DiscoveredAssemblyItem(
                            Name: name,
                            FilePath: file.FullName,
                            RelativePath: Path.GetRelativePath(validatedFolder, file.FullName),
                            Version: version,
                            TypesCount: typesCount,
                            SizeBytes: file.Length));
                    }
                }
            }
            catch
            {
                // Ignora file nativi non .NET, protetti o inaccessibili
            }
        }

        return Results.Ok(new
        {
            folderPath = validatedFolder,
            totalFound = foundAssemblies.Count,
            assemblies = foundAssemblies.OrderBy(a => a.Name, StringComparer.Ordinal)
        });
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Json(new { error = $"Accesso negato per la cartella specificata: '{validatedFolder}'." }, statusCode: StatusCodes.Status403Forbidden);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante la scansione della cartella: {ex.Message}" });
    }
});

// Dettaglio metadati dell'Assembly
app.MapGet("/api/assemblies/{sessionId}", (
    string sessionId,
    IAssemblySessionStore sessionStore) =>
{
    var descriptor = sessionStore.GetDescriptor(sessionId);
    return descriptor == null
        ? Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." })
        : Results.Ok(descriptor);
});

// Albero gerarchico di navigazione (Namespaces -> Tipi -> Membri)
app.MapGet("/api/assemblies/{sessionId}/tree", (
    string sessionId,
    IAssemblySessionStore sessionStore) =>
{
    var descriptor = sessionStore.GetDescriptor(sessionId);
    if (descriptor == null)
    {
        return Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." });
    }

    var tree = descriptor.Types
        .GroupBy(t => string.IsNullOrEmpty(t.Namespace) ? "<Global>" : t.Namespace)
        .OrderBy(g => g.Key, StringComparer.Ordinal)
        .Select(g => new
        {
            Namespace = g.Key,
            Types = g.OrderBy(t => t.Name, StringComparer.Ordinal).Select(t => new
            {
                t.FullName,
                t.Name,
                Kind = t.Kind.ToString(),
                Accessibility = t.Accessibility.ToString(),
                t.IsAbstract,
                t.IsSealed,
                t.IsStatic,
                MembersCount = t.Members.Count
            })
        });

    return Results.Ok(new
    {
        assemblyName = descriptor.Name,
        totalTypes = descriptor.TotalTypesCount,
        namespaces = tree
    });
});

// Grafo architetturale
app.MapGet("/api/assemblies/{sessionId}/graph", (
    string sessionId,
    bool? includeReferences,
    bool? includeExternal,
    IAssemblySessionStore sessionStore,
    IArchitectureGraphBuilder graphBuilder) =>
{
    var descriptor = sessionStore.GetDescriptor(sessionId);
    if (descriptor == null)
    {
        return Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." });
    }

    var options = new ArchitectureGraphOptions(
        IncludeMemberReferences: includeReferences ?? true,
        IncludeExternalTypes: includeExternal ?? true);

    var graph = graphBuilder.BuildGraph(descriptor, options);
    return Results.Ok(graph);
});

// Decompilazione C#
app.MapGet("/api/assemblies/{sessionId}/decompile", async (
    string sessionId,
    string? type,
    string? method,
    IAssemblySessionStore sessionStore,
    IDecompilerService decompiler,
    CancellationToken ct) =>
{
    var cacheKey = $"type:{type ?? "<global>"}#method:{method ?? "<all>"}";
    var cachedCode = sessionStore.GetCachedDecompilation(sessionId, cacheKey);
    if (cachedCode != null)
    {
        return Results.Ok(new
        {
            sessionId,
            type,
            method,
            code = cachedCode
        });
    }

    using var peStream = sessionStore.GetStream(sessionId);
    if (peStream == null)
    {
        return Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." });
    }

    try
    {
        string csharpCode;
        if (!string.IsNullOrWhiteSpace(type) && !string.IsNullOrWhiteSpace(method))
        {
            csharpCode = await decompiler.DecompileMethodAsync(peStream, type, method, ct);
        }
        else if (!string.IsNullOrWhiteSpace(type))
        {
            csharpCode = await decompiler.DecompileTypeAsync(peStream, type, ct);
        }
        else
        {
            csharpCode = await decompiler.DecompileWholeAssemblyAsync(peStream, ct);
        }

        sessionStore.CacheDecompilation(sessionId, cacheKey, csharpCode);

        return Results.Ok(new
        {
            sessionId,
            type,
            method,
            code = csharpCode
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante la decompilazione: {ex.Message}" });
    }
});

// Ispezione Solution (.sln) o cartella con mappatura architetturale
app.MapPost("/api/solution/inspect", async (
    InspectSolutionRequest request,
    ISolutionInspector solutionInspector,
    CancellationToken ct) =>
{
    var validation = LocalPathSecurityValidator.ValidateSolutionOrFolderPath(request.SolutionOrFolderPath);
    if (!validation.IsValid)
    {
        return Results.Json(new { error = validation.ErrorMessage }, statusCode: validation.StatusCode);
    }

    var validatedPath = validation.NormalizedPath!;

    try
    {
        var solution = await solutionInspector.InspectSolutionAsync(validatedPath, ct);
        return Results.Ok(solution);
    }
    catch (FileNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Json(new { error = $"Accesso negato durante la lettura della solution o dei progetti: '{validatedPath}'." }, statusCode: StatusCodes.Status403Forbidden);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante l'ispezione della solution: {ex.Message}" });
    }
});

// Generazione Report Esecutivo per Solution
app.MapPost("/api/solution/report", async (
    InspectSolutionRequest request,
    ISolutionInspector solutionInspector,
    IExecutiveReportGenerator reportGenerator,
    CancellationToken ct) =>
{
    var validation = LocalPathSecurityValidator.ValidateSolutionOrFolderPath(request.SolutionOrFolderPath);
    if (!validation.IsValid)
    {
        return Results.Json(new { error = validation.ErrorMessage }, statusCode: validation.StatusCode);
    }

    var validatedPath = validation.NormalizedPath!;

    try
    {
        var solution = await solutionInspector.InspectSolutionAsync(validatedPath, ct);
        var report = reportGenerator.GenerateReport(solution);
        return Results.Ok(report);
    }
    catch (FileNotFoundException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Json(new { error = $"Accesso negato durante la lettura della solution o dei progetti: '{validatedPath}'." }, statusCode: StatusCodes.Status403Forbidden);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante la generazione del report della solution: {ex.Message}" });
    }
});

// Generazione Report Esecutivo per singolo Assembly in sessione
app.MapGet("/api/assemblies/{sessionId}/report", (
    string sessionId,
    IAssemblySessionStore sessionStore,
    IExecutiveReportGenerator reportGenerator) =>
{
    var descriptor = sessionStore.GetDescriptor(sessionId);
    if (descriptor == null)
    {
        return Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." });
    }

    var report = reportGenerator.GenerateReport(descriptor);
    return Results.Ok(report);
});

// ==============================================================================
// Consulente AI: L'Archeologo Live (Ollama Cloud / Locale)
// ==============================================================================

// Stato della connessione AI dell'Archeologo
app.MapGet("/api/archaeologist/status", (IArchaeologistAiService aiService) =>
{
    return Results.Ok(aiService.GetStatus());
});

// Interpella L'Archeologo AI con contesto architetturale
app.MapPost("/api/archaeologist/ask", async (
    ArchaeologistChatRequest request,
    IArchaeologistAiService aiService,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Prompt))
    {
        return Results.BadRequest(new { error = "Il prompt della domanda non può essere vuoto." });
    }

    var response = await aiService.AskAsync(request, ct);
    return Results.Ok(response);
});

app.Run();

// Requisito per WebApplicationFactory nei test xUnit
public partial class Program { }

public sealed record InspectSolutionRequest(string SolutionOrFolderPath);

public sealed record InspectPathRequest(string FilePath);

public sealed record InspectFolderPathRequest(string FolderPath);

public sealed record DiscoveredAssemblyItem(
    string Name,
    string FilePath,
    string RelativePath,
    string Version,
    int TypesCount,
    long SizeBytes);
