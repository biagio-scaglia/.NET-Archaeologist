using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using DotNetArchaeologist.Core.Contracts;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Analysis.Reporting;

/// <summary>
/// Motore di generazione per report architetturali esecutivi in linguaggio naturale e Markdown.
/// </summary>
public sealed class ExecutiveReportGenerator : IExecutiveReportGenerator
{
    public ExecutiveReport GenerateReport(SolutionDescriptor solution)
    {
        ArgumentNullException.ThrowIfNull(solution);

        var now = DateTimeOffset.UtcNow;
        var hasWcf = solution.Services.Any(s => s.Technology.Contains("WCF", StringComparison.OrdinalIgnoreCase) || s.Technology.Contains("SOAP", StringComparison.OrdinalIgnoreCase));
        var hasWebApi = solution.Services.Any(s => s.Technology.Contains("Web API", StringComparison.OrdinalIgnoreCase) || s.Technology.Contains("REST", StringComparison.OrdinalIgnoreCase));
        var hasObjectContext = solution.Databases.Any(d => d.BaseTypeOrPattern != null && d.BaseTypeOrPattern.Contains("ObjectContext", StringComparison.OrdinalIgnoreCase));
        var hasStoredProcs = solution.Databases.Any(d => d.DetectedStoredProceduresOrQueries.Count > 0);
        var hasBatch = solution.BatchWorkers.Count > 0;

        // Calcolo punteggio di debito tecnico (Tech Debt Score: 0 = Moderno, 100 = Legacy Critico)
        var debtScore = 10;
        if (hasWcf) debtScore += 25;
        if (hasObjectContext) debtScore += 20;
        else if (solution.Databases.Count > 0) debtScore += 10;
        if (hasStoredProcs) debtScore += 15;
        if (hasBatch) debtScore += 10;
        if (solution.Projects.Any(p => p.DetectedTechnologies.Any(t => t.Contains(".NET Framework", StringComparison.OrdinalIgnoreCase) || t.Contains("4.", StringComparison.OrdinalIgnoreCase))))
        {
            debtScore += 15;
        }
        debtScore = Math.Min(debtScore, 100);

        var debtRating = debtScore switch
        {
            <= 25 => "A - Architettura Moderna",
            <= 45 => "B - Moderato Debito Tecnico",
            <= 70 => "C - Debito Architetturale Significativo",
            <= 85 => "D - Legacy Critico (Consigliata Migrazione)",
            _ => "F - Emergenza Architetturale (Alto Rischio Operativo)"
        };

        var architecturalStyle = (hasWcf, hasWebApi, hasBatch) switch
        {
            (true, false, true) => "Monolite N-Tier Enterprise con Servizi SOAP WCF e Processi Batch",
            (true, true, _) => "Architettura Ibrida SOA con Canali WCF SOAP e Web API REST",
            (false, true, _) => "Architettura a Servizi Web API REST",
            _ => "Monolite Modulare .NET con Livelli Distinti di Presentazione e Dati"
        };

        // Sintesi esecutiva narrativa in linguaggio naturale
        var summarySb = new StringBuilder();
        summarySb.Append($"L'analisi architetturale condotta sulla soluzione '{solution.Name}' evidenzia una struttura di tipo {architecturalStyle}. ");
        summarySb.Append($"Il sistema è articolato in {solution.TotalProjects} progetti con una chiara separazione tra presentazione, servizi di integrazione e persistenza dei dati. ");

        if (hasWcf)
        {
            summarySb.Append($"La comunicazione applicativa è storicamente affidata al framework WCF (SOAP), esponendo contratti fortemente tipizzati che legano strettamente i client al runtime .NET Framework. ");
        }
        if (hasObjectContext)
        {
            summarySb.Append($"La persistenza si basa su Entity Framework con pattern ObjectContext, richiedendo una modernizzazione verso EF Core per abilitare compatibilità cross-platform e ottimizzazione delle query. ");
        }
        if (hasStoredProcs)
        {
            var totalProcs = solution.Databases.Sum(d => d.DetectedStoredProceduresOrQueries.Count);
            summarySb.Append($"Sono state individuate {totalProcs} stored procedure o query cablate, indicando la presenza di regole di business delegate al motore di database relazionale. ");
        }
        if (hasBatch)
        {
            summarySb.Append($"L'elaborazione asincrona e i flussi pianificati sono governati da {solution.TotalBatchWorkers} processi batch o eseguibili console autonomi. ");
        }

        summarySb.Append($"Il livello complessivo di debito tecnico è valutato in {debtScore}/100 ({debtRating}).");
        var executiveSummary = summarySb.ToString();

        // Punti chiave (Key Findings)
        var keyFindings = new List<string>
        {
            $"Rilevati {solution.TotalServices} servizi con {solution.Services.Sum(s => s.Endpoints.Count)} operazioni esposte.",
            $"Rilevati {solution.TotalDatabases} componenti di persistenza con {solution.Databases.Sum(d => d.EntitiesOrTables.Count)} tabelle/entità mappate.",
            $"Rilevati {solution.TotalBatchWorkers} processi batch per l'elaborazione autonoma in background.",
            hasWcf ? "Presenza di contratti SOAP WCF vincolati a protocolli legacy privi di supporto nativo in .NET 8/9." : "Assenza di dipendenze WCF monolitiche.",
            hasStoredProcs ? "Accoppiamento bidirezionale tra codice C# e stored procedure T-SQL su database relazionale." : "Accesso ai dati prevalentemente orientato ad entità o repository astratti."
        };

        // Catalogo Servizi
        var serviceCatalog = solution.Services.Select(s => new ReportServiceEntry(
            ServiceName: s.ServiceName,
            Technology: s.Technology,
            ContractInterface: s.ContractInterface,
            EndpointsCount: s.Endpoints.Count,
            ExposedEndpoints: s.Endpoints.Select(e => e.Name).ToList(),
            MigrationRecommendation: s.Technology.Contains("WCF", StringComparison.OrdinalIgnoreCase)
                ? "Migrare il contratto a REST (ASP.NET Core Minimal APIs) o a gRPC con Protocol Buffers."
                : "Aggiornare il runtime a ASP.NET Core con documentazione OpenAPI/Swagger.")).ToList();

        // Persistenza
        var dataPersistence = solution.Databases.Select(d => new ReportPersistenceEntry(
            ContextName: d.Name,
            Technology: d.Technology,
            Tables: d.EntitiesOrTables,
            StoredProcedures: d.DetectedStoredProceduresOrQueries,
            ArchitecturalImpact: d.DetectedStoredProceduresOrQueries.Count > 0
                ? "Alto: la presenza di stored procedure introduce dipendenza da schemi DB esterni e ostacola il testing unitario isolato."
                : "Medio: mappatura diretta su tabelle relazionali gestibile tramite migrazione a EF Core.")).ToList();

        // Batch workers
        var batchWorkers = solution.BatchWorkers.Select(b => new ReportBatchEntry(
            WorkerName: b.WorkerName,
            EntryPoint: b.EntryPointOrJobClass ?? "Program.Main",
            Triggers: b.TriggersOrSchedules,
            ContainerizationRecommendation: "Incapsulare l'entry point in un BackgroundService/Worker di .NET 8 ospitabile come container Docker o Kubernetes CronJob.")).ToList();

        // Rischi identificati
        var risks = new List<ReportRiskEntry>();
        if (hasWcf)
        {
            risks.Add(new ReportRiskEntry(
                Category: "Obsolescenza & Interoperabilità",
                Title: "Contratti WCF SOAP Legacy",
                Severity: "Alta",
                Description: "WCF lato server non è supportato in .NET Core/.NET 8 nativo, bloccando la migrazione dei server di produzione su piattaforme Linux e container cloud.",
                Mitigation: "Convertire i contratti di servizio in ASP.NET Core Minimal APIs oppure utilizzare CoreWCF come fase di transizione provvisoria."));
        }
        if (hasObjectContext)
        {
            risks.Add(new ReportRiskEntry(
                Category: "Accesso ai Dati",
                Title: "Entity Framework ObjectContext Deprecato",
                Severity: "Alta",
                Description: "L'uso di ObjectContext impedisce il passaggio diretto a EF Core e limita l'uso delle moderne funzionalità di asincronismo e pooling di connessioni.",
                Mitigation: "Effettuare il refactoring del layer dati introducendo DbContext e definendo una strategia di migrazione progressiva delle entità."));
        }
        if (hasStoredProcs)
        {
            risks.Add(new ReportRiskEntry(
                Category: "Accoppiamento & Manutenibilità",
                Title: "Dipendenza da Stored Procedure Esterne",
                Severity: "Media",
                Description: "Le chiamate a stored procedure nascondono logica transazionale e vincoli di integrità referenziale che non risultano verificabili tramite test di regressione su codice C#.",
                Mitigation: "Mappare i parametri e i contratti di ritorno in DTO tipizzati e documentare i contratti SQL in migration script versionati."));
        }
        if (hasBatch)
        {
            risks.Add(new ReportRiskEntry(
                Category: "Operatività & Monitoraggio",
                Title: "Processi Batch Console Standalone",
                Severity: "Media",
                Description: "Gli eseguibili console autonomi mancano di telemetria standardizzata, graceful shutdown e meccanismi nativi di retry esponendo i job a fallimenti silenziosi.",
                Mitigation: "Adottare Microsoft.Extensions.Hosting per la gestione del ciclo di vita e standardizzare il logging strutturato con Serilog/OpenTelemetry."));
        }

        // Piano di modernizzazione strategica
        var roadmap = new List<ModernizationStep>
        {
            new ModernizationStep(
                Phase: 1,
                Title: "Disaccoppiamento e Interfacce API Moderne",
                Objective: "Esporre un canale REST o gRPC moderno parallelo a WCF per consentire l'evoluzione dei client.",
                Details: "Implementare controller ASP.NET Core o Minimal APIs che incapsulano i contratti esistenti, consentendo il graduale spegnimento dei servizi SOAP.",
                Complexity: "Media",
                RiskLevel: "Basso (esecuzione parallela)"),
            new ModernizationStep(
                Phase: 2,
                Title: "Rinnovamento Layer Dati (EF Core & Testability)",
                Objective: "Sostituire ObjectContext con Entity Framework Core 8 e isolare le stored procedure.",
                Details: "Generare il nuovo modello EF Core tramite reverse engineering scaffolding, convertendo le query dirette in LINQ fortemente tipizzato e isolando le stored procedure rimanenti in repository dedicati.",
                Complexity: "Alta",
                RiskLevel: "Medio (richiede test di regressione sui dati)"),
            new ModernizationStep(
                Phase: 3,
                Title: "Containerizzazione e Automazione Batch Worker",
                Objective: "Rendere i batch worker eseguibili in ambienti cloud nativi e container Docker.",
                Details: "Trasformare i progetti console in Worker Service con dependency injection, configurazione centralizzata e metriche di monitoraggio.",
                Complexity: "Bassa",
                RiskLevel: "Basso")
        };

        // Generazione del report in formato Markdown
        var md = GenerateMarkdownReport(solution.Name, "Solution .NET", now, executiveSummary, debtScore, debtRating, architecturalStyle, keyFindings, serviceCatalog, dataPersistence, batchWorkers, risks, roadmap);

        return new ExecutiveReport(
            Title: $"Report Architetturale Esecutivo: {solution.Name}",
            TargetName: solution.Name,
            TargetType: "Solution",
            GeneratedAt: now,
            ExecutiveSummary: executiveSummary,
            TechDebtScore: debtScore,
            TechDebtRating: debtRating,
            ArchitecturalStyle: architecturalStyle,
            KeyFindings: keyFindings,
            ServiceCatalog: serviceCatalog,
            DataPersistence: dataPersistence,
            BatchWorkers: batchWorkers,
            IdentifiedRisks: risks,
            ModernizationRoadmap: roadmap,
            MarkdownContent: md);
    }

