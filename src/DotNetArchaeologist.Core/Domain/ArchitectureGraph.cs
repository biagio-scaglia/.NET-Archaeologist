using System.Collections.Generic;

namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Tipologia di relazione strutturale nel grafo architetturale.
/// </summary>
public enum RelationKind
{
    Inherits,
    Implements,
    References,
    Calls,
    Declares
}

/// <summary>
/// Nodo rappresentante un elemento del sistema nel grafo architetturale (Assembly, Namespace, Tipo, ecc.).
/// </summary>
public sealed record GraphNode(
    string Id,
    string Label,
    string Kind,
    string? Namespace,
    IReadOnlyDictionary<string, string> Metadata);

/// <summary>
/// Arco orientato che collega due nodi nel grafo architetturale.
/// </summary>
public sealed record GraphEdge(
    string Id,
    string Source,
    string Target,
    RelationKind Relation,
    string Label);

/// <summary>
/// Rappresenta il grafo complessivo dell'architettura estratta da uno o più assembly.
/// </summary>
public sealed record ArchitectureGraph(
    IReadOnlyList<GraphNode> Nodes,
    IReadOnlyList<GraphEdge> Edges)
{
    public int TotalNodes => Nodes.Count;
    public int TotalEdges => Edges.Count;
}
