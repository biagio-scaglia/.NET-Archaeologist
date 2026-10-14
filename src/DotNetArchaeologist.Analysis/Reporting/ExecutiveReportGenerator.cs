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

        // Narrazione colloquiale in linguaggio naturale dell'Archeologo
        var conversationalWalkthrough = BuildSolutionConversationalWalkthrough(solution, architecturalStyle, debtScore, debtRating, hasWcf, hasWebApi, hasObjectContext, hasStoredProcs, hasBatch);
        var naturalLanguageInsights = BuildSolutionNaturalLanguageQnA(solution, hasWcf, hasWebApi, hasObjectContext, hasStoredProcs, hasBatch);

        // Generazione del report in formato Markdown con la sezione parlata
        var md = GenerateMarkdownReport(
            solution.Name,
            "Solution .NET",
            now,
            executiveSummary,
            conversationalWalkthrough,
            naturalLanguageInsights,
            debtScore,
            debtRating,
            architecturalStyle,
            keyFindings,
            serviceCatalog,
            dataPersistence,
            batchWorkers,
            risks,
            roadmap);

        return new ExecutiveReport(
            Title: $"Report Architetturale Esecutivo: {solution.Name}",
            TargetName: solution.Name,
            TargetType: "Solution",
            GeneratedAt: now,
            ExecutiveSummary: executiveSummary,
            ConversationalWalkthrough: conversationalWalkthrough,
            NaturalLanguageInsights: naturalLanguageInsights,
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

        var conversationalWalkthrough = BuildAssemblyConversationalWalkthrough(assembly, isNetFramework, debtScore, debtRating);
        var naturalLanguageInsights = BuildAssemblyNaturalLanguageQnA(assembly, isNetFramework);

        var md = GenerateMarkdownReport(
            assembly.Name,
            "Assembly Binario",
            now,
            executiveSummary,
            conversationalWalkthrough,
            naturalLanguageInsights,
            debtScore,
            debtRating,
            "Modulo Compilato CLI",
            keyFindings,
            Array.Empty<ReportServiceEntry>(),
            Array.Empty<ReportPersistenceEntry>(),
            Array.Empty<ReportBatchEntry>(),
            risks,
            roadmap);

        return new ExecutiveReport(
            Title: $"Report Architetturale Esecutivo: {assembly.Name}",
            TargetName: assembly.Name,
            TargetType: "Assembly",
            GeneratedAt: now,
            ExecutiveSummary: executiveSummary,
            ConversationalWalkthrough: conversationalWalkthrough,
            NaturalLanguageInsights: naturalLanguageInsights,
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
        string conversationalWalkthrough,
        IReadOnlyList<NaturalLanguageQnA> qnaList,
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

        sb.AppendLine("### 🎙️ L'Archeologo Spiega (Narrazione in Linguaggio Naturale)");
        sb.AppendLine();
        sb.AppendLine(conversationalWalkthrough);
        sb.AppendLine();

        if (qnaList.Count > 0)
        {
            sb.AppendLine("### ❓ Domande & Risposte Chiave sul Sistema");
            sb.AppendLine();
            foreach (var qna in qnaList)
            {
                sb.AppendLine($"#### 🔹 {qna.Question}");
                sb.AppendLine();
                sb.AppendLine(qna.Answer);
                sb.AppendLine();
            }
        }

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

    private static string BuildSolutionConversationalWalkthrough(
        SolutionDescriptor solution,
        string architecturalStyle,
        int debtScore,
        string debtRating,
        bool hasWcf,
        bool hasWebApi,
        bool hasObjectContext,
        bool hasStoredProcs,
        bool hasBatch)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Se dovessimo spiegare questa soluzione come davanti a una lavagna con un collega: **{solution.Name}** è un'architettura enterprise articolata su **{solution.TotalProjects} progetti distinti**, il cui stile complessivo è identificabile come *{architecturalStyle}*.");
        sb.AppendLine();
        sb.AppendLine($"Il cuore del sistema è progettato per gestire flussi di business aziendali mediante una separazione tra esposizione, logica e persistenza.");

        if (solution.Services.Count > 0)
        {
            var svcNames = string.Join(", ", solution.Services.Select(s => $"`{s.ServiceName}`"));
            sb.AppendLine();
            sb.AppendLine($"Dal punto di vista dell'integrazione, il sistema espone **{solution.TotalServices} servizi** ({svcNames}), offrendo un totale di **{solution.Services.Sum(s => s.Endpoints.Count)} operazioni callable**.");
            if (hasWcf)
            {
                sb.AppendLine("Questi servizi comunicano tramite contratti WCF (SOAP) fortemente tipizzati. Questo significa che i client devono condividere i contratti d'interfaccia o generare proxy WSDL dedicati, legando l'infrastruttura al mondo Windows/IIS.");
            }
            if (hasWebApi)
            {
                sb.AppendLine("Sono presenti inoltre controller o endpoint REST/Web API, che aprono il sistema a client moderni, browser o integrazioni HTTP standard.");
            }
        }
        else
        {
            sb.AppendLine();
            sb.AppendLine("Non sono stati rilevati servizi web o endpoint di rete espliciti: la soluzione opera prevalentemente come insieme di librerie di classe, processi da riga di comando o interfacce utente desktop.");
        }

        if (solution.Databases.Count > 0)
        {
            var dbNames = string.Join(", ", solution.Databases.Select(d => $"`{d.Name}`"));
            sb.AppendLine();
            sb.AppendLine($"La persistenza dei dati fa perno su **{solution.TotalDatabases} componenti di accesso dati** ({dbNames}), con **{solution.Databases.Sum(d => d.EntitiesOrTables.Count)} tabelle mappate**.");
            if (hasStoredProcs)
            {
                var procsCount = solution.Databases.Sum(d => d.DetectedStoredProceduresOrQueries.Count);
                sb.AppendLine($"Attenzione: sono state rintracciate ben **{procsCount} chiamate dirette a stored procedure o query T-SQL** cablate nel codice. Parte delle logiche di calcolo e validazione è quindi delegata direttamente all'istanza SQL Server.");
            }
            if (hasObjectContext)
            {
                sb.AppendLine("Il framework ORM in uso adotta il pattern `ObjectContext` di Entity Framework 4.x/6.x classico, un indicatore storico di codice pre-EF Core.");
            }
        }

        if (hasBatch)
        {
            var batchNames = string.Join(", ", solution.BatchWorkers.Select(b => $"`{b.WorkerName}`"));
            sb.AppendLine();
            sb.AppendLine($"A completare il quadro, le lavorazioni asincrone e i flussi notturni sono affidati a **{solution.TotalBatchWorkers} processi batch** ({batchNames}).");
        }

        sb.AppendLine();
        sb.AppendLine($"In sintesi, il debito tecnico complessivo si attesta a **{debtScore}/100 ({debtRating})**. Se un nuovo team dovesse prendere in carico questo sistema domani mattina, il primo passo consigliato non è riscrivere tutto da zero, ma isolare i contratti di integrazione e preparare una transizione incrementale.");

        return sb.ToString();
    }

    private static IReadOnlyList<NaturalLanguageQnA> BuildSolutionNaturalLanguageQnA(
        SolutionDescriptor solution,
        bool hasWcf,
        bool hasWebApi,
        bool hasObjectContext,
        bool hasStoredProcs,
        bool hasBatch)
    {
        var list = new List<NaturalLanguageQnA>
        {
            new(
                Question: "Cosa fa in concreto questo sistema software?",
                Answer: $"La soluzione '{solution.Name}' comprende {solution.TotalProjects} progetti strutturati per erogare logiche di business su larga scala. Raggruppa {solution.TotalServices} canali di servizio, gestisce la persistenza con {solution.TotalDatabases} contesti database e orchestra {solution.TotalBatchWorkers} job autonomi.",
                Topic: "Architettura Generale"),
            new(
                Question: "Come dialogano i diversi componenti tra loro?",
                Answer: hasWcf
                    ? "La comunicazione interna ed esterna è prevalentemente sincrona via SOAP/WCF con contratti C# condivisi. Per le chiamate REST moderne sono presenti controller Web API dedicati."
                    : "I componenti interagiscono tramite invocazioni dirette in memoria tra librerie di classe e tramite chiamate HTTP REST standard.",
                Topic: "Integrazione & Protocolli"),
            new(
                Question: "Dove risiedono i dati e quali rischi ci sono sul database?",
                Answer: hasStoredProcs
                    ? $"I dati sono memorizzati su database relazionale SQL Server. Sono state rilevate {solution.Databases.Sum(d => d.DetectedStoredProceduresOrQueries.Count)} stored procedure cablate, che creano un forte accoppiamento con lo schema DB fisico."
                    : "I dati risiedono su database relazionale gestito tramite ORM ad entità, consentendo una separazione più agevole tra codice C# e motore di archiviazione.",
                Topic: "Persistenza & Dati"),
            new(
                Question: "Ci sono elaborazioni in background o processi schedulati?",
                Answer: hasBatch
                    ? $"Sì, sono presenti {solution.TotalBatchWorkers} processi batch autonomi (eseguibili console o worker di background) preposti all'elaborazione massiva, sincronizzazione notturna o calcolo differito."
                    : "Non sono stati rilevati processi batch autonomi: il sistema opera prevalentemente 'on-demand' su richiesta dei client.",
                Topic: "Batch & Asincrono"),
            new(
                Question: "Se dovessi modernizzarlo verso .NET 8 o 9, da dove comincerei?",
                Answer: hasWcf
                    ? "Il primo passo critico è disaccoppiare i contratti WCF, convertendoli in ASP.NET Core Minimal APIs o migrando temporaneamente a CoreWCF. Successivamente si migrano i DbContext a EF Core e si containerizzano i batch worker in Docker."
                    : "La priorità consiste nell'aggiornare i progetti allo standard SDK-style di .NET 8, validando la compatibilità delle librerie NuGet e containerizzando i servizi su Linux.",
                Topic: "Strategia di Modernizzazione")
        };

        return list;
    }

    private static string BuildAssemblyConversationalWalkthrough(
        AssemblyDescriptor assembly,
        bool isNetFramework,
        int debtScore,
        string debtRating)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"L'archeologia del modulo binario **{assembly.Name}** (versione {assembly.Version}) rivela un assembly .NET compilato per `{assembly.TargetFramework ?? "ECMA-335 standard"}`.");
        sb.AppendLine();
        sb.AppendLine($"All'interno del modulo risiedono **{assembly.TotalTypesCount} tipi strutturati** ({assembly.Types.Count(t => t.Kind == TypeKind.Class)} classi, {assembly.Types.Count(t => t.Kind == TypeKind.Interface)} interfacce), che definiscono l'ossatura logica del componente.");
        sb.AppendLine();
        if (isNetFramework)
        {
            sb.AppendLine("Il binario è ancorato al runtime .NET Framework proprietario di Windows. Questo significa che non può essere eseguito in modo nativo su sistemi operativi Linux, macOS o in container leggeri Alpine senza una ricompilazione mirata a .NET 8 o l'uso di runtime compatibili.");
        }
        else
        {
            sb.AppendLine("Il target di compilazione rispetta gli standard moderni di .NET Core / .NET 8+, garantendo piena portabilità e interoperabilità cross-platform.");
        }
        sb.AppendLine();
        sb.AppendLine($"Il debito tecnico specifico del modulo è valutato in **{debtScore}/100 ({debtRating})**.");

        return sb.ToString();
    }

    private static IReadOnlyList<NaturalLanguageQnA> BuildAssemblyNaturalLanguageQnA(
        AssemblyDescriptor assembly,
        bool isNetFramework)
    {
        return new List<NaturalLanguageQnA>
        {
            new(
                Question: "Qual è lo scopo principale di questo assembly?",
                Answer: $"L'assembly '{assembly.Name}' incapsula {assembly.TotalTypesCount} tipi compilati e opera come modulo autonomo della soluzione. Importa {assembly.References.Count} riferimenti esterni per svolgere le sue funzioni.",
                Topic: "Ruolo nel Sistema"),
            new(
                Question: "Può essere eseguito in container Linux moderni?",
                Answer: isNetFramework
                    ? "No, poiché fa riferimento alle librerie mscorlib/.NET Framework classiche per Windows. È necessaria la migrazione del progetto a net8.0."
                    : "Sì, il target framework è moderno e supporta pienamente l'esecuzione su container Linux e ambienti cloud serverless.",
                Topic: "Portabilità & Cloud"),
            new(
                Question: "Quali sono le dipendenze esterne più importanti?",
                Answer: $"Il modulo dichiara {assembly.References.Count} referenze, tra cui: {string.Join(", ", assembly.References.Take(6).Select(r => r.Name))}.",
                Topic: "Dipendenze & Integrazione")
        };
    }
}
