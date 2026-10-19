using System;
using System.Collections.Generic;

namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Rappresenta un fascicolo strutturato e immutabile di evidenze archeologiche,
/// compatibile per interscambio file con la suite REA (Reverse Engineer Anything).
/// </summary>
public sealed class EvidenceBundle
{
    public const string DefaultFormat = "DotNetArchaeologist.EvidenceBundle";
    public const string CurrentVersion = "1.0.0";

    public string Format { get; init; } = DefaultFormat;
    public string Version { get; init; } = CurrentVersion;
    public string BundleId { get; init; } = Guid.NewGuid().ToString("N");
    public string TargetName { get; init; } = string.Empty;
    public string TargetSha256 { get; init; } = string.Empty;
    public string TargetKind { get; init; } = "Assembly";
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;
    public string Summary { get; init; } = string.Empty;
    public IReadOnlyList<EvidenceRecord> Records { get; init; } = Array.Empty<EvidenceRecord>();
    public IReadOnlyDictionary<string, string> Metadata { get; init; } = new Dictionary<string, string>();
}

/// <summary>
/// Singola evidenza oggettiva osservata a Zero-Execution sul target.
/// Il campo EvidenceId segue il formato standard canonico 'ev_' + 64 caratteri esadecimali.
/// </summary>
public sealed class EvidenceRecord
{
    public string EvidenceId { get; init; } = string.Empty;
    public string Category { get; init; } = "Observation";
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public double Confidence { get; init; } = 1.0;
    public DateTime TimestampUtc { get; init; } = DateTime.UtcNow;
    public IReadOnlyDictionary<string, object?> Attributes { get; init; } = new Dictionary<string, object?>();
}

/// <summary>
/// Esito della validazione formale di un Evidence Bundle importato.
/// </summary>
public sealed class EvidenceBundleValidationResult
{
    public bool IsValid { get; init; }
    public string? ErrorMessage { get; init; }
    public EvidenceBundle? Bundle { get; init; }
    public int RecordCount => Bundle?.Records.Count ?? 0;
}