    public ExecutiveReport GenerateReport(AssemblyDescriptor assembly)
    {
        ArgumentNullException.ThrowIfNull(assembly);

        var now = DateTimeOffset.UtcNow;
        var totalTypes = assembly.Types.Count;
        var totalMethods = assembly.Types.Sum(t => t.GetMethods().Count());
        var totalProps = assembly.Types.Sum(t => t.GetProperties().Count());

        var isNetFramework = assembly.TargetFramework != null && (assembly.TargetFramework.Contains(".NETFramework", StringComparison.OrdinalIgnoreCase) || assembly.TargetFramework.Contains("v4.", StringComparison.OrdinalIgnoreCase));
        var debtScore = 15;
        if (isNetFramework) debtScore += 35;
        if (assembly.Types.Any(t => t.FullName.Contains("Service", StringComparison.OrdinalIgnoreCase))) debtScore += 15;
        debtScore = Math.Min(debtScore, 100);

        var debtRating = debtScore switch
        {
            <= 25 => "A - Architettura Moderna",
            <= 45 => "B - Moderato Debito Tecnico",
            <= 70 => "C - Debito Architetturale Significativo",
            _ => "D - Legacy Critico"
        };

        var executiveSummary = $"L'analisi dell'assembly binario '{assembly.Name}' ({assembly.Version}) rileva un modulo compilato per target framework '{assembly.TargetFramework ?? "CLI non specificato"}'. " +
                               $"Il modulo comprende {totalTypes} tipi strutturati con {totalMethods} metodi e {totalProps} proprietà. " +
                               (isNetFramework ? "Il binario dipende da runtime .NET Framework proprietario Windows e necessita di ricompilazione verso .NET 8 per abilitare l'esecuzione cross-platform. " : "Il binario rispetta standard di runtime moderni. ") +
                               $"Il livello di debito tecnico del singolo assembly è stimato a {debtScore}/100 ({debtRating}).";

        var keyFindings = new List<string>
        {
            $"Target Framework rilevato: {assembly.TargetFramework ?? "ECMA-335 standard"}.",
            $"Volume di codice: {totalTypes} tipi ({assembly.Types.Count(t => t.Kind == TypeKind.Class)} classi, {assembly.Types.Count(t => t.Kind == TypeKind.Interface)} interfacce).",
            $"Riferimenti di assembly esterni: {assembly.References.Count} librerie importate.",
            isNetFramework ? "Vincolo architetturale su .NET Framework legacy (non containerizzabile su Linux)." : "Target moderno compatibile con runtime Core."
        };

        var risks = new List<ReportRiskEntry>();
        if (isNetFramework)
        {
            risks.Add(new ReportRiskEntry(
                Category: "Runtime Compatibility",
                Title: "Target Framework .NET Framework Legacy",
                Severity: "Alta",
                Description: "L'assembly non può essere eseguito su runtime Linux nativo o ambienti serverless moderni.",
                Mitigation: "Convertire il file di progetto in formato SDK-style e compilare verso net8.0."));
        }

        var roadmap = new List<ModernizationStep>
        {
            new ModernizationStep(
                Phase: 1,
                Title: "Migrazione a .NET 8 (SDK Style)",
                Objective: "Aggiornare la definizione di compilazione a modern .NET.",
                Details: "Sostituire i file csproj classici con il formato .NET SDK e verificare le API non supportate con .NET Upgrade Assistant.",
                Complexity: "Media",
                RiskLevel: "Basso")
        };

        var md = GenerateMarkdownReport(assembly.Name, "Assembly Binario", now, executiveSummary, debtScore, debtRating, "Modulo Compilato CLI", keyFindings, Array.Empty<ReportServiceEntry>(), Array.Empty<ReportPersistenceEntry>(), Array.Empty<ReportBatchEntry>(), risks, roadmap);

        return new ExecutiveReport(
            Title: $"Report Architetturale Esecutivo: {assembly.Name}",
            TargetName: assembly.Name,
            TargetType: "Assembly",
            GeneratedAt: now,
            ExecutiveSummary: executiveSummary,
            TechDebtScore: debtScore,
            TechDebtRating: debtRating,
            ArchitecturalStyle: "Modulo Compilato CLI",
            KeyFindings: keyFindings,
            ServiceCatalog: Array.Empty<ReportServiceEntry>(),
            DataPersistence: Array.Empty<ReportPersistenceEntry>(),
            BatchWorkers: Array.Empty<ReportBatchEntry>(),
            IdentifiedRisks: risks,
            ModernizationRoadmap: roadmap,
            MarkdownContent: md);
    }

