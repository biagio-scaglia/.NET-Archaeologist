using System.Collections.Generic;

namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Tipologia di membro all'interno di un tipo.
/// </summary>
public enum MemberKind
{
    Method,
    Constructor,
    Property,
    Field,
    Event
}

/// <summary>
/// Descrittore di un parametro di metodo o costruttore.
/// </summary>
public sealed record ParameterDescriptor(
    string Name,
    string Type,
    int Position,
    bool IsIn,
    bool IsOut,
    bool HasDefaultValue);

/// <summary>
/// Rappresenta i metadati descrittivi di un membro CLI (metodo, costruttore, campo, proprietà, evento).
/// </summary>
public sealed record MemberDescriptor(
    string Name,
    MemberKind Kind,
    string ReturnTypeOrType,
    AccessibilityModifier Accessibility,
    bool IsStatic,
    bool IsVirtual,
    bool IsAbstract,
    IReadOnlyList<ParameterDescriptor> Parameters,
    IReadOnlyList<string> Attributes);
