using System;
using System.Collections.Generic;

namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Singola voce di servizio inclusa nel report architetturale.
/// </summary>
public sealed record ReportServiceEntry(
    string ServiceName,
    string Technology,
    string? ContractInterface,
    int EndpointsCount,
    IReadOnlyList<string> ExposedEndpoints,
    string MigrationRecommendation);

/// <summary>
/// Singola voce di persistenza inclusa nel report architetturale.
/// </summary>
public sealed record ReportPersistenceEntry(
    string ContextName,
    string Technology,
    IReadOnlyList<string> Tables,
    IReadOnlyList<string> StoredProcedures,
    string ArchitecturalImpact);

/// <summary>
/// Singola voce di processo batch / worker nel report.
/// </summary>
public sealed record ReportBatchEntry(
    string WorkerName,
    string EntryPoint,
    IReadOnlyList<string> Triggers,
    string ContainerizationRecommendation);

/// <summary>
/// Rischio architetturale individuato durante l'ispezione archeologica.
/// </summary>
public sealed record ReportRiskEntry(
    string Category,
    string Title,
    string Severity,
    string Description,
    string Mitigation);

/// <summary>
/// Fase strategica del piano di modernizzazione in linguaggio naturale.
/// </summary>
public sealed record ModernizationStep(
    int Phase,
    string Title,
    string Objective,
    string Details,
    string Complexity,
    string RiskLevel);

/// <summary>
/// Report esecutivo in linguaggio naturale per architetti, tech lead e stakeholder aziendali.
/// </summary>
public sealed record ExecutiveReport(
    string Title,
    string TargetName,
    string TargetType,
    DateTimeOffset GeneratedAt,
    string ExecutiveSummary,
    int TechDebtScore,
    string TechDebtRating,
    string ArchitecturalStyle,
    IReadOnlyList<string> KeyFindings,
    IReadOnlyList<ReportServiceEntry> ServiceCatalog,
    IReadOnlyList<ReportPersistenceEntry> DataPersistence,
    IReadOnlyList<ReportBatchEntry> BatchWorkers,
    IReadOnlyList<ReportRiskEntry> IdentifiedRisks,
    IReadOnlyList<ModernizationStep> ModernizationRoadmap,
    string MarkdownContent);
