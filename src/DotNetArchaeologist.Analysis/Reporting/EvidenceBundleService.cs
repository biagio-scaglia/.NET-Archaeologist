using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotNetArchaeologist.Core.Contracts;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Analysis.Reporting;

/// <summary>
/// Implementazione del servizio per la generazione e validazione di Evidence Bundle,
/// finalizzato all'interoperabilità con la suite REA secondo i principi di Zero-Execution.
/// </summary>
public sealed class EvidenceBundleService : IEvidenceBundleService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public EvidenceBundle CreateFromAssembly(
        AssemblyDescriptor assembly,
        ArchitectureGraph? graph = null,
        ExecutiveReport? report = null,
        byte[]? binaryBytes = null)
    {
        ArgumentNullException.ThrowIfNull(assembly);

        var sha256 = binaryBytes != null && binaryBytes.Length > 0
            ? ComputeSha256(binaryBytes)
            : ComputeSha256(Encoding.UTF8.GetBytes($"{assembly.Name}:{assembly.Mvid}:{assembly.TargetFramework}"));

        var records = new List<EvidenceRecord>();

        // 1. Evidenza Target Assembly
        records.Add(CreateRecord(
            sha256,
            category: "AssemblyHeader",
            title: $"Ispezione intestazione ECMA-335 per '{assembly.Name}'",
            description: $"Assembly analizzato con target runtime {assembly.TargetFramework}, MVID {assembly.Mvid}.",
            subject: assembly.Name,
            attributes: new Dictionary<string, object?>
            {
                ["Name"] = assembly.Name,
                ["TargetFramework"] = assembly.TargetFramework,
                ["Mvid"] = assembly.Mvid.ToString(),
                ["TypeCount"] = assembly.Types.Count,
                ["IsZeroExecutionVerified"] = true
            }
        ));

        // 2. Evidenze sui tipi e contratti
        foreach (var type in assembly.Types)
        {
            records.Add(CreateRecord(
                sha256,
                category: "TypeDefinition",
                title: $"Definizione tipo '{type.FullName}' [{type.Kind}]",
                description: $"Tipo con visibilità {type.Accessibility}, {type.Members.Count} membri dichiarati e {type.ImplementedInterfaces.Count} interfacce implementate.",
                subject: type.FullName,
                attributes: new Dictionary<string, object?>
                {
                    ["FullName"] = type.FullName,
                    ["Kind"] = type.Kind.ToString(),
                    ["Accessibility"] = type.Accessibility.ToString(),
                    ["BaseType"] = type.BaseTypeFullName,
                    ["Interfaces"] = type.ImplementedInterfaces,
                    ["MemberCount"] = type.Members.Count
                }
            ));
        }

        // 3. Evidenze sulle relazioni se presente il Grafo
        if (graph != null)
        {
            records.Add(CreateRecord(
                sha256,
                category: "ArchitectureGraph",
                title: $"Topologia grafo architetturale ({graph.Nodes.Count} nodi, {graph.Edges.Count} archi)",
                description: "Mappatura delle dipendenze di tipo, ereditarietà e contratti derivati da ECMA-335 signatures.",
                subject: "ArchitectureGraph",
                attributes: new Dictionary<string, object?>
                {
                    ["NodeCount"] = graph.Nodes.Count,
                    ["EdgeCount"] = graph.Edges.Count
                }
            ));
        }

        // 4. Evidenze sul debito architetturale se presente il Report
        if (report != null)
        {
            records.Add(CreateRecord(
                sha256,
                category: "ArchitecturalDebt",
                title: $"Valutazione debito architetturale (Score: {report.TechDebtScore}/100, Rating: {report.TechDebtRating})",
                description: $"Report esecutivo sintetizzato: {report.KeyFindings.Count} scoperte chiave e {report.IdentifiedRisks.Count} rischi individuati.",
                subject: "ExecutiveReport",
                attributes: new Dictionary<string, object?>
                {
                    ["TechDebtScore"] = report.TechDebtScore,
                    ["TechDebtRating"] = report.TechDebtRating,
                    ["ArchitecturalStyle"] = report.ArchitecturalStyle,
                    ["KeyFindings"] = report.KeyFindings,
                    ["ModernizationStepsCount"] = report.ModernizationRoadmap.Count
                }
            ));
        }

        var summary = $"Evidence Bundle per l'assembly '{assembly.Name}' con {records.Count} evidenze oggettive documentate a Zero-Execution.";

        return new EvidenceBundle
        {
            Format = EvidenceBundle.DefaultFormat,
            Version = EvidenceBundle.CurrentVersion,
            TargetName = assembly.Name,
            TargetSha256 = sha256,
            TargetKind = "Assembly",
            CreatedAtUtc = DateTime.UtcNow,
            Summary = summary,
            Records = records,
            Metadata = new Dictionary<string, string>
            {
                ["TargetFramework"] = assembly.TargetFramework ?? "Unknown",
                ["TypeCount"] = assembly.Types.Count.ToString(),
                ["VerificationPolicy"] = "Zero-Execution Strict Passivity"
            }
        };
    }

    public EvidenceBundle CreateFromSolution(
        SolutionDescriptor solution,
        ExecutiveReport? report = null)
    {
        ArgumentNullException.ThrowIfNull(solution);

        var sha256 = ComputeSha256(Encoding.UTF8.GetBytes($"{solution.Name}:{solution.SolutionPath}:{solution.Projects.Count}"));
        var records = new List<EvidenceRecord>();

        // 1. Evidenza Soluzione .NET
        records.Add(CreateRecord(
            sha256,
            category: "SolutionHeader",
            title: $"Ispezione statica soluzione '{solution.Name}'",
            description: $"Soluzione con {solution.Projects.Count} progetti rilevati in '{solution.SolutionPath}'.",
            subject: solution.Name,
            attributes: new Dictionary<string, object?>
            {
                ["SolutionName"] = solution.Name,
                ["SolutionPath"] = solution.SolutionPath,
                ["ProjectCount"] = solution.Projects.Count,
                ["ServicesCount"] = solution.Services.Count,
                ["DatabasesCount"] = solution.Databases.Count,
                ["BatchWorkersCount"] = solution.BatchWorkers.Count
            }
        ));

        // 2. Progetti identificati
        foreach (var project in solution.Projects)
        {
            records.Add(CreateRecord(
                sha256,
                category: "SolutionProject",
                title: $"Progetto '{project.Name}' [{project.Category}]",
                description: $"Output: {project.OutputAssemblyPath ?? "N/D"}. {project.ProjectReferences.Count} riferimenti a progetti, {project.PackageReferences.Count} NuGet package.",
                subject: project.Name,
                attributes: new Dictionary<string, object?>
                {
                    ["ProjectName"] = project.Name,
                    ["Category"] = project.Category.ToString(),
                    ["OutputAssemblyPath"] = project.OutputAssemblyPath,
                    ["AssemblyExists"] = project.AssemblyExists,
                    ["PackageReferences"] = project.PackageReferences
                }
            ));
        }

        // 3. Servizi / Microservizi
        foreach (var svc in solution.Services)
        {
            records.Add(CreateRecord(
                sha256,
                category: "ServiceContract",
                title: $"Servizio rilevato: '{svc.ServiceName}' ({svc.Technology})",
                description: $"Interfaccia/Contratto: {svc.ContractInterface ?? "N/D"} con {svc.Endpoints.Count} endpoint.",
                subject: svc.ServiceName,
                attributes: new Dictionary<string, object?>
                {
                    ["ServiceName"] = svc.ServiceName,
                    ["Technology"] = svc.Technology,
                    ["ContractInterface"] = svc.ContractInterface,
                    ["EndpointsCount"] = svc.Endpoints.Count
                }
            ));
        }

        // 4. Database & ORM
        foreach (var db in solution.Databases)
        {
            records.Add(CreateRecord(
                sha256,
                category: "PersistenceContext",
                title: $"Contesto dati: '{db.Name}' ({db.Technology})",
                description: $"{db.EntitiesOrTables.Count} entità/tabelle mappate e {db.DetectedStoredProceduresOrQueries.Count} stored procedure o query individuate.",
                subject: db.Name,
                attributes: new Dictionary<string, object?>
                {
                    ["Name"] = db.Name,
                    ["Technology"] = db.Technology,
                    ["EntitiesOrTables"] = db.EntitiesOrTables,
                    ["StoredProcedures"] = db.DetectedStoredProceduresOrQueries
                }
            ));
        }

        // 5. Batch Workers
        foreach (var batch in solution.BatchWorkers)
        {
            records.Add(CreateRecord(
                sha256,
                category: "BatchWorker",
                title: $"Processo batch: '{batch.WorkerName}' ({batch.Technology})",
                description: $"Entry point: {batch.EntryPointOrJobClass ?? "N/D"}. Trigger: {batch.TriggersOrSchedules.Count}.",
                subject: batch.WorkerName,
                attributes: new Dictionary<string, object?>
                {
                    ["WorkerName"] = batch.WorkerName,
                    ["Technology"] = batch.Technology,
                    ["EntryPoint"] = batch.EntryPointOrJobClass,
                    ["Triggers"] = batch.TriggersOrSchedules
                }
            ));
        }

        // 6. Debito e Report se presente
        if (report != null)
        {
            records.Add(CreateRecord(
                sha256,
                category: "ArchitecturalDebt",
                title: $"Valutazione debito architetturale soluzione (Score: {report.TechDebtScore}/100, Rating: {report.TechDebtRating})",
                description: $"Report esecutivo sintetizzato con {report.KeyFindings.Count} scoperte e {report.IdentifiedRisks.Count} rischi.",
                subject: "ExecutiveReport",
                attributes: new Dictionary<string, object?>
                {
                    ["TechDebtScore"] = report.TechDebtScore,
                    ["TechDebtRating"] = report.TechDebtRating,
                    ["KeyFindings"] = report.KeyFindings,
                    ["ModernizationStepsCount"] = report.ModernizationRoadmap.Count
                }
            ));
        }

        var summary = $"Evidence Bundle per la soluzione '{solution.Name}' con {records.Count} evidenze architetturali documentate a Zero-Execution.";

        return new EvidenceBundle
        {
            Format = EvidenceBundle.DefaultFormat,
            Version = EvidenceBundle.CurrentVersion,
            TargetName = solution.Name,
            TargetSha256 = sha256,
            TargetKind = "Solution",
            CreatedAtUtc = DateTime.UtcNow,
            Summary = summary,
            Records = records,
            Metadata = new Dictionary<string, string>
            {
                ["SolutionPath"] = solution.SolutionPath,
                ["ProjectCount"] = solution.Projects.Count.ToString(),
                ["VerificationPolicy"] = "Zero-Execution Static Analysis"
            }
        };
    }

    public EvidenceBundleValidationResult ValidateAndRead(string jsonContent)
    {
        if (string.IsNullOrWhiteSpace(jsonContent))
        {
            return new EvidenceBundleValidationResult
            {
                IsValid = false,
                ErrorMessage = "Il contenuto JSON fornito è vuoto o null."
            };
        }

        try
        {
            var bundle = JsonSerializer.Deserialize<EvidenceBundle>(jsonContent, JsonOptions);
            if (bundle == null)
            {
                return new EvidenceBundleValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Impossibile deserializzare l'Evidence Bundle: radice JSON non valida."
                };
            }

            if (string.IsNullOrWhiteSpace(bundle.TargetName) && string.IsNullOrWhiteSpace(bundle.TargetSha256))
            {
                return new EvidenceBundleValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Il bundle non specifica né TargetName né TargetSha256.",
                    Bundle = bundle
                };
            }

            return new EvidenceBundleValidationResult
            {
                IsValid = true,
                Bundle = bundle
            };
        }
        catch (JsonException ex)
        {
            return new EvidenceBundleValidationResult
            {
                IsValid = false,
                ErrorMessage = $"Errore di parsing JSON nel fascicolo evidenze: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            return new EvidenceBundleValidationResult
            {
                IsValid = false,
                ErrorMessage = $"Eccezione imprevista durante la lettura del bundle: {ex.Message}"
            };
        }
    }

    private static EvidenceRecord CreateRecord(
        string targetSha256,
        string category,
        string title,
        string description,
        string subject,
        IReadOnlyDictionary<string, object?> attributes,
        double confidence = 1.0)
    {
        // Generazione Evidence ID canonico standard REA: 'ev_' + 64 caratteri hex
        var seed = $"{targetSha256}:{category}:{subject}:{title}:{Guid.NewGuid():N}";
        var evidenceId = "ev_" + ComputeSha256(Encoding.UTF8.GetBytes(seed));

        return new EvidenceRecord
        {
            EvidenceId = evidenceId,
            Category = category,
            Title = title,
            Description = description,
            Subject = subject,
            Confidence = Math.Clamp(confidence, 0.0, 1.0),
            TimestampUtc = DateTime.UtcNow,
            Attributes = attributes
        };
    }

    private static string ComputeSha256(byte[] data)
    {
        var hash = SHA256.HashData(data);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
