using System;
using System.Collections.Generic;
using DotNetArchaeologist.Core.Contracts;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Analysis.Engines;

/// <summary>
/// Costruttore del grafo architetturale che mappa i metadati di un assembly
/// in nodi e relazioni strutturali orientate (Assembly, Namespace, Tipi, Ereditarietà, Interfacce).
/// </summary>
public sealed class ArchitectureGraphBuilder : IArchitectureGraphBuilder
{
    private static readonly HashSet<string> IgnoredPrimitiveTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "void", "int", "string", "bool", "double", "float", "byte", "sbyte", "short", "ushort",
        "uint", "long", "ulong", "decimal", "char", "object", "dynamic", "nint", "nuint",
        "System.Void", "System.Int32", "System.String", "System.Boolean", "System.Double",
        "System.Single", "System.Byte", "System.SByte", "System.Int16", "System.UInt16",
        "System.UInt32", "System.Int64", "System.UInt64", "System.Decimal", "System.Char",
        "System.Object", "System.ValueType", "System.Enum", "System.Array", "System.Delegate",
        "System.MulticastDelegate", "System.Exception", "System.DateTime", "System.TimeSpan",
        "System.Guid", "System.Nullable`1"
    };

    public ArchitectureGraph BuildGraph(AssemblyDescriptor assembly, ArchitectureGraphOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(assembly);
        options ??= new ArchitectureGraphOptions();

        var nodes = new Dictionary<string, GraphNode>(StringComparer.Ordinal);
        var edges = new List<GraphEdge>();
        var existingEdgeIds = new HashSet<string>(StringComparer.Ordinal);

        // 1. Nodo Assembly principale
        var assemblyNodeId = $"asm:{assembly.Name}";
        var assemblyMetadata = new Dictionary<string, string>
        {
            ["Version"] = assembly.Version?.ToString() ?? "0.0.0.0",
            ["MVID"] = assembly.Mvid.ToString(),
            ["TargetFramework"] = assembly.TargetFramework ?? "unknown"
        };

        nodes[assemblyNodeId] = new GraphNode(
            Id: assemblyNodeId,
            Label: assembly.Name,
            Kind: "Assembly",
            Namespace: null,
            Metadata: assemblyMetadata);

        // Mappa dei nomi completi dei tipi definiti nell'assembly
        var declaredTypesMap = new HashSet<string>(assembly.Types.Select(t => t.FullName), StringComparer.Ordinal);

        // 2. Mappatura dei Namespace e dei Tipi dichiarati
        var knownNamespaces = new HashSet<string>(StringComparer.Ordinal);

        foreach (var type in assembly.Types)
        {
            var ns = string.IsNullOrEmpty(type.Namespace) ? "<Global>" : type.Namespace;
            var nsNodeId = $"ns:{ns}";

            if (knownNamespaces.Add(ns))
            {
                nodes[nsNodeId] = new GraphNode(
                    Id: nsNodeId,
                    Label: ns,
                    Kind: "Namespace",
                    Namespace: ns,
                    Metadata: new Dictionary<string, string>());

                var edgeId = $"edge:{assemblyNodeId}->{nsNodeId}";
                if (existingEdgeIds.Add(edgeId))
                {
                    edges.Add(new GraphEdge(
                        Id: edgeId,
                        Source: assemblyNodeId,
                        Target: nsNodeId,
                        Relation: RelationKind.Declares,
                        Label: "declares"));
                }
            }

            // 3. Nodo del Tipo
            var typeNodeId = $"type:{type.FullName}";
            var typeMetadata = new Dictionary<string, string>
            {
                ["Accessibility"] = type.Accessibility.ToString(),
                ["IsAbstract"] = type.IsAbstract.ToString(),
                ["IsSealed"] = type.IsSealed.ToString(),
                ["IsStatic"] = type.IsStatic.ToString(),
                ["Kind"] = type.Kind.ToString()
            };

            nodes[typeNodeId] = new GraphNode(
                Id: typeNodeId,
                Label: type.Name,
                Kind: type.Kind.ToString(),
                Namespace: type.Namespace,
                Metadata: typeMetadata);

            // Arco dal Namespace al Tipo
            var containsEdgeId = $"edge:{nsNodeId}->{typeNodeId}";
            if (existingEdgeIds.Add(containsEdgeId))
            {
                edges.Add(new GraphEdge(
                    Id: containsEdgeId,
                    Source: nsNodeId,
                    Target: typeNodeId,
                    Relation: RelationKind.Declares,
                    Label: "contains"));
            }

            // 4. Relazione di Ereditarietà (Inherits)
            if (!string.IsNullOrEmpty(type.BaseTypeFullName) &&
                !type.BaseTypeFullName.Equals("System.Object", StringComparison.Ordinal) &&
                !type.BaseTypeFullName.Equals("System.ValueType", StringComparison.Ordinal) &&
                !type.BaseTypeFullName.Equals("System.Enum", StringComparison.Ordinal))
            {
                var baseTypeNodeId = $"type:{type.BaseTypeFullName}";
                if (!nodes.ContainsKey(baseTypeNodeId) && options.IncludeExternalTypes)
                {
                    nodes[baseTypeNodeId] = new GraphNode(
                        Id: baseTypeNodeId,
                        Label: ExtractSimpleName(type.BaseTypeFullName),
                        Kind: "Class",
                        Namespace: ExtractNamespace(type.BaseTypeFullName),
                        Metadata: new Dictionary<string, string> { ["IsExternal"] = "true" });
                }

                if (nodes.ContainsKey(baseTypeNodeId))
                {
                    var edgeId = $"edge:{typeNodeId}-inherits->{baseTypeNodeId}";
                    if (existingEdgeIds.Add(edgeId))
                    {
                        edges.Add(new GraphEdge(
                            Id: edgeId,
                            Source: typeNodeId,
                            Target: baseTypeNodeId,
                            Relation: RelationKind.Inherits,
                            Label: "inherits"));
                    }
                }
            }

            // 5. Relazioni di Implementazione Interfaccia (Implements)
            foreach (var ifaceName in type.ImplementedInterfaces)
            {
                var ifaceNodeId = $"type:{ifaceName}";
                if (!nodes.ContainsKey(ifaceNodeId) && options.IncludeExternalTypes)
                {
                    nodes[ifaceNodeId] = new GraphNode(
                        Id: ifaceNodeId,
                        Label: ExtractSimpleName(ifaceName),
                        Kind: "Interface",
                        Namespace: ExtractNamespace(ifaceName),
                        Metadata: new Dictionary<string, string> { ["IsExternal"] = "true" });
                }

                if (nodes.ContainsKey(ifaceNodeId))
                {
                    var edgeId = $"edge:{typeNodeId}-implements->{ifaceNodeId}";
                    if (existingEdgeIds.Add(edgeId))
                    {
                        edges.Add(new GraphEdge(
                            Id: edgeId,
                            Source: typeNodeId,
                            Target: ifaceNodeId,
                            Relation: RelationKind.Implements,
                            Label: "implements"));
                    }
                }
            }

            // 6. Relazioni di Dipendenza Membri (References: campi, proprietà, parametri, ritorni)
            if (options.IncludeMemberReferences)
            {
                var referencedTypeNames = new HashSet<string>(StringComparer.Ordinal);

                foreach (var member in type.Members)
                {
                    var cleanRetType = CleanTypeName(member.ReturnTypeOrType);
                    if (IsCandidateDependency(cleanRetType))
                    {
                        referencedTypeNames.Add(cleanRetType);
                    }

                    foreach (var param in member.Parameters)
                    {
                        var cleanParamType = CleanTypeName(param.Type);
                        if (IsCandidateDependency(cleanParamType))
                        {
                            referencedTypeNames.Add(cleanParamType);
                        }
                    }
                }

                foreach (var depType in referencedTypeNames)
                {
                    if (depType.Equals(type.FullName, StringComparison.Ordinal))
                    {
                        continue; // Evita loop su sé stesso
                    }

                    var isDeclared = declaredTypesMap.Contains(depType);
                    if (!isDeclared && !options.IncludeExternalTypes)
                    {
                        continue;
                    }

                    if (nodes.Count >= options.MaxReferencedNodes && !isDeclared)
                    {
                        continue;
                    }

                    var depNodeId = $"type:{depType}";
                    if (!nodes.ContainsKey(depNodeId))
                    {
                        nodes[depNodeId] = new GraphNode(
                            Id: depNodeId,
                            Label: ExtractSimpleName(depType),
                            Kind: "Type",
                            Namespace: ExtractNamespace(depType),
                            Metadata: new Dictionary<string, string> { ["IsExternal"] = isDeclared ? "false" : "true" });
                    }

                    var edgeId = $"edge:{typeNodeId}-references->{depNodeId}";
                    if (existingEdgeIds.Add(edgeId))
                    {
                        edges.Add(new GraphEdge(
                            Id: edgeId,
                            Source: typeNodeId,
                            Target: depNodeId,
                            Relation: RelationKind.References,
                            Label: "references"));
                    }
                }
            }
        }

        return new ArchitectureGraph(
            Nodes: new List<GraphNode>(nodes.Values),
            Edges: edges);
    }

    private static bool IsCandidateDependency(string typeName)
    {
        if (string.IsNullOrWhiteSpace(typeName) || IgnoredPrimitiveTypes.Contains(typeName))
        {
            return false;
        }

        return !typeName.StartsWith("System.Collections", StringComparison.Ordinal) &&
               !typeName.StartsWith("System.Threading", StringComparison.Ordinal);
    }

    private static string CleanTypeName(string rawType)
    {
        if (string.IsNullOrWhiteSpace(rawType)) return string.Empty;

        var cleaned = rawType.Trim();
        // Rimuove array []
        while (cleaned.EndsWith("[]", StringComparison.Ordinal))
        {
            cleaned = cleaned[..^2];
        }

        // Rimuove puntatori o nullable
        cleaned = cleaned.TrimEnd('*', '&', '?');

        // Estrae il tipo interno dai generics (es. Task<Order>, List<Customer>)
        var openGeneric = cleaned.IndexOf('<');
        var closeGeneric = cleaned.LastIndexOf('>');
        if (openGeneric >= 0 && closeGeneric > openGeneric)
        {
            var inner = cleaned.Substring(openGeneric + 1, closeGeneric - openGeneric - 1).Trim();
            if (!inner.Contains(',') && !string.IsNullOrWhiteSpace(inner))
            {
                cleaned = inner;
            }
        }

        return cleaned;
    }

    private static string ExtractSimpleName(string fullName)
    {
        var lastDot = fullName.LastIndexOf('.');
        return lastDot >= 0 ? fullName[(lastDot + 1)..] : fullName;
    }

    private static string? ExtractNamespace(string fullName)
    {
        var lastDot = fullName.LastIndexOf('.');
        return lastDot >= 0 ? fullName[..lastDot] : null;
    }
}
