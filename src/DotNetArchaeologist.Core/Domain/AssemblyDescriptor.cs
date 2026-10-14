using System;
using System.Collections.Generic;

namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Rappresenta i metadati descrittivi di un riferimento a un altro assembly (AssemblyRef).
/// </summary>
public sealed record AssemblyReferenceDescriptor(
    string Name,
    Version? Version,
    string? Culture,
    string? PublicKeyToken);

/// <summary>
/// Rappresenta una risorsa incorporata (ManifestResource) presente nei metadati dell'assembly.
/// </summary>
public sealed record ManifestResourceDescriptor(
    string Name,
    string Visibility,
    long Offset,
    string? ResourceType);

/// <summary>
/// Rappresenta una stringa costante letterale estratta dallo stream metadati #US (User Strings).
/// </summary>
public sealed record ExtractedConstantString(
    string Value,
    string Category);

/// <summary>
/// Rappresenta un rilievo o rischio di obsolescenza per la migrazione e modernizzazione a .NET 8.
/// </summary>
public sealed record ModernizationFinding(
    string Category,
    string Target,
    string Severity,
    string Description,
    string Recommendation);

/// <summary>
/// Rappresenta la descrizione completa dei metadati di un assembly .NET analizzato staticamente.
/// </summary>
public sealed record AssemblyDescriptor(
    string Name,
    Version? Version,
    string? Culture,
    string? PublicKeyToken,
    string? TargetFramework,
    Guid Mvid,
    IReadOnlyList<AssemblyReferenceDescriptor> References,
    IReadOnlyList<TypeDescriptor> Types,
    IReadOnlyList<ManifestResourceDescriptor>? ManifestResources = null,
    IReadOnlyList<ExtractedConstantString>? UserStrings = null,
    IReadOnlyList<ModernizationFinding>? ModernizationFindings = null)
{
    public IReadOnlyList<ManifestResourceDescriptor> ManifestResources { get; init; } = ManifestResources ?? Array.Empty<ManifestResourceDescriptor>();
    public IReadOnlyList<ExtractedConstantString> UserStrings { get; init; } = UserStrings ?? Array.Empty<ExtractedConstantString>();
    public IReadOnlyList<ModernizationFinding> ModernizationFindings { get; init; } = ModernizationFindings ?? Array.Empty<ModernizationFinding>();

    /// <summary>
    /// Restituisce il conteggio complessivo dei tipi dichiarati nell'assembly.
    /// </summary>
    public int TotalTypesCount => Types.Count;
}