    private static string GenerateMarkdownReport(
        string targetName,
        string targetType,
        DateTimeOffset date,
        string executiveSummary,
        int debtScore,
        string debtRating,
        string architecturalStyle,
        IReadOnlyList<string> keyFindings,
        IReadOnlyList<ReportServiceEntry> services,
        IReadOnlyList<ReportPersistenceEntry> databases,
        IReadOnlyList<ReportBatchEntry> batchWorkers,
        IReadOnlyList<ReportRiskEntry> risks,
        IReadOnlyList<ModernizationStep> roadmap)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# Report Architetturale Esecutivo: {targetName}");
        sb.AppendLine();
        sb.AppendLine($"- **Target di Analisi**: `{targetName}` ({targetType})");
        sb.AppendLine($"- **Data di Generazione**: {date:dd/MM/yyyy HH:mm:ss} UTC");
        sb.AppendLine($"- **Metodologia**: Ispezione passiva ECMA-335 a Zero-Execution (.NET Archaeologist)");
        sb.AppendLine($"- **Stile Architetturale**: {architecturalStyle}");
        sb.AppendLine($"- **Indice di Debito Tecnico**: **{debtScore}/100** ({debtRating})");
        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine();
        sb.AppendLine("## 1. Sintesi Esecutiva Narrativa");
        sb.AppendLine();
        sb.AppendLine(executiveSummary);
        sb.AppendLine();
        sb.AppendLine("### Punti Salienti Individuati");
        foreach (var finding in keyFindings)
        {
            sb.AppendLine($"- {finding}");
        }
        sb.AppendLine();

