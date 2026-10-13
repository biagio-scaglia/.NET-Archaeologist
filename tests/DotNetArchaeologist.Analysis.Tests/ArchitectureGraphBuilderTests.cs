using System.Linq;
using System.Threading.Tasks;
using DotNetArchaeologist.Analysis.Engines;
using DotNetArchaeologist.Analysis.Tests.Helpers;
using DotNetArchaeologist.Core.Domain;
using Xunit;

namespace DotNetArchaeologist.Analysis.Tests;

public sealed class ArchitectureGraphBuilderTests
{
    private readonly MetadataAssemblyInspector _inspector = new();
    private readonly ArchitectureGraphBuilder _graphBuilder = new();

    [Fact]
    public async Task BuildGraph_GeneratesNodesAndEdgesProperly()
    {
        const string source = """
            namespace ArchitectureSample;

            public interface IProcessor
            {
                void Process();
            }

            public class BaseProcessor
            {
            }

            public class ConcreteProcessor : BaseProcessor, IProcessor
            {
                public void Process() {}
            }
            """;

        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(source, "ArchitectureSampleAssembly");
        var descriptor = await _inspector.InspectAsync(stream, "ArchitectureSampleAssembly.dll");

        var graph = _graphBuilder.BuildGraph(descriptor);

        Assert.NotNull(graph);
        Assert.True(graph.TotalNodes >= 4); // Assembly + Namespace + 3 tipi (o base)
        Assert.True(graph.TotalEdges >= 3);

        // Verifica presenza nodo Assembly
        var asmNode = graph.Nodes.FirstOrDefault(n => n.Kind == "Assembly");
        Assert.NotNull(asmNode);
        Assert.Equal("ArchitectureSampleAssembly", asmNode.Label);

        // Verifica presenza archi di ereditarietà
        var inheritsEdge = graph.Edges.FirstOrDefault(e => e.Relation == RelationKind.Inherits);
        Assert.NotNull(inheritsEdge);
        Assert.Contains("ConcreteProcessor", inheritsEdge.Source);
        Assert.Contains("BaseProcessor", inheritsEdge.Target);

        // Verifica presenza archi di interfaccia
        var implementsEdge = graph.Edges.FirstOrDefault(e => e.Relation == RelationKind.Implements);
        Assert.NotNull(implementsEdge);
        Assert.Contains("ConcreteProcessor", implementsEdge.Source);
        Assert.Contains("IProcessor", implementsEdge.Target);
    }

    [Fact]
    public async Task BuildGraph_ExtractsMemberReferencesAndRespectsOptions()
    {
        const string source = """
            namespace OrderSystem;

            public class Customer
            {
                public string Name { get; set; }
            }

            public class OrderService
            {
                private Customer _cachedCustomer;

                public Customer ProcessOrder(Customer customer, int orderId)
                {
                    _cachedCustomer = customer;
                    return customer;
                }
            }
            """;

        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(source, "OrderSystemAssembly");
        var descriptor = await _inspector.InspectAsync(stream, "OrderSystemAssembly.dll");

        // Con opzioni predefinite (IncludeMemberReferences = true)
        var graph = _graphBuilder.BuildGraph(descriptor);

        Assert.NotNull(graph);
        var refEdges = graph.Edges.Where(e => e.Relation == RelationKind.References).ToList();
        Assert.NotEmpty(refEdges);
        Assert.Contains(refEdges, e => e.Source.Contains("OrderService") && e.Target.Contains("Customer"));

        // Con IncludeMemberReferences = false
        var optionsWithoutRefs = new ArchitectureGraphOptions(IncludeMemberReferences: false);
        var graphWithoutRefs = _graphBuilder.BuildGraph(descriptor, optionsWithoutRefs);
        Assert.DoesNotContain(graphWithoutRefs.Edges, e => e.Relation == RelationKind.References);
    }
}
