using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Analysis.Engines;
using DotNetArchaeologist.Analysis.Tests.Helpers;
using DotNetArchaeologist.Core.Domain;
using Xunit;

namespace DotNetArchaeologist.Analysis.Tests;

public sealed class MetadataAssemblyInspectorTests
{
    private readonly MetadataAssemblyInspector _inspector = new();

    [Fact]
    public async Task InspectAsync_ExtractsTypesAndInheritanceCorrectly()
    {
        const string source = """
            namespace SampleApp;

            public interface ICustomService
            {
                void Execute();
            }

            public class BaseWorker
            {
                public virtual void Work() {}
            }

            public class CustomWorker : BaseWorker, ICustomService
            {
                public void Execute() {}
                public override void Work() {}
            }

            public struct Point2D
            {
                public int X;
                public int Y;
            }

            public enum Status
            {
                Pending,
                Completed
            }

            public record UserRecord(string Name, int Age);
            """;

        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(source, "SampleAppFixture");

        var descriptor = await _inspector.InspectAsync(stream, "SampleAppFixture.dll");

        Assert.Equal("SampleAppFixture", descriptor.Name);
        Assert.NotEmpty(descriptor.Types);

        // Verifica interfaccia
        var iface = descriptor.Types.FirstOrDefault(t => t.Name == "ICustomService");
        Assert.NotNull(iface);
        Assert.Equal(TypeKind.Interface, iface.Kind);
        Assert.True(iface.IsAbstract);

        // Verifica classe base
        var baseWorker = descriptor.Types.FirstOrDefault(t => t.Name == "BaseWorker");
        Assert.NotNull(baseWorker);
        Assert.Equal(TypeKind.Class, baseWorker.Kind);

        // Verifica classe derivata con ereditarietà e interfaccia
        var worker = descriptor.Types.FirstOrDefault(t => t.Name == "CustomWorker");
        Assert.NotNull(worker);
        Assert.Equal(TypeKind.Class, worker.Kind);
        Assert.Equal("SampleApp.BaseWorker", worker.BaseTypeFullName);
        Assert.Contains("SampleApp.ICustomService", worker.ImplementedInterfaces);

        // Verifica struct
        var point = descriptor.Types.FirstOrDefault(t => t.Name == "Point2D");
        Assert.NotNull(point);
        Assert.Equal(TypeKind.Struct, point.Kind);

        // Verifica enum
        var status = descriptor.Types.FirstOrDefault(t => t.Name == "Status");
        Assert.NotNull(status);
        Assert.Equal(TypeKind.Enum, status.Kind);

        // Verifica record
        var userRecord = descriptor.Types.FirstOrDefault(t => t.Name == "UserRecord");
        Assert.NotNull(userRecord);
        Assert.Equal(TypeKind.Record, userRecord.Kind);
    }

    [Fact]
    public async Task InspectAsync_ExtractsNestedTypesAndMembersCorrectly()
    {
        const string source = """
            namespace NestingTest;

            public class Container
            {
                public static readonly int StaticField = 100;

                public class NestedPublicClass
                {
                    public void SubMethod() {}
                }

                private class NestedPrivateClass
                {
                    public int InnerValue;
                }
            }
            """;

        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(source, "NestingTestFixture");

        var descriptor = await _inspector.InspectAsync(stream, "NestingTestFixture.dll");

        var container = descriptor.Types.FirstOrDefault(t => t.Name == "Container");
        Assert.NotNull(container);
        Assert.False(container.IsNested);

        // Verifica membri del container (campo statico presente)
        var staticField = container.Members.FirstOrDefault(m => m.Name == "StaticField");
        Assert.NotNull(staticField);
        Assert.True(staticField.IsStatic);

        // Verifica nested classes
        var nestedPublic = descriptor.Types.FirstOrDefault(t => t.Name == "NestedPublicClass");
        Assert.NotNull(nestedPublic);
        Assert.True(nestedPublic.IsNested);
        Assert.Equal(AccessibilityModifier.NestedPublic, nestedPublic.Accessibility);

        var nestedPrivate = descriptor.Types.FirstOrDefault(t => t.Name == "NestedPrivateClass");
        Assert.NotNull(nestedPrivate);
        Assert.True(nestedPrivate.IsNested);
        Assert.Equal(AccessibilityModifier.NestedPrivate, nestedPrivate.Accessibility);
    }

    [Fact]
    public async Task InspectAsync_SupportsGlobalNamespaceTypes()
    {
        const string source = """
            public class TopLevelClass
            {
                public void Run() {}
            }
            """;

        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(source, "GlobalNsFixture");
        var descriptor = await _inspector.InspectAsync(stream, "GlobalNsFixture.dll");

        var topClass = descriptor.Types.FirstOrDefault(t => t.Name == "TopLevelClass");
        Assert.NotNull(topClass);
        Assert.Equal(string.Empty, topClass.Namespace);
        Assert.Equal("TopLevelClass", topClass.FullName);
    }

    [Fact]
    public async Task InspectAsync_RespectsCancellationToken()
    {
        const string source = "public class Empty {}";
        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(source, "CancelFixture");

        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            _inspector.InspectAsync(stream, "CancelFixture.dll", cts.Token));
    }

    [Fact]
    public async Task InspectAsync_ZeroExecutionGuarantee_DoesNotLoadAssemblyIntoCurrentAppDomain()
    {
        const string assemblyName = "IsolatedSecurityCheckAssembly";
        const string source = """
            namespace SecurityTest;
            public class UntrustedPayload
            {
                public static int Value = 42;
            }
            """;

        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(source, assemblyName);

        // Ispezione dell'assembly
        var descriptor = await _inspector.InspectAsync(stream, $"{assemblyName}.dll");

        Assert.Equal(assemblyName, descriptor.Name);

        // Verifica che l'assembly NON sia stato caricato a runtime in AppDomain
        var loadedAssemblies = AppDomain.CurrentDomain.GetAssemblies();
        Assert.DoesNotContain(loadedAssemblies, a => a.GetName().Name == assemblyName);
    }

    [Fact]
    public async Task InspectAsync_ThrowsWhenStreamIsNotManagedAssembly()
    {
        var randomBytes = new byte[1024];
        new Random(42).NextBytes(randomBytes);
        using var stream = new MemoryStream(randomBytes);

        await Assert.ThrowsAnyAsync<Exception>(() => _inspector.InspectAsync(stream, "corrupt.dll"));
    }

    [Fact]
    public async Task InspectFileAsync_ThrowsWhenFileNotFound()
    {
        await Assert.ThrowsAsync<FileNotFoundException>(() =>
            _inspector.InspectFileAsync("non_existent_file_path_xyz.dll"));
    }
}
