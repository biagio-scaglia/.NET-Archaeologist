using System;
using System.Collections.Immutable;
using System.Reflection.Metadata;

namespace DotNetArchaeologist.Analysis.Engines;

/// <summary>
/// Provider di decodifica signature per System.Reflection.Metadata a Zero-Execution.
/// Converte i token e le definizioni ECMA-335 nei nomi completi dei tipi C#.
/// </summary>
internal sealed class MetadataSignatureTypeProvider : ISignatureTypeProvider<string, object?>
{
    public static readonly MetadataSignatureTypeProvider Instance = new();

    public string GetPrimitiveType(PrimitiveTypeCode typeCode) => typeCode switch
    {
        PrimitiveTypeCode.Void => "void",
        PrimitiveTypeCode.Boolean => "bool",
        PrimitiveTypeCode.Char => "char",
        PrimitiveTypeCode.SByte => "sbyte",
        PrimitiveTypeCode.Byte => "byte",
        PrimitiveTypeCode.Int16 => "short",
        PrimitiveTypeCode.UInt16 => "ushort",
        PrimitiveTypeCode.Int32 => "int",
        PrimitiveTypeCode.UInt32 => "uint",
        PrimitiveTypeCode.Int64 => "long",
        PrimitiveTypeCode.UInt64 => "ulong",
        PrimitiveTypeCode.Single => "float",
        PrimitiveTypeCode.Double => "double",
        PrimitiveTypeCode.String => "string",
        PrimitiveTypeCode.Object => "object",
        PrimitiveTypeCode.IntPtr => "nint",
        PrimitiveTypeCode.UIntPtr => "nuint",
        PrimitiveTypeCode.TypedReference => "TypedReference",
        _ => typeCode.ToString()
    };

    public string GetTypeFromDefinition(MetadataReader reader, TypeDefinitionHandle handle, byte rawTypeKind)
    {
        var typeDef = reader.GetTypeDefinition(handle);
        var ns = reader.GetString(typeDef.Namespace);
        var name = reader.GetString(typeDef.Name);

        if (typeDef.IsNested)
        {
            var declaringHandle = typeDef.GetDeclaringType();
            var declaringName = GetTypeFromDefinition(reader, declaringHandle, rawTypeKind);
            return $"{declaringName}+{name}";
        }

        return string.IsNullOrEmpty(ns) ? name : $"{ns}.{name}";
    }

    public string GetTypeFromReference(MetadataReader reader, TypeReferenceHandle handle, byte rawTypeKind)
    {
        var typeRef = reader.GetTypeReference(handle);
        var ns = reader.GetString(typeRef.Namespace);
        var name = reader.GetString(typeRef.Name);

        if (typeRef.ResolutionScope.Kind == HandleKind.TypeReference)
        {
            var declaringRef = GetTypeFromReference(reader, (TypeReferenceHandle)typeRef.ResolutionScope, rawTypeKind);
            return $"{declaringRef}+{name}";
        }

        return string.IsNullOrEmpty(ns) ? name : $"{ns}.{name}";
    }

    public string GetTypeFromSpecification(MetadataReader reader, object? genericContext, TypeSpecificationHandle handle, byte rawTypeKind)
    {
        var typeSpec = reader.GetTypeSpecification(handle);
        return typeSpec.DecodeSignature(this, genericContext);
    }

    public string GetGenericInstantiation(string genericType, ImmutableArray<string> typeArguments) =>
        $"{genericType}<{string.Join(", ", typeArguments)}>";

    public string GetArrayType(string elementType, ArrayShape shape) =>
        $"{elementType}[{new string(',', shape.Rank - 1)}]";

    public string GetSZArrayType(string elementType) =>
        $"{elementType}[]";

    public string GetByReferenceType(string elementType) =>
        $"ref {elementType}";

    public string GetPointerType(string elementType) =>
        $"{elementType}*";

    public string GetPinnedType(string elementType) =>
        elementType;

    public string GetGenericTypeParameter(object? genericContext, int index) =>
        $"T{index}";

    public string GetGenericMethodParameter(object? genericContext, int index) =>
        $"M{index}";

    public string GetModifiedType(string modifier, string unmodifiedType, bool isRequired) =>
        unmodifiedType;

    public string GetFunctionPointerType(MethodSignature<string> signature) =>
        $"delegate*<{string.Join(", ", signature.ParameterTypes)}, {signature.ReturnType}>";
}
