using System.Collections.Generic;
using System.Linq;

namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Tipologia di costrutto del tipo CLI.
/// </summary>
public enum TypeKind
{
    Class,
    Interface,
    Struct,
    Enum,
    Delegate,
    Record
}

/// <summary>
/// Modificatore di visibilità/accessibilità del tipo o del membro.
/// </summary>
public enum AccessibilityModifier
{
    Private,
    Protected,
    Internal,
    ProtectedInternal,
    PrivateProtected,
    Public,
    NestedPrivate,
    NestedPublic,
    NestedFamily,
    NestedAssembly,
    NestedFamilyAndAssembly,
    NestedFamilyOrAssembly,
    Unknown
}

/// <summary>
/// Rappresenta i metadati descrittivi di un tipo definito nell'assembly (TypeDef).
/// </summary>
public sealed record TypeDescriptor(
    string FullName,
    string Namespace,
    string Name,
    TypeKind Kind,
    AccessibilityModifier Accessibility,
    bool IsAbstract,
    bool IsSealed,
    bool IsStatic,
    bool IsNested,
    string? BaseTypeFullName,
    IReadOnlyList<string> ImplementedInterfaces,
    IReadOnlyList<MemberDescriptor> Members,
    IReadOnlyList<string> Attributes)
{
    /// <summary>
    /// Restituisce i soli metodi dichiarati nel tipo.
    /// </summary>
    public IEnumerable<MemberDescriptor> GetMethods() =>
        Members.Where(m => m.Kind is MemberKind.Method or MemberKind.Constructor);

    /// <summary>
    /// Restituisce le sole proprietà dichiarate nel tipo.
    /// </summary>
    public IEnumerable<MemberDescriptor> GetProperties() =>
        Members.Where(m => m.Kind == MemberKind.Property);

    /// <summary>
    /// Restituisce i soli campi dichiarati nel tipo.
    /// </summary>
    public IEnumerable<MemberDescriptor> GetFields() =>
        Members.Where(m => m.Kind == MemberKind.Field);
}