        if (services.Count > 0)
        {
            sb.AppendLine("## 2. Superficie di Esposizione e Servizi API");
            sb.AppendLine();
            sb.AppendLine("| Servizio | Tecnologia | Interfaccia Contratto | Endpoint | Raccomandazione di Migrazione |");
            sb.AppendLine("| :--- | :--- | :--- | :--- | :--- |");
            foreach (var svc in services)
            {
                sb.AppendLine($"| `{svc.ServiceName}` | {svc.Technology} | `{svc.ContractInterface ?? "-"}` | {svc.EndpointsCount} | {svc.MigrationRecommendation} |");
            }
            sb.AppendLine();
        }

        if (databases.Count > 0)
        {
            sb.AppendLine("## 3. Persistenza dei Dati e Database");
            sb.AppendLine();
            sb.AppendLine("| Contesto / Data Layer | Tecnologia | Tabelle Mappate | Stored Procedure Rilevate | Impatto Architetturale |");
            sb.AppendLine("| :--- | :--- | :--- | :--- | :--- |");
            foreach (var db in databases)
            {
                var tablesStr = db.Tables.Count > 0 ? string.Join(", ", db.Tables.Take(5)) : "Nessuna tabella";
                var procsStr = db.StoredProcedures.Count > 0 ? string.Join(", ", db.StoredProcedures.Take(5)) : "Nessuna procedura";
                sb.AppendLine($"| `{db.ContextName}` | {db.Technology} | {tablesStr} | {procsStr} | {db.ArchitecturalImpact} |");
            }
            sb.AppendLine();
        }

