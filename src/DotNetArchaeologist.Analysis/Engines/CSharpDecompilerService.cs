using System;
using System.IO;
using System.Linq;
using System.Reflection.PortableExecutable;
using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Core.Contracts;
using ICSharpCode.Decompiler;
using ICSharpCode.Decompiler.CSharp;
using ICSharpCode.Decompiler.Metadata;
using ICSharpCode.Decompiler.TypeSystem;

namespace DotNetArchaeologist.Analysis.Engines;

/// <summary>
/// Implementazione del motore di decompilazione C# basato su ICSharpCode.Decompiler (ILSpy).
/// Esegue la decompilazione in memoria e in sicurezza, senza dipendenze native esterne e senza esecuzione del binario.
/// </summary>
public sealed class CSharpDecompilerService : IDecompilerService
{
    private static readonly DecompilerSettings DefaultSettings = new(ICSharpCode.Decompiler.CSharp.LanguageVersion.Latest)
    {
        ThrowOnAssemblyResolveErrors = false,
        ShowXmlDocumentation = true,
        AlwaysShowEnumMemberValues = true,
        AutomaticProperties = true,
        AnonymousMethods = true,
        AsyncAwait = true,
        ExpressionTrees = true,
        ArrayInitializers = true
    };

    public Task<string> DecompileTypeAsync(
        Stream peStream,
        string typeFullName,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(peStream);
        ArgumentException.ThrowIfNullOrWhiteSpace(typeFullName);

        cancellationToken.ThrowIfCancellationRequested();

        if (peStream.CanSeek)
        {
            peStream.Seek(0, SeekOrigin.Begin);
        }

        using var peFile = new PEFile("analysis-target.dll", peStream, PEStreamOptions.LeaveOpen);
        var resolver = new UniversalAssemblyResolver(null, throwOnError: false, targetFramework: null);
        var decompiler = new CSharpDecompiler(peFile, resolver, DefaultSettings);

        var fullTypeName = new FullTypeName(typeFullName);
        var typeDefinition = decompiler.TypeSystem.FindType(fullTypeName).GetDefinition();

        if (typeDefinition == null)
        {
            throw new InvalidOperationException($"Il tipo specificato '{typeFullName}' non è stato trovato nei metadati dell'assembly.");
        }

        cancellationToken.ThrowIfCancellationRequested();

        var output = decompiler.DecompileTypeAsString(fullTypeName);
        return Task.FromResult(output);
    }

    public Task<string> DecompileMethodAsync(
        Stream peStream,
        string typeFullName,
        string methodName,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(peStream);
        ArgumentException.ThrowIfNullOrWhiteSpace(typeFullName);
        ArgumentException.ThrowIfNullOrWhiteSpace(methodName);

        cancellationToken.ThrowIfCancellationRequested();

        if (peStream.CanSeek)
        {
            peStream.Seek(0, SeekOrigin.Begin);
        }

        using var peFile = new PEFile("analysis-target.dll", peStream, PEStreamOptions.LeaveOpen);
        var resolver = new UniversalAssemblyResolver(null, throwOnError: false, targetFramework: null);
        var decompiler = new CSharpDecompiler(peFile, resolver, DefaultSettings);

        var fullTypeName = new FullTypeName(typeFullName);
        var typeDefinition = decompiler.TypeSystem.FindType(fullTypeName).GetDefinition();

        if (typeDefinition == null)
        {
            throw new InvalidOperationException($"Il tipo specificato '{typeFullName}' non è stato trovato nei metadati dell'assembly.");
        }

        var method = typeDefinition.Methods.FirstOrDefault(m => m.Name.Equals(methodName, StringComparison.Ordinal));
        if (method == null)
        {
            throw new InvalidOperationException(
                $"Il metodo '{methodName}' non è stato trovato all'interno del tipo '{typeFullName}'.");
        }

        cancellationToken.ThrowIfCancellationRequested();

        var output = decompiler.DecompileAsString(method.MetadataToken);
        return Task.FromResult(output);
    }

    public Task<string> DecompileWholeAssemblyAsync(
        Stream peStream,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(peStream);

        cancellationToken.ThrowIfCancellationRequested();

        if (peStream.CanSeek)
        {
            peStream.Seek(0, SeekOrigin.Begin);
        }

        using var peFile = new PEFile("analysis-target.dll", peStream, PEStreamOptions.LeaveOpen);
        var resolver = new UniversalAssemblyResolver(null, throwOnError: false, targetFramework: null);
        var decompiler = new CSharpDecompiler(peFile, resolver, DefaultSettings);

        cancellationToken.ThrowIfCancellationRequested();

        var output = decompiler.DecompileWholeModuleAsString();
        return Task.FromResult(output);
    }
}
