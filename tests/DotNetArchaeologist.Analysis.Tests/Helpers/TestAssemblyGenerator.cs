using System;
using System.IO;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace DotNetArchaeologist.Analysis.Tests.Helpers;

/// <summary>
/// Helper per la generazione di assembly .NET in-memory di prova tramite Roslyn.
/// Consente di testare l'ispezione statica su scenari realistici senza dipendere da file binari
/// archiviati nel repository Git e nel rispetto rigoroso di Zero-Execution.
/// </summary>
public static class TestAssemblyGenerator
{
    public static MemoryStream CreateAssemblyStream(string sourceCode, string assemblyName = "TestFixtureAssembly")
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(sourceCode);

        // Aggiungiamo i metadati base della BCL
        var coreDir = Path.GetDirectoryName(typeof(object).Assembly.Location)!;
        var references = new MetadataReference[]
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(Path.Combine(coreDir, "System.Runtime.dll")),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Enumerable).Assembly.Location)
        };

        var compilation = CSharpCompilation.Create(
            assemblyName,
            new[] { syntaxTree },
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                optimizationLevel: OptimizationLevel.Release));

        var ms = new MemoryStream();
        var emitResult = compilation.Emit(ms);

        if (!emitResult.Success)
        {
            var failures = string.Join(Environment.NewLine,
                emitResult.Diagnostics
                    .Where(d => d.Severity == DiagnosticSeverity.Error)
                    .Select(d => d.GetMessage()));

            throw new InvalidOperationException($"Compilazione di test fallita:{Environment.NewLine}{failures}");
        }

        ms.Seek(0, SeekOrigin.Begin);
        return ms;
    }
}
