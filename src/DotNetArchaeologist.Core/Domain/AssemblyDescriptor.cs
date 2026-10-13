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
    IReadOnlyList<TypeDescriptor> Types)
{
    /// <summary>
    /// Restituisce il conteggio complessivo dei tipi dichiarati nell'assembly.
    /// </summary>
    public int TotalTypesCount => Types.Count;
}
