using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Core.Contracts;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Analysis.Engines;

/// <summary>
/// Motore di ispezione basato su System.Reflection.Metadata e PEReader.
/// Garantisce Zero-Execution: esamina i metadati ECMA-335 come stream di byte passivo
/// senza mai caricare l'assembly in un contesto di esecuzione a runtime.
/// </summary>
public sealed class MetadataAssemblyInspector : IAssemblyInspector
{
    public async Task<AssemblyDescriptor> InspectFileAsync(
        string filePath,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(filePath);

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"File dell'assembly non trovato: {filePath}", filePath);
        }

        await using var fileStream = new FileStream(
            filePath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 4096,
            useAsync: true);

        return await InspectAsync(fileStream, Path.GetFileName(filePath), cancellationToken).ConfigureAwait(false);
    }

    public Task<AssemblyDescriptor> InspectAsync(
        Stream peStream,
        string? sourceIdentifier = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(peStream);

        if (!peStream.CanRead)
        {
            throw new ArgumentException("Lo stream fornito deve essere leggibile.", nameof(peStream));
        }

        cancellationToken.ThrowIfCancellationRequested();

        // MemoryStream o stream originale posizionato all'inizio
        if (peStream.CanSeek)
        {
            peStream.Seek(0, SeekOrigin.Begin);
        }

        using var peReader = new PEReader(peStream, PEStreamOptions.LeaveOpen);

        if (!peReader.HasMetadata)
        {
            throw new InvalidOperationException(
                $"Il target specificato '{(sourceIdentifier ?? "stream")}' non contiene metadati .NET (nessuna intestazione CLI trovata).");
        }

        var metadataReader = peReader.GetMetadataReader();

        // Lettura AssemblyDefinition
        var assemblyDef = metadataReader.IsAssembly
            ? metadataReader.GetAssemblyDefinition()
            : throw new InvalidOperationException("Nessuna definizione di assembly valida trovata nei metadati CLI.");

        var assemblyName = metadataReader.GetString(assemblyDef.Name);
        var version = assemblyDef.Version;
        var culture = assemblyDef.Culture.IsNil ? null : metadataReader.GetString(assemblyDef.Culture);
        var publicKeyToken = FormatPublicKeyToken(metadataReader.GetBlobBytes(assemblyDef.PublicKey));

        // MVID (Module Version ID) dal primo modulo
        var moduleDef = metadataReader.GetModuleDefinition();
        var mvid = metadataReader.GetGuid(moduleDef.Mvid);

        // Target framework estratto dagli attributi personalizzati dell'assembly
        var targetFramework = ExtractTargetFramework(metadataReader, assemblyDef);

        // Estrazione Assembly References
        var references = new List<AssemblyReferenceDescriptor>();
        foreach (var handle in metadataReader.AssemblyReferences)
        {
            var reference = metadataReader.GetAssemblyReference(handle);
            var refName = metadataReader.GetString(reference.Name);
            var refVersion = reference.Version;
            var refCulture = reference.Culture.IsNil ? null : metadataReader.GetString(reference.Culture);
            var refKeyToken = FormatPublicKeyToken(metadataReader.GetBlobBytes(reference.PublicKeyOrToken));

            references.Add(new AssemblyReferenceDescriptor(refName, refVersion, refCulture, refKeyToken));
        }

        // Estrazione TypeDefinitions
        var types = new List<TypeDescriptor>();
        foreach (var typeHandle in metadataReader.TypeDefinitions)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var typeDef = metadataReader.GetTypeDefinition(typeHandle);
            var typeName = metadataReader.GetString(typeDef.Name);
            var typeNamespace = typeDef.Namespace.IsNil ? string.Empty : metadataReader.GetString(typeDef.Namespace);

            // Ignoriamo il tipo speciale CLI di livello modulo
            if (typeName == "<Module>")
            {
                continue;
            }

            var fullName = string.IsNullOrEmpty(typeNamespace)
                ? typeName
                : $"{typeNamespace}.{typeName}";

            var baseTypeFullName = ResolveEntityName(metadataReader, typeDef.BaseType);
            var kind = DetermineTypeKind(metadataReader, typeDef, baseTypeFullName);
            var accessibility = DetermineAccessibility(typeDef.Attributes);

            var isAbstract = typeDef.Attributes.HasFlag(TypeAttributes.Abstract);
            var isSealed = typeDef.Attributes.HasFlag(TypeAttributes.Sealed);
            var isStatic = isAbstract && isSealed;
            var isNested = typeDef.IsNested;

            // Interfacce implementate
            var implementedInterfaces = new List<string>();
            foreach (var ifaceHandle in typeDef.GetInterfaceImplementations())
            {
                var iface = metadataReader.GetInterfaceImplementation(ifaceHandle);
                var ifaceName = ResolveEntityName(metadataReader, iface.Interface);
                if (!string.IsNullOrEmpty(ifaceName))
                {
                    implementedInterfaces.Add(ifaceName);
                }
            }

            // Membri (Metodi e Costruttori)
            var members = new List<MemberDescriptor>();
            foreach (var methodHandle in typeDef.GetMethods())
            {
                var methodDef = metadataReader.GetMethodDefinition(methodHandle);
                var methodName = metadataReader.GetString(methodDef.Name);

                var isConstructor = methodName is ".ctor" or ".cctor";
                var memberKind = isConstructor ? MemberKind.Constructor : MemberKind.Method;

                var isMethodStatic = methodDef.Attributes.HasFlag(MethodAttributes.Static);
                var isMethodVirtual = methodDef.Attributes.HasFlag(MethodAttributes.Virtual);
                var isMethodAbstract = methodDef.Attributes.HasFlag(MethodAttributes.Abstract);
                var methodAccessibility = DetermineMethodAccessibility(methodDef.Attributes);

                var parameters = new List<ParameterDescriptor>();
                foreach (var paramHandle in methodDef.GetParameters())
                {
                    var param = metadataReader.GetParameter(paramHandle);
                    var paramName = param.Name.IsNil ? $"p{param.SequenceNumber}" : metadataReader.GetString(param.Name);
                    parameters.Add(new ParameterDescriptor(
                        paramName,
                        "unknown", // signature decoding dettagliata estendibile
                        param.SequenceNumber,
                        param.Attributes.HasFlag(ParameterAttributes.In),
                        param.Attributes.HasFlag(ParameterAttributes.Out),
                        param.Attributes.HasFlag(ParameterAttributes.HasDefault)));
                }

                members.Add(new MemberDescriptor(
                    methodName,
                    memberKind,
                    "void",
                    methodAccessibility,
                    isMethodStatic,
                    isMethodVirtual,
                    isMethodAbstract,
                    parameters,
                    Array.Empty<string>()));
            }

            // Membri (Campi)
            foreach (var fieldHandle in typeDef.GetFields())
            {
                var fieldDef = metadataReader.GetFieldDefinition(fieldHandle);
                var fieldName = metadataReader.GetString(fieldDef.Name);
                var isFieldStatic = fieldDef.Attributes.HasFlag(FieldAttributes.Static);
                var fieldAccessibility = DetermineFieldAccessibility(fieldDef.Attributes);

                members.Add(new MemberDescriptor(
                    fieldName,
                    MemberKind.Field,
                    "unknown",
                    fieldAccessibility,
                    isFieldStatic,
                    IsVirtual: false,
                    IsAbstract: false,
                    Array.Empty<ParameterDescriptor>(),
                    Array.Empty<string>()));
            }

            types.Add(new TypeDescriptor(
                fullName,
                typeNamespace,
                typeName,
                kind,
                accessibility,
                isAbstract,
                isSealed,
                isStatic,
                isNested,
                baseTypeFullName,
                implementedInterfaces,
                members,
                Array.Empty<string>()));
        }

        var descriptor = new AssemblyDescriptor(
            assemblyName,
            version,
            culture,
            publicKeyToken,
            targetFramework,
            mvid,
            references,
            types);

        return Task.FromResult(descriptor);
    }

    private static string? FormatPublicKeyToken(byte[]? bytes)
    {
        if (bytes == null || bytes.Length == 0)
        {
            return null;
        }

        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string? ExtractTargetFramework(MetadataReader reader, AssemblyDefinition assemblyDef)
    {
        foreach (var handle in assemblyDef.GetCustomAttributes())
        {
            var attribute = reader.GetCustomAttribute(handle);
            var constructorEntity = ResolveEntityName(reader, attribute.Constructor);
            if (constructorEntity != null && constructorEntity.Contains("TargetFrameworkAttribute", StringComparison.Ordinal))
            {
                try
                {
                    var blobReader = reader.GetBlobReader(attribute.Value);
                    if (blobReader.Length >= 4 && blobReader.ReadUInt16() == 1) // Prologo custom attribute (0x0001)
                    {
                        return blobReader.ReadSerializedString();
                    }
                }
                catch
                {
                    // In caso di blob non standard, fallback silenzioso
                }
            }
        }

        return null;
    }

    private static TypeKind DetermineTypeKind(
        MetadataReader reader,
        TypeDefinition typeDef,
        string? baseTypeFullName)
    {
        if (typeDef.Attributes.HasFlag(TypeAttributes.Interface))
        {
            return TypeKind.Interface;
        }

        if (baseTypeFullName != null)
        {
            if (baseTypeFullName.Equals("System.Enum", StringComparison.Ordinal))
            {
                return TypeKind.Enum;
            }

            if (baseTypeFullName.Equals("System.ValueType", StringComparison.Ordinal))
            {
                return TypeKind.Struct;
            }

            if (baseTypeFullName.Equals("System.MulticastDelegate", StringComparison.Ordinal) ||
                baseTypeFullName.Equals("System.Delegate", StringComparison.Ordinal))
            {
                return TypeKind.Delegate;
            }
        }

        // Rilevamento Record C# (presenza del metodo <Clone>$ o IEquatable<Self>)
        var typeName = reader.GetString(typeDef.Name);
        foreach (var methodHandle in typeDef.GetMethods())
        {
            var methodDef = reader.GetMethodDefinition(methodHandle);
            var methodName = reader.GetString(methodDef.Name);
            if (methodName.Equals("<Clone>$", StringComparison.Ordinal))
            {
                return TypeKind.Record;
            }
        }

        return TypeKind.Class;
    }

    private static AccessibilityModifier DetermineAccessibility(TypeAttributes attributes)
    {
        var visibility = attributes & TypeAttributes.VisibilityMask;
        return visibility switch
        {
            TypeAttributes.Public => AccessibilityModifier.Public,
            TypeAttributes.NotPublic => AccessibilityModifier.Internal,
            TypeAttributes.NestedPublic => AccessibilityModifier.NestedPublic,
            TypeAttributes.NestedPrivate => AccessibilityModifier.NestedPrivate,
            TypeAttributes.NestedFamily => AccessibilityModifier.NestedFamily,
            TypeAttributes.NestedAssembly => AccessibilityModifier.NestedAssembly,
            TypeAttributes.NestedFamANDAssem => AccessibilityModifier.NestedFamilyAndAssembly,
            TypeAttributes.NestedFamORAssem => AccessibilityModifier.NestedFamilyOrAssembly,
            _ => AccessibilityModifier.Unknown
        };
    }

    private static AccessibilityModifier DetermineMethodAccessibility(MethodAttributes attributes)
    {
        var access = attributes & MethodAttributes.MemberAccessMask;
        return access switch
        {
            MethodAttributes.Private => AccessibilityModifier.Private,
            MethodAttributes.Public => AccessibilityModifier.Public,
            MethodAttributes.Family => AccessibilityModifier.Protected,
            MethodAttributes.Assembly => AccessibilityModifier.Internal,
            MethodAttributes.FamORAssem => AccessibilityModifier.ProtectedInternal,
            MethodAttributes.FamANDAssem => AccessibilityModifier.PrivateProtected,
            _ => AccessibilityModifier.Unknown
        };
    }

    private static AccessibilityModifier DetermineFieldAccessibility(FieldAttributes attributes)
    {
        var access = attributes & FieldAttributes.FieldAccessMask;
        return access switch
        {
            FieldAttributes.Private => AccessibilityModifier.Private,
            FieldAttributes.Public => AccessibilityModifier.Public,
            FieldAttributes.Family => AccessibilityModifier.Protected,
            FieldAttributes.Assembly => AccessibilityModifier.Internal,
            FieldAttributes.FamORAssem => AccessibilityModifier.ProtectedInternal,
            FieldAttributes.FamANDAssem => AccessibilityModifier.PrivateProtected,
            _ => AccessibilityModifier.Unknown
        };
    }

    private static string? ResolveEntityName(MetadataReader reader, EntityHandle handle)
    {
        if (handle.IsNil)
        {
            return null;
        }

        switch (handle.Kind)
        {
            case HandleKind.TypeDefinition:
                var typeDef = reader.GetTypeDefinition((TypeDefinitionHandle)handle);
                var typeName = reader.GetString(typeDef.Name);
                var typeNs = typeDef.Namespace.IsNil ? string.Empty : reader.GetString(typeDef.Namespace);
                return string.IsNullOrEmpty(typeNs) ? typeName : $"{typeNs}.{typeName}";

            case HandleKind.TypeReference:
                var typeRef = reader.GetTypeReference((TypeReferenceHandle)handle);
                var refName = reader.GetString(typeRef.Name);
                var refNs = typeRef.Namespace.IsNil ? string.Empty : reader.GetString(typeRef.Namespace);
                return string.IsNullOrEmpty(refNs) ? refName : $"{refNs}.{refName}";

            case HandleKind.MemberReference:
                var memberRef = reader.GetMemberReference((MemberReferenceHandle)handle);
                var parentName = ResolveEntityName(reader, memberRef.Parent);
                var memberName = reader.GetString(memberRef.Name);
                return parentName != null ? $"{parentName}.{memberName}" : memberName;

            default:
                return null;
        }
    }
}
