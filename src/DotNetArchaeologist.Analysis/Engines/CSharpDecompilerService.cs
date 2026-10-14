using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text;
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
/// Supporta .NET Framework 4.0, 4.5, 4.8 e .NET Moderno (Core / 8+).
/// Garantisce tolleranza a referenze esterne mancanti e risoluzione sicura via MetadataToken.
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
        var resolver = CreateRobustAssemblyResolver(peFile);
        var decompiler = new CSharpDecompiler(peFile, resolver, DefaultSettings);

        // Risoluzione prima via TypeDefinitionHandle diretto (robusto per tipi annidati e generici)
        var typeHandle = FindTypeDefinitionHandle(peFile.Metadata, typeFullName);
        if (!typeHandle.IsNil)
        {
            try
            {
                var code = decompiler.DecompileAsString(typeHandle);
                return Task.FromResult(code);
            }
            catch (Exception ex)
            {
                return Task.FromResult(GenerateMetadataFallbackSource(peFile.Metadata, typeHandle, typeFullName, ex));
            }
        }

        // Tentativo secondario via TypeSystem e FullTypeName
        try
        {
            var cleanTypeName = typeFullName.Replace('+', '/');
            var fullTypeName = new FullTypeName(cleanTypeName);
            var typeDefinition = decompiler.TypeSystem.FindType(fullTypeName).GetDefinition();

            if (typeDefinition != null)
            {
                var code = decompiler.DecompileTypeAsString(fullTypeName);
                return Task.FromResult(code);
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult($"// Errore durante la decompilazione del tipo '{typeFullName}': {ex.Message}");
        }

        throw new InvalidOperationException($"Il tipo specificato '{typeFullName}' non è stato trovato nei metadati dell'assembly.");
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
        var resolver = CreateRobustAssemblyResolver(peFile);
        var decompiler = new CSharpDecompiler(peFile, resolver, DefaultSettings);

        var typeHandle = FindTypeDefinitionHandle(peFile.Metadata, typeFullName);
        if (!typeHandle.IsNil)
        {
            var typeDef = peFile.Metadata.GetTypeDefinition(typeHandle);
            foreach (var methodHandle in typeDef.GetMethods())
            {
                var methodDef = peFile.Metadata.GetMethodDefinition(methodHandle);
                var currentMethodName = peFile.Metadata.GetString(methodDef.Name);

                if (currentMethodName.Equals(methodName, StringComparison.Ordinal))
                {
                    try
                    {
                        var code = decompiler.DecompileAsString(methodHandle);
                        return Task.FromResult(code);
                    }
                    catch (Exception ex)
                    {
                        return Task.FromResult($"// Errore decompilazione metodo '{methodName}': {ex.Message}\n// Firma: {currentMethodName}");
                    }
                }
            }
        }

        throw new InvalidOperationException(
            $"Il metodo '{methodName}' non è stato trovato all'interno del tipo '{typeFullName}'.");
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
        var resolver = CreateRobustAssemblyResolver(peFile);
        var decompiler = new CSharpDecompiler(peFile, resolver, DefaultSettings);

        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            var output = decompiler.DecompileWholeModuleAsString();
            return Task.FromResult(output);
        }
        catch (Exception ex)
        {
            return Task.FromResult($"// Errore durante la decompilazione dell'intero modulo: {ex.Message}");
        }
    }

    private static UniversalAssemblyResolver CreateRobustAssemblyResolver(PEFile peFile)
    {
        string? targetFramework = null;
        try
        {
            targetFramework = peFile.DetectTargetFrameworkId();
        }
        catch
        {
            // Ignora fallimento su assembly non standard
        }

        var resolver = new UniversalAssemblyResolver(
            mainAssemblyFileName: null,
            throwOnError: false,
            targetFramework: targetFramework);

        // Aggiunge percorsi noti per .NET Framework 4.x legacy di Windows se presenti (pre-verificati staticamente)
        foreach (var path in ExistingFrameworkPaths)
        {
            try
            {
                resolver.AddSearchDirectory(path);
            }
            catch
            {
                // Ignora
            }
        }

        return resolver;
    }

    private static readonly IReadOnlyList<string> ExistingFrameworkPaths = InitializeExistingFrameworkPaths();

    private static IReadOnlyList<string> InitializeExistingFrameworkPaths()
    {
        var candidates = new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Microsoft.NET", "Framework", "v4.0.30319"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "Microsoft.NET", "Framework64", "v4.0.30319"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Reference Assemblies", "Microsoft", "Framework", ".NETFramework", "v4.8"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Reference Assemblies", "Microsoft", "Framework", ".NETFramework", "v4.5"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Reference Assemblies", "Microsoft", "Framework", ".NETFramework", "v4.0")
        };

        var valid = new List<string>(candidates.Length);
        foreach (var path in candidates)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    valid.Add(path);
                }
            }
            catch
            {
                // Ignora
            }
        }

        return valid;
    }

    private static TypeDefinitionHandle FindTypeDefinitionHandle(MetadataReader reader, string targetFullName)
    {
        // Normalizza sintassi nomi annidati (. e +)
        var normalizedTarget = targetFullName.Replace('+', '.');

        foreach (var handle in reader.TypeDefinitions)
        {
            var typeDef = reader.GetTypeDefinition(handle);
            var name = reader.GetString(typeDef.Name);
            var ns = reader.GetString(typeDef.Namespace);

            var currentFullName = string.IsNullOrEmpty(ns) ? name : $"{ns}.{name}";
            currentFullName = currentFullName.Replace('+', '.');

            if (currentFullName.Equals(normalizedTarget, StringComparison.Ordinal) ||
                name.Equals(targetFullName, StringComparison.Ordinal))
            {
                return handle;
            }
        }

        return default;
    }

    private static string GenerateMetadataFallbackSource(
        MetadataReader reader,
        TypeDefinitionHandle handle,
        string typeFullName,
        Exception innerEx)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"// [AVVISO DECOMPILATORE] Decompilazione IL parziale: {innerEx.Message}");
        sb.AppendLine($"// Ricostruzione della struttura del tipo dai metadati ECMA-335:");
        sb.AppendLine();

        var typeDef = reader.GetTypeDefinition(handle);
        var name = reader.GetString(typeDef.Name);
        var ns = reader.GetString(typeDef.Namespace);

        if (!string.IsNullOrEmpty(ns))
        {
            sb.AppendLine($"namespace {ns}");
            sb.AppendLine("{");
        }

        sb.AppendLine($"    // Definizione tipo: {name}");
        sb.AppendLine($"    public class {name}");
        sb.AppendLine("    {");

        foreach (var mHandle in typeDef.GetMethods())
        {
            var mDef = reader.GetMethodDefinition(mHandle);
            var mName = reader.GetString(mDef.Name);
            sb.AppendLine($"        public void {mName}(); // Metodo rilevato nei metadati");
        }

        sb.AppendLine("    }");

        if (!string.IsNullOrEmpty(ns))
        {
            sb.AppendLine("}");
        }

        return sb.ToString();
    }
}