        if (batchWorkers.Count > 0)
        {
            sb.AppendLine("## 4. Processi Batch & Lavorazioni Asincrone");
            sb.AppendLine();
            sb.AppendLine("| Worker / Job | Entry Point | Trigger Rilevati | Strategia di Containerizzazione |");
            sb.AppendLine("| :--- | :--- | :--- | :--- |");
            foreach (var bw in batchWorkers)
            {
                sb.AppendLine($"| `{bw.WorkerName}` | `{bw.EntryPoint}` | {string.Join(", ", bw.Triggers)} | {bw.ContainerizationRecommendation} |");
            }
            sb.AppendLine();
        }

        if (risks.Count > 0)
        {
            sb.AppendLine("## 5. Matrice dei Rischi Architetturali");
            sb.AppendLine();
            sb.AppendLine("| Severità | Categoria | Rischio | Mitigazione Consigliata |");
            sb.AppendLine("| :--- | :--- | :--- | :--- |");
            foreach (var risk in risks)
            {
                sb.AppendLine($"| **{risk.Severity}** | {risk.Category} | {risk.Title}: {risk.Description} | {risk.Mitigation} |");
            }
            sb.AppendLine();
        }

        if (roadmap.Count > 0)
        {
            sb.AppendLine("## 6. Piano di Modernizzazione Strategica (Roadmap Consigliata)");
            sb.AppendLine();
            foreach (var step in roadmap)
            {
                sb.AppendLine($"### Fase {step.Phase}: {step.Title}");
                sb.AppendLine($"- **Obiettivo**: {step.Objective}");
                sb.AppendLine($"- **Dettagli Operativi**: {step.Details}");
                sb.AppendLine($"- **Complessità Stimata**: {step.Complexity} | **Livello di Rischio**: {step.RiskLevel}");
                sb.AppendLine();
            }
        }

        sb.AppendLine("---");
        sb.AppendLine("*Documento generato automaticamente da .NET Archaeologist - Architettura & Reverse Engineering a Zero-Execution.*");

        return sb.ToString();
    }
}
