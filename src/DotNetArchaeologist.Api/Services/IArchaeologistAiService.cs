using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Contratto per il servizio di consulenza architetturale assistita da LLM (Archeologo Live).
/// </summary>
public interface IArchaeologistAiService
{
    /// <summary>
    /// Invia una richiesta di analisi o una domanda all'Archeologo AI.
    /// </summary>
    Task<ArchaeologistChatResponse> AskAsync(ArchaeologistChatRequest request, CancellationToken ct = default);

    /// <summary>
    /// Restituisce lo stato attuale della connessione e del provider AI.
    /// </summary>
    ArchaeologistStatusResponse GetStatus();
}

public sealed record ArchaeologistChatRequest(
    string Prompt,
    string? Context = null,
    string? SolutionName = null,
    string? AssemblyName = null,
    string? SelectedNodeTitle = null,
    string? SelectedNodeCategory = null,
    string? CodeSnippet = null,
    string? ModelOverride = null,
    string? BaseUrlOverride = null,
    string? ApiKeyOverride = null,
    List<ArchaeologistChatMessage>? History = null);

public sealed record ArchaeologistChatMessage(string Role, string Content);

public sealed record ArchaeologistChatResponse(
    bool Success,
    string Answer,
    string ModelUsed,
    string Provider,
    string? DiagnosticMessage = null,
    bool FallbackUsed = false);

public sealed record ArchaeologistStatusResponse(
    string Provider,
    string BaseUrl,
    string Model,
    bool HasApiKey,
    bool IsConfigured);
