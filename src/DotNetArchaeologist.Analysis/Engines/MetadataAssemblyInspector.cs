using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;
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

                string returnType = "void";
                var paramTypes = new List<string>();
                try
                {
                    var sig = methodDef.DecodeSignature(MetadataSignatureTypeProvider.Instance, genericContext: null);
                    returnType = sig.ReturnType;
                    paramTypes.AddRange(sig.ParameterTypes);
                }
                catch
                {
                    // Fallback in caso di signature non conforme
                }

                var parameters = new List<ParameterDescriptor>();
                int paramIndex = 0;
                foreach (var paramHandle in methodDef.GetParameters())
                {
                    var param = metadataReader.GetParameter(paramHandle);
                    var paramName = param.Name.IsNil ? $"p{param.SequenceNumber}" : metadataReader.GetString(param.Name);
                    var paramType = paramIndex < paramTypes.Count ? paramTypes[paramIndex] : "object";
                    parameters.Add(new ParameterDescriptor(
                        paramName,
                        paramType,
                        param.SequenceNumber,
                        param.Attributes.HasFlag(ParameterAttributes.In),
                        param.Attributes.HasFlag(ParameterAttributes.Out),
                        param.Attributes.HasFlag(ParameterAttributes.HasDefault)));
                    paramIndex++;
                }

                members.Add(new MemberDescriptor(
                    methodName,
                    memberKind,
                    returnType,
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

                string fieldType = "object";
                try
                {
                    fieldType = fieldDef.DecodeSignature(MetadataSignatureTypeProvider.Instance, genericContext: null);
                }
                catch
                {
                    // Fallback
                }

                members.Add(new MemberDescriptor(
                    fieldName,
                    MemberKind.Field,
                    fieldType,
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

        // Estrazione Risorse Incorporate e Asset (ManifestResources)
        var manifestResources = new List<ManifestResourceDescriptor>();
        var corHeader = peReader.PEHeaders.CorHeader;
        var hasResourceSection = corHeader != null && corHeader.ResourcesDirectory.Size > 0;
        var resourceSectionData = hasResourceSection
            ? peReader.GetSectionData(corHeader!.ResourcesDirectory.RelativeVirtualAddress)
            : default;

        foreach (var resHandle in metadataReader.ManifestResources)
        {
            var res = metadataReader.GetManifestResource(resHandle);
            var resName = metadataReader.GetString(res.Name);
            var visibility = (res.Attributes & ManifestResourceAttributes.VisibilityMask) == ManifestResourceAttributes.Public
                ? "Public"
                : "Private";

            long sizeInBytes = 0;
            string? mimeType = null;
            string? previewDataUri = null;

            var lower = resName.ToLowerInvariant();
            string resType = "Embedded";
            string humanDesc;

            if (lower.EndsWith(".png"))
            {
                resType = "ImagePng";
                mimeType = "image/png";
                humanDesc = "Immagine PNG grafica o icona incorporata nell'applicazione.";
            }
            else if (lower.EndsWith(".jpg") || lower.EndsWith(".jpeg"))
            {
                resType = "ImageJpeg";
                mimeType = "image/jpeg";
                humanDesc = "Fotografia o grafica JPEG incorporata.";
            }
            else if (lower.EndsWith(".ico"))
            {
                resType = "Icon";
                mimeType = "image/x-icon";
                humanDesc = "Icona applicativa Windows per finestre o barre strumenti.";
            }
            else if (lower.EndsWith(".bmp"))
            {
                resType = "ImageBmp";
                mimeType = "image/bmp";
                humanDesc = "Grafica Bitmap classica di sfondo o pulsante.";
            }
            else if (lower.EndsWith(".gif"))
            {
                resType = "ImageGif";
                mimeType = "image/gif";
                humanDesc = "Animazione o grafica GIF leggera.";
            }
            else if (lower.EndsWith(".svg"))
            {
                resType = "VectorSvg";
                mimeType = "image/svg+xml";
                humanDesc = "Grafica vettoriale scalabile SVG.";
            }
            else if (lower.EndsWith(".resources"))
            {
                resType = "CompiledResources";
                humanDesc = "Dizionario compilato di testi, etichette e icone di interfaccia Windows Forms o WPF.";
            }
            else if (lower.EndsWith(".xml") || lower.EndsWith(".config"))
            {
                resType = "ConfigurationOrXml";
                mimeType = "application/xml";
                humanDesc = "File di configurazione o schema XML di scambio dati.";
            }
            else if (lower.EndsWith(".sql"))
            {
                resType = "SqlScript";
                mimeType = "text/plain";
                humanDesc = "Script SQL di creazione o manutenzione del database.";
            }
            else if (lower.EndsWith(".json"))
            {
                resType = "JsonDocument";
                mimeType = "application/json";
                humanDesc = "Documento strutturato JSON di configurazione o dati predefiniti.";
            }
            else
            {
                humanDesc = "Flusso di dati o file binario incorporato nei metadati dell'applicazione.";
            }

            if (res.Implementation.IsNil && hasResourceSection && (res.Offset + 4 <= resourceSectionData.Length))
            {
                try
                {
                    var reader = resourceSectionData.GetReader((int)res.Offset, resourceSectionData.Length - (int)res.Offset);
                    uint length = reader.ReadUInt32();
                    sizeInBytes = length;

                    if (mimeType != null && mimeType.StartsWith("image/") && length > 0 && length <= 1_500_000 && length <= reader.RemainingBytes)
                    {
                        var bytes = reader.ReadBytes((int)length);
                        previewDataUri = $"data:{mimeType};base64,{Convert.ToBase64String(bytes)}";
                    }
                }
                catch
                {
                    // Fallback in caso di lettura non conforme
                }
            }

            manifestResources.Add(new ManifestResourceDescriptor(
                resName,
                visibility,
                res.Offset,
                sizeInBytes,
                resType,
                mimeType,
                previewDataUri,
                humanDesc));
        }

        // Estrazione e classificazione euristica stringhe costanti dai corpi IL (ldstr opcode)
        var extractedStrings = new List<ExtractedConstantString>();
        var seenStrings = new HashSet<string>(StringComparer.Ordinal);

        foreach (var methodHandle in metadataReader.MethodDefinitions)
        {
            var methodDef = metadataReader.GetMethodDefinition(methodHandle);
            if (methodDef.RelativeVirtualAddress == 0) continue;

            try
            {
                var body = peReader.GetMethodBody(methodDef.RelativeVirtualAddress);
                var il = body.GetILBytes();
                if (il == null || il.Length < 5) continue;

                for (int i = 0; i < il.Length - 4; i++)
                {
                    if (il[i] == 0x72) // OpCode ldstr
                    {
                        int token = BitConverter.ToInt32(il, i + 1);
                        int row = token & 0x00FFFFFF;
                        if ((token >> 24) == 0x70 && row > 0)
                        {
                            try
                            {
                                var handle = MetadataTokens.UserStringHandle(row);
                                var str = metadataReader.GetUserString(handle);
                                if (string.IsNullOrWhiteSpace(str) || str.Length < 3) continue;

                                if (str.Length > 2000)
                                {
                                    str = str.Substring(0, 2000) + "... [troncata]";
                                }

                                if (seenStrings.Add(str))
                                {
                                    var category = ClassifyConstantString(str);
                                    extractedStrings.Add(new ExtractedConstantString(str, category));
                                }
                            }
                            catch
                            {
                                // Token non valido nell'heap #US, prosegui
                            }
                        }
                    }
                }
            }
            catch
            {
                // Fallback in caso di metodo non decodificabile
            }
        }

        extractedStrings = extractedStrings
            .OrderBy(s => s.Category switch
            {
                "Sql" => 1,
                "Connection" => 2,
                "Url" => 3,
                "Path" => 4,
                _ => 5
            })
            .ThenBy(s => s.Value)
            .ToList();

        // Audit dei rischi e tecnologie per modernizzazione a .NET 8/9
        var modernizationFindings = AnalyzeModernizationRisks(references, targetFramework);

        var descriptor = new AssemblyDescriptor(
            assemblyName,
            version,
            culture,
            publicKeyToken,
            targetFramework,
            mvid,
            references,
            types,
            manifestResources,
            extractedStrings,
            modernizationFindings);

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

    private static string ClassifyConstantString(string s)
    {
        var trimmed = s.Trim();
        var upper = trimmed.ToUpperInvariant();

        if (upper.StartsWith("SELECT ") || upper.StartsWith("INSERT INTO ") ||
            upper.StartsWith("UPDATE ") || upper.StartsWith("DELETE FROM ") ||
            upper.StartsWith("EXEC ") || upper.StartsWith("CREATE TABLE ") ||
            upper.StartsWith("ALTER TABLE ") || (upper.Contains(" FROM ") && upper.Contains(" WHERE ")))
        {
            return "Sql";
        }

        if (upper.Contains("DATA SOURCE=") || upper.Contains("INITIAL CATALOG=") ||
            upper.Contains("SERVER=") || upper.Contains("INTEGRATED SECURITY=") ||
            upper.Contains("USER ID=") || upper.Contains("PASSWORD="))
        {
            return "Connection";
        }

        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("ftp://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("ws://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("wss://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("net.tcp://", StringComparison.OrdinalIgnoreCase))
        {
            return "Url";
        }

        if ((trimmed.Length > 3 && trimmed[1] == ':' && (trimmed[2] == '\\' || trimmed[2] == '/')) ||
            trimmed.StartsWith("\\\\"))
        {
            return "Path";
        }

        return "General";
    }

    private static List<ModernizationFinding> AnalyzeModernizationRisks(
        IReadOnlyList<AssemblyReferenceDescriptor> references,
        string? targetFramework)
    {
        var findings = new List<ModernizationFinding>();

        foreach (var r in references)
        {
            var name = r.Name;

            if (name.Equals("System.Web", StringComparison.OrdinalIgnoreCase) ||
                name.StartsWith("System.Web.", StringComparison.OrdinalIgnoreCase))
            {
                findings.Add(new ModernizationFinding(
                    "LegacyTechnology",
                    name,
                    "Critical",
                    "Dipendenza diretta da ASP.NET Legacy (System.Web). Non supportato su .NET Core o .NET 8.",
                    "Riscrivere HttpHandler/HttpModule con middleware ASP.NET Core o Controller/Minimal API."));
            }
            else if (name.Equals("System.EnterpriseServices", StringComparison.OrdinalIgnoreCase))
            {
                findings.Add(new ModernizationFinding(
                    "LegacyTechnology",
                    name,
                    "Critical",
                    "Componenti transazionali COM+ / ServicedComponent. Rimosso da .NET moderno.",
                    "Sostituire le transazioni COM+ con transazioni di database locali o pattern Saga/Outbox."));
            }
            else if (name.Equals("System.Runtime.Remoting", StringComparison.OrdinalIgnoreCase))
            {
                findings.Add(new ModernizationFinding(
                    "LegacyTechnology",
                    name,
                    "Critical",
                    ".NET Remoting e canali TCP/HTTP binari. Rimosso nelle moderne versioni di .NET.",
                    "Migrare le comunicazioni remote a gRPC o REST API con JSON/Protobuf."));
            }
            else if (name.Equals("System.ServiceModel", StringComparison.OrdinalIgnoreCase) ||
                     name.StartsWith("System.ServiceModel.", StringComparison.OrdinalIgnoreCase))
            {
                findings.Add(new ModernizationFinding(
                    "LegacyTechnology",
                    name,
                    "High",
                    "Hosting di servizi WCF (Windows Communication Foundation). Solo il client è supportato su .NET 8.",
                    "Per il server side, utilizzare CoreWCF oppure migrare i contratti a Web API REST o gRPC."));
            }
            else if (name.Equals("System.Data.OracleClient", StringComparison.OrdinalIgnoreCase))
            {
                findings.Add(new ModernizationFinding(
                    "DeprecatedApi",
                    name,
                    "High",
                    "Driver ADO.NET Oracle ufficiale deprecato da Microsoft fin da .NET Framework 4.",
                    "Sostituire con il driver moderno Oracle.ManagedDataAccess.Core."));
            }
            else if (name.Equals("System.Workflow.Runtime", StringComparison.OrdinalIgnoreCase) ||
                     name.StartsWith("System.Workflow.", StringComparison.OrdinalIgnoreCase))
            {
                findings.Add(new ModernizationFinding(
                    "RemovedTechnology",
                    name,
                    "Critical",
                    "Windows Workflow Foundation 3.x (WF3) non supportato in ambienti .NET moderni.",
                    "Riprogettare i workflow con Elsa Workflows, Temporal o motori BPMN moderni."));
            }
        }

        if (!string.IsNullOrWhiteSpace(targetFramework) &&
            (targetFramework.Contains(".NETFramework", StringComparison.OrdinalIgnoreCase) ||
             targetFramework.Contains("v2.") || targetFramework.Contains("v3.") || targetFramework.Contains("v4.")))
        {
            findings.Add(new ModernizationFinding(
                "RuntimePorting",
                targetFramework,
                "Medium",
                $"L'assembly è compilato per '{targetFramework}'. È soggetto a vincoli di runtime Windows-only.",
                "Pianificare il porting a .NET 8 LTS per ottenere cross-platform nativo (Linux/Container) e migliori prestazioni di runtime."));
        }

        return findings;
    }
}
