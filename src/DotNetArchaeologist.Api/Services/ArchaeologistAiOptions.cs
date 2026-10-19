namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Opzioni di configurazione per il servizio AI dell'Archeologo.
/// </summary>
public sealed class ArchaeologistAiOptions
{
    public const string SectionName = "ArchaeologistAi";

    /// <summary>
    /// Provider AI: 'ollama' | 'openai-compatible' | 'offline'.
    /// </summary>
    public string Provider { get; set; } = "ollama";

    /// <summary>
    /// Endpoint base dell'API (es. "https://ollama.com/v1" per cloud, oppure "http://localhost:11434/v1" per locale).
    /// </summary>
    public string BaseUrl { get; set; } = "https://ollama.com/v1";

    /// <summary>
    /// Chiave API per l'autenticazione Bearer (necessaria per endpoint cloud).
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Nome del modello da interrogare (es. "deepseek-v4.1-flash", "gemma4:31b", "llama3").
    /// </summary>
    public string Model { get; set; } = "deepseek-v4.1-flash";

    /// <summary>
    /// Timeout in secondi per le chiamate HTTP al provider AI.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 45;
}
