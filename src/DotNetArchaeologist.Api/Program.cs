using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Analysis.Engines;
using DotNetArchaeologist.Api.Services;
using DotNetArchaeologist.Core.Contracts;
using DotNetArchaeologist.Core.Domain;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Configurazione policy CORS ristretta a localhost per il frontend locale
const string localCorsPolicy = "LocalFrontendPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(localCorsPolicy, policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Registrazione servizi di analisi e dominio
builder.Services.AddSingleton<IAssemblyInspector, MetadataAssemblyInspector>();
builder.Services.AddSingleton<IDecompilerService, CSharpDecompilerService>();
builder.Services.AddSingleton<IArchitectureGraphBuilder, ArchitectureGraphBuilder>();
builder.Services.AddSingleton<IAssemblySessionStore, InMemoryAssemblySessionStore>();

var app = builder.Build();

app.UseCors(localCorsPolicy);

// ==============================================================================
// Endpoint API
// ==============================================================================

// Health check
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "DotNetArchaeologist.Api",
    version = "1.0.0"
}));

// Ispezione Assembly via file upload multipart
app.MapPost("/api/assemblies/inspect", async (
    HttpRequest request,
    IAssemblyInspector inspector,
    IAssemblySessionStore sessionStore,
    CancellationToken ct) =>
{
    if (!request.HasFormContentType || request.Form.Files.Count == 0)
    {
        return Results.BadRequest(new { error = "È necessario caricare un file binario .NET valido tramite form multipart." });
    }

    var file = request.Form.Files[0];
    if (file.Length == 0)
    {
        return Results.BadRequest(new { error = "Il file caricato è vuoto." });
    }

    await using var ms = new MemoryStream();
    await file.CopyToAsync(ms, ct);
    var rawBytes = ms.ToArray();

    try
    {
        using var readStream = new MemoryStream(rawBytes, writable: false);
        var descriptor = await inspector.InspectAsync(readStream, file.FileName, ct);
        var sessionId = sessionStore.Register(descriptor, rawBytes);

        return Results.Ok(new
        {
            sessionId,
            assembly = descriptor
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante l'ispezione dell'assembly: {ex.Message}" });
    }
}).DisableAntiforgery();

// Ispezione Assembly via percorso file locale (se eseguito in locale)
app.MapPost("/api/assemblies/inspect-path", async (
    InspectPathRequest request,
    IAssemblyInspector inspector,
    IAssemblySessionStore sessionStore,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.FilePath) || !File.Exists(request.FilePath))
    {
        return Results.BadRequest(new { error = $"File dell'assembly non trovato sul percorso specificato: '{request.FilePath}'." });
    }

    try
    {
        var rawBytes = await File.ReadAllBytesAsync(request.FilePath, ct);
        using var readStream = new MemoryStream(rawBytes, writable: false);
        var descriptor = await inspector.InspectAsync(readStream, Path.GetFileName(request.FilePath), ct);
        var sessionId = sessionStore.Register(descriptor, rawBytes);

        return Results.Ok(new
        {
            sessionId,
            assembly = descriptor
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante l'ispezione dell'assembly: {ex.Message}" });
    }
});

// Dettaglio metadati dell'Assembly
app.MapGet("/api/assemblies/{sessionId}", (
    string sessionId,
    IAssemblySessionStore sessionStore) =>
{
    var descriptor = sessionStore.GetDescriptor(sessionId);
    return descriptor == null
        ? Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." })
        : Results.Ok(descriptor);
});

// Albero gerarchico di navigazione (Namespaces -> Tipi -> Membri)
app.MapGet("/api/assemblies/{sessionId}/tree", (
    string sessionId,
    IAssemblySessionStore sessionStore) =>
{
    var descriptor = sessionStore.GetDescriptor(sessionId);
    if (descriptor == null)
    {
        return Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." });
    }

    var tree = descriptor.Types
        .GroupBy(t => string.IsNullOrEmpty(t.Namespace) ? "<Global>" : t.Namespace)
        .OrderBy(g => g.Key, StringComparer.Ordinal)
        .Select(g => new
        {
            Namespace = g.Key,
            Types = g.OrderBy(t => t.Name, StringComparer.Ordinal).Select(t => new
            {
                t.FullName,
                t.Name,
                Kind = t.Kind.ToString(),
                Accessibility = t.Accessibility.ToString(),
                t.IsAbstract,
                t.IsSealed,
                t.IsStatic,
                MembersCount = t.Members.Count
            })
        });

    return Results.Ok(new
    {
        assemblyName = descriptor.Name,
        totalTypes = descriptor.TotalTypesCount,
        namespaces = tree
    });
});

// Grafo architetturale
app.MapGet("/api/assemblies/{sessionId}/graph", (
    string sessionId,
    IAssemblySessionStore sessionStore,
    IArchitectureGraphBuilder graphBuilder) =>
{
    var descriptor = sessionStore.GetDescriptor(sessionId);
    if (descriptor == null)
    {
        return Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." });
    }

    var graph = graphBuilder.BuildGraph(descriptor);
    return Results.Ok(graph);
});

// Decompilazione C#
app.MapGet("/api/assemblies/{sessionId}/decompile", async (
    string sessionId,
    string? type,
    string? method,
    IAssemblySessionStore sessionStore,
    IDecompilerService decompiler,
    CancellationToken ct) =>
{
    using var peStream = sessionStore.GetStream(sessionId);
    if (peStream == null)
    {
        return Results.NotFound(new { error = $"Sessione assembly '{sessionId}' non trovata." });
    }

    try
    {
        string csharpCode;
        if (!string.IsNullOrWhiteSpace(type) && !string.IsNullOrWhiteSpace(method))
        {
            csharpCode = await decompiler.DecompileMethodAsync(peStream, type, method, ct);
        }
        else if (!string.IsNullOrWhiteSpace(type))
        {
            csharpCode = await decompiler.DecompileTypeAsync(peStream, type, ct);
        }
        else
        {
            csharpCode = await decompiler.DecompileWholeAssemblyAsync(peStream, ct);
        }

        return Results.Ok(new
        {
            sessionId,
            type,
            method,
            code = csharpCode
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = $"Errore durante la decompilazione: {ex.Message}" });
    }
});

app.Run();

// Requisito per WebApplicationFactory nei test xUnit
public partial class Program { }

public sealed record InspectPathRequest(string FilePath);
