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
    public ArchitectureGraph BuildGraph(AssemblyDescriptor assembly)
    {
        ArgumentNullException.ThrowIfNull(assembly);

        var nodes = new Dictionary<string, GraphNode>(StringComparer.Ordinal);
        var edges = new List<GraphEdge>();

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

        // 2. Mappatura dei Namespace
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

                // Arco dall'Assembly al Namespace
                edges.Add(new GraphEdge(
                    Id: $"edge:{assemblyNodeId}->{nsNodeId}",
                    Source: assemblyNodeId,
                    Target: nsNodeId,
                    Relation: RelationKind.Declares,
                    Label: "declares"));
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
            edges.Add(new GraphEdge(
                Id: $"edge:{nsNodeId}->{typeNodeId}",
                Source: nsNodeId,
                Target: typeNodeId,
                Relation: RelationKind.Declares,
                Label: "contains"));

            // 4. Relazione di Ereditarietà (Inherits)
            if (!string.IsNullOrEmpty(type.BaseTypeFullName) &&
                !type.BaseTypeFullName.Equals("System.Object", StringComparison.Ordinal) &&
                !type.BaseTypeFullName.Equals("System.ValueType", StringComparison.Ordinal) &&
                !type.BaseTypeFullName.Equals("System.Enum", StringComparison.Ordinal))
            {
                var baseTypeNodeId = $"type:{type.BaseTypeFullName}";
                if (!nodes.ContainsKey(baseTypeNodeId))
                {
                    nodes[baseTypeNodeId] = new GraphNode(
                        Id: baseTypeNodeId,
                        Label: ExtractSimpleName(type.BaseTypeFullName),
                        Kind: "Class",
                        Namespace: ExtractNamespace(type.BaseTypeFullName),
                        Metadata: new Dictionary<string, string> { ["IsExternal"] = "true" });
                }

                edges.Add(new GraphEdge(
                    Id: $"edge:{typeNodeId}-inherits->{baseTypeNodeId}",
                    Source: typeNodeId,
                    Target: baseTypeNodeId,
                    Relation: RelationKind.Inherits,
                    Label: "inherits"));
            }

            // 5. Relazioni di Implementazione Interfaccia (Implements)
            foreach (var ifaceName in type.ImplementedInterfaces)
            {
                var ifaceNodeId = $"type:{ifaceName}";
                if (!nodes.ContainsKey(ifaceNodeId))
                {
                    nodes[ifaceNodeId] = new GraphNode(
                        Id: ifaceNodeId,
                        Label: ExtractSimpleName(ifaceName),
                        Kind: "Interface",
                        Namespace: ExtractNamespace(ifaceName),
                        Metadata: new Dictionary<string, string> { ["IsExternal"] = "true" });
                }

                edges.Add(new GraphEdge(
                    Id: $"edge:{typeNodeId}-implements->{ifaceNodeId}",
                    Source: typeNodeId,
                    Target: ifaceNodeId,
                    Relation: RelationKind.Implements,
                    Label: "implements"));
            }
        }

        return new ArchitectureGraph(
            Nodes: new List<GraphNode>(nodes.Values),
            Edges: edges);
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
