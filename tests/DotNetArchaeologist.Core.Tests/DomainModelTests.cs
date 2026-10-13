using System;
using System.Collections.Generic;
using DotNetArchaeologist.Core.Domain;
using Xunit;

namespace DotNetArchaeologist.Core.Tests;

public sealed class DomainModelTests
{
    [Fact]
    public void AssemblyDescriptor_CalculatesTotalTypesCountCorrectly()
    {
        var dummyType = new TypeDescriptor(
            FullName: "Sample.MyClass",
            Namespace: "Sample",
            Name: "MyClass",
            Kind: TypeKind.Class,
            Accessibility: AccessibilityModifier.Public,
            IsAbstract: false,
            IsSealed: false,
            IsStatic: false,
            IsNested: false,
            BaseTypeFullName: "System.Object",
            ImplementedInterfaces: Array.Empty<string>(),
            Members: Array.Empty<MemberDescriptor>(),
            Attributes: Array.Empty<string>());

        var descriptor = new AssemblyDescriptor(
            Name: "SampleAssembly",
            Version: new Version(1, 0, 0, 0),
            Culture: null,
            PublicKeyToken: null,
            TargetFramework: ".NETCoreApp,Version=v8.0",
            Mvid: Guid.NewGuid(),
            References: Array.Empty<AssemblyReferenceDescriptor>(),
            Types: new List<TypeDescriptor> { dummyType });

        Assert.Equal(1, descriptor.TotalTypesCount);
        Assert.Equal("SampleAssembly", descriptor.Name);
    }

    [Fact]
    public void TypeDescriptor_FiltersMembersByKindCorrectly()
    {
        var method = new MemberDescriptor(
            Name: "Calculate",
            Kind: MemberKind.Method,
            ReturnTypeOrType: "int",
            Accessibility: AccessibilityModifier.Public,
            IsStatic: false,
            IsVirtual: false,
            IsAbstract: false,
            Parameters: Array.Empty<ParameterDescriptor>(),
            Attributes: Array.Empty<string>());

        var constructor = new MemberDescriptor(
            Name: ".ctor",
            Kind: MemberKind.Constructor,
            ReturnTypeOrType: "void",
            Accessibility: AccessibilityModifier.Public,
            IsStatic: false,
            IsVirtual: false,
            IsAbstract: false,
            Parameters: Array.Empty<ParameterDescriptor>(),
            Attributes: Array.Empty<string>());

        var field = new MemberDescriptor(
            Name: "_value",
            Kind: MemberKind.Field,
            ReturnTypeOrType: "int",
            Accessibility: AccessibilityModifier.Private,
            IsStatic: false,
            IsVirtual: false,
            IsAbstract: false,
            Parameters: Array.Empty<ParameterDescriptor>(),
            Attributes: Array.Empty<string>());

        var property = new MemberDescriptor(
            Name: "Value",
            Kind: MemberKind.Property,
            ReturnTypeOrType: "int",
            Accessibility: AccessibilityModifier.Public,
            IsStatic: false,
            IsVirtual: false,
            IsAbstract: false,
            Parameters: Array.Empty<ParameterDescriptor>(),
            Attributes: Array.Empty<string>());

        var type = new TypeDescriptor(
            FullName: "Sample.MyEntity",
            Namespace: "Sample",
            Name: "MyEntity",
            Kind: TypeKind.Class,
            Accessibility: AccessibilityModifier.Public,
            IsAbstract: false,
            IsSealed: false,
            IsStatic: false,
            IsNested: false,
            BaseTypeFullName: "System.Object",
            ImplementedInterfaces: Array.Empty<string>(),
            Members: new[] { method, constructor, field, property },
            Attributes: Array.Empty<string>());

        Assert.Equal(2, System.Linq.Enumerable.Count(type.GetMethods())); // metodo + ctor
        Assert.Single(type.GetFields());
        Assert.Single(type.GetProperties());
    }

    [Fact]
    public void ArchitectureGraph_ComputesTotalsCorrectly()
    {
        var node1 = new GraphNode("n1", "Node 1", "Class", "Ns", new Dictionary<string, string>());
        var node2 = new GraphNode("n2", "Node 2", "Interface", "Ns", new Dictionary<string, string>());

        var edge = new GraphEdge("e1", "n1", "n2", RelationKind.Implements, "implements");

        var graph = new ArchitectureGraph(new[] { node1, node2 }, new[] { edge });

        Assert.Equal(2, graph.TotalNodes);
        Assert.Equal(1, graph.TotalEdges);
    }
}
