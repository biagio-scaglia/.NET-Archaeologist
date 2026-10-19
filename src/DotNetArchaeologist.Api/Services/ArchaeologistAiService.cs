using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DotNetArchaeologist.Api.Services;

/// <summary>
/// Implementazione del servizio di consulenza AI per L'Archeologo,
/// con supporto a Ollama Cloud, Ollama Locale (OpenAI-compatible) e fallback deterministico esperto.
/// </summary>
public sealed class ArchaeologistAiService : IArchaeologistAiService
{
    private readonly HttpClient _httpClient;
    private readonly ArchaeologistAiOptions _options;
    private readonly ILogger<ArchaeologistAiService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public ArchaeologistAiService(
        HttpClient httpClient,
        IOptions<ArchaeologistAiOptions> options,
        ILogger<ArchaeologistAiService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _options = options?.Value ?? new ArchaeologistAiOptions();
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        ApplyEnvironmentOverrides(_options);
    }

    public ArchaeologistStatusResponse GetStatus()
    {
        var effectiveApiKey = ResolveApiKey(null);
        var effectiveBaseUrl = ResolveBaseUrl(null);
        var effectiveModel = ResolveModel(null);

        return new ArchaeologistStatusResponse(
            Provider: _options.Provider,
            BaseUrl: effectiveBaseUrl,
            Model: effectiveModel,
            HasApiKey: !string.IsNullOrWhiteSpace(effectiveApiKey),
            IsConfigured: true);
    }

    public async Task<ArchaeologistChatResponse> AskAsync(ArchaeologistChatRequest request, CancellationToken ct = default)
    {
        var baseUrl = ResolveBaseUrl(request.BaseUrlOverride);
        var apiKey = ResolveApiKey(request.ApiKeyOverride);
        var model = ResolveModel(request.ModelOverride);

        // Se provider è esplicitamente 'offline', usiamo il fallback deterministico
        if (string.Equals(_options.Provider, "offline", StringComparison.OrdinalIgnoreCase))
        {
            var offlineText = GenerateExpertDeterministicResponse(request);
            return new ArchaeologistChatResponse(
                Success: true,
                Answer: offlineText,
                ModelUsed: "archeologo-deterministico-offline",
                Provider: "offline",
                DiagnosticMessage: "Modalità offline attiva. Risposta generata dal motore euristico locale.",
                FallbackUsed: true);
        }

        try
        {
            var systemPrompt = BuildSystemPrompt(request);
            var messages = new List<object>
            {
                new { role = "system", content = systemPrompt }
            };

            if (request.History != null && request.History.Count > 0)
            {
                foreach (var h in request.History)
                {
                    messages.Add(new { role = h.Role, content = h.Content });
                }
            }

            messages.Add(new { role = "user", content = request.Prompt });

            var payload = new
            {
                model = model,
                messages = messages,
                temperature = 0.5,
                stream = false
            };

            var endpointUrl = BuildEndpointUrl(baseUrl);
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpointUrl);
            httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
            }

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(Math.Max(5, _options.TimeoutSeconds)));

            var response = await _httpClient.SendAsync(httpRequest, timeoutCts.Token);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(ct);
                var parsedAnswer = ExtractAnswerFromJson(content);

                if (!string.IsNullOrWhiteSpace(parsedAnswer))
                {
                    return new ArchaeologistChatResponse(
                        Success: true,
                        Answer: parsedAnswer,
                        ModelUsed: model,
                        Provider: _options.Provider,
                        DiagnosticMessage: null,
                        FallbackUsed: false);
                }
            }

            // In caso di errore HTTP (es. 401 Unauthorized, 404 Model Not Found, 429 Rate Limit)
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Chiamata AI all'endpoint {Url} fallita con stato {Status}: {Error}", endpointUrl, response.StatusCode, errorBody);

            var fallbackAnswer = GenerateExpertDeterministicResponse(request);
            var diagnostic = $"Provider {baseUrl} ha risposto con codice {(int)response.StatusCode} ({response.ReasonPhrase}).";
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                diagnostic += " Verifica la chiave API in .env o nelle impostazioni dell'Archeologo.";
            }

            return new ArchaeologistChatResponse(
                Success: true,
                Answer: fallbackAnswer,
                ModelUsed: model,
                Provider: _options.Provider,
                DiagnosticMessage: diagnostic,
                FallbackUsed: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Eccezione durante la connessione all'endpoint AI: {Message}", ex.Message);
            var fallbackAnswer = GenerateExpertDeterministicResponse(request);

            return new ArchaeologistChatResponse(
                Success: true,
                Answer: fallbackAnswer,
                ModelUsed: model,
                Provider: _options.Provider,
                DiagnosticMessage: $"Connessione non riuscita ({ex.Message}). È stata applicata l'analisi archeologica deterministica locale.",
                FallbackUsed: true);
        }
    }

    private static string BuildEndpointUrl(string baseUrl)
    {
        var trimmed = baseUrl.TrimEnd('/');
        if (trimmed.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }
        if (trimmed.EndsWith("/v1", StringComparison.OrdinalIgnoreCase))
        {
            return $"{trimmed}/chat/completions";
        }
        return $"{trimmed}/v1/chat/completions";
    }

    private static string ExtractAnswerFromJson(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Formato standard OpenAI: choices[0].message.content
            if (root.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
            {
                var first = choices[0];
                if (first.TryGetProperty("message", out var msg) && msg.TryGetProperty("content", out var content))
                {
                    return content.GetString() ?? string.Empty;
                }
                if (first.TryGetProperty("text", out var text))
                {
                    return text.GetString() ?? string.Empty;
                }
            }

            // Formato nativo Ollama /api/chat: message.content
            if (root.TryGetProperty("message", out var directMsg) && directMsg.TryGetProperty("content", out var directContent))
            {
                return directContent.GetString() ?? string.Empty;
            }

            // Formato Ollama /api/generate: response
            if (root.TryGetProperty("response", out var respText))
            {
                return respText.GetString() ?? string.Empty;
            }
        }
        catch
        {
            // Fallback se JSON non conforme
        }

        return string.Empty;
    }

    private static string BuildSystemPrompt(ArchaeologistChatRequest request)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Sei 'L'Archeologo', il consulente esperto e autorevole di architettura software di .NET Archaeologist.");
        sb.AppendLine("La tua missione è guidare sviluppatori ed architetti nell'esplorazione, comprensione e modernizzazione di assembly .NET, solution enterprise e codice C# decompilato.");
        sb.AppendLine("Stile di comunicazione: professionale, chiaro, leggermente affascinato dalla storia e dalla complessità del software legacy ('archeologia digitale'), ma rigoroso sul piano tecnico.");
        sb.AppendLine("Sei un maestro di: CLI ECMA-335, metadati .NET, C# moderno, ASP.NET Core, Entity Framework Core, WCF to gRPC/REST, Clean Architecture, Dependency Inversion e migrazione a .NET 8+.");
        sb.AppendLine("Rispondi sempre in italiano.");

        if (!string.IsNullOrWhiteSpace(request.SolutionName))
        {
            sb.AppendLine($"[Contesto Solution Attiva]: {request.SolutionName}");
        }
        if (!string.IsNullOrWhiteSpace(request.AssemblyName))
        {
            sb.AppendLine($"[Contesto Assembly Attivo]: {request.AssemblyName}");
        }
        if (!string.IsNullOrWhiteSpace(request.SelectedNodeTitle))
        {
            var category = request.SelectedNodeCategory ?? "Componente";
            sb.AppendLine($"[Elemento Selezionato]: {request.SelectedNodeTitle} (Categoria: {category})");
        }
        if (!string.IsNullOrWhiteSpace(request.Context))
        {
            sb.AppendLine($"[Metadati Architetturali Rilevati]:\n{request.Context}");
        }
        if (!string.IsNullOrWhiteSpace(request.CodeSnippet))
        {
            sb.AppendLine($"[Codice C# Sorgente Oggetto di Analisi]:\n```csharp\n{request.CodeSnippet}\n```");
        }

        return sb.ToString();
    }

    private static string GenerateExpertDeterministicResponse(ArchaeologistChatRequest request)
    {
        var target = request.SelectedNodeTitle ?? request.AssemblyName ?? request.SolutionName ?? "il sistema analizzato";
        var category = request.SelectedNodeCategory ?? "Componente";

        var sb = new StringBuilder();
        sb.AppendLine($"### 🎙️ L'Archeologo Risponde su: **{target}** [{category}]");
        sb.AppendLine();
        sb.AppendLine($"Dall'ispezione stratigrafica dei metadati e delle connessioni architetturali relative a **{target}**, emergono i seguenti punti focali:");
        sb.AppendLine();

        if (string.Equals(category, "Database", StringComparison.OrdinalIgnoreCase) || target.Contains("Data", StringComparison.OrdinalIgnoreCase) || target.Contains("Context", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine("1. **Isolamento del Livello di Persistenza**: Questo modulo gestisce accessi diretti ai dati relazionali. Per ridurre il debito tecnico e prevenire query sparse nel codice di business, si raccomanda l'adozione del pattern Repository o CQRS con MediatR.");
            sb.AppendLine("2. **Transizione da Stored Procedure a EF Core**: Isolare i contratti SQL in migration controllate per garantire testabilità senza dipendenza rigida dallo schema del database.");
        }
        else if (string.Equals(category, "Service", StringComparison.OrdinalIgnoreCase) || string.Equals(category, "Web", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine("1. **Contratti API e Disaccoppiamento**: Il servizio espone endpoint verso l'esterno. Assicurarsi che i DTO di scambio siano rigorosamente separati dai modelli di dominio interni.");
            sb.AppendLine("2. **Strategia di Modernizzazione .NET 8**: Se il servizio impiega WCF (SOAP), pianificare la transizione verso Minimal API REST o contratti Protobuf/gRPC nativi per ridurre la latenza e sfruttare Kestrel.");
        }
        else
        {
            sb.AppendLine("1. **Accoppiamento e Dipendenze**: Verificare che le classi concrete dipendano da interfacce (`DIP - Dependency Inversion Principle`) per favorire modularità e facilitare l'esecuzione di test unitari con mock.");
            sb.AppendLine("2. **Ciclo di Vita e Clean Code**: Raggruppare i tipi con alta coesione e rimuovere eventuali dipendenze circolari verso moduli di livello superiore.");
        }

        sb.AppendLine();
        sb.AppendLine($"*Nota archeologica*: Se desideri una consultazione con intelligenza artificiale generativa in tempo reale, assicurati che il provider Ollama sia raggiungibile o che la chiave API in `.env` sia valida.");

        return sb.ToString();
    }

    private string ResolveBaseUrl(string? overrideUrl)
    {
        if (!string.IsNullOrWhiteSpace(overrideUrl)) return overrideUrl.Trim();
        var env = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_API_BASE_URL");
        if (!string.IsNullOrWhiteSpace(env)) return env.Trim();
        return !string.IsNullOrWhiteSpace(_options.BaseUrl) ? _options.BaseUrl.Trim() : "https://ollama.com/v1";
    }

    private string? ResolveApiKey(string? overrideKey)
    {
        if (!string.IsNullOrWhiteSpace(overrideKey)) return overrideKey.Trim();
        var env = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_API_KEY");
        if (!string.IsNullOrWhiteSpace(env)) return env.Trim();
        return !string.IsNullOrWhiteSpace(_options.ApiKey) ? _options.ApiKey.Trim() : null;
    }

    private string ResolveModel(string? overrideModel)
    {
        if (!string.IsNullOrWhiteSpace(overrideModel)) return overrideModel.Trim();
        var env = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_MODEL");
        if (!string.IsNullOrWhiteSpace(env)) return env.Trim();
        return !string.IsNullOrWhiteSpace(_options.Model) ? _options.Model.Trim() : "deepseek-v4.1-flash";
    }

    private static void ApplyEnvironmentOverrides(ArchaeologistAiOptions options)
    {
        // Lettura facoltativa da file .env se presente nella root o nella directory corrente
        LoadDotEnvIfPresent();

        var envProvider = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_AI_PROVIDER");
        if (!string.IsNullOrWhiteSpace(envProvider)) options.Provider = envProvider.Trim();

        var envBaseUrl = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_API_BASE_URL");
        if (!string.IsNullOrWhiteSpace(envBaseUrl)) options.BaseUrl = envBaseUrl.Trim();

        var envApiKey = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_API_KEY");
        if (!string.IsNullOrWhiteSpace(envApiKey)) options.ApiKey = envApiKey.Trim();

        var envModel = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_MODEL");
        if (!string.IsNullOrWhiteSpace(envModel)) options.Model = envModel.Trim();

        var envTimeout = Environment.GetEnvironmentVariable("ARCHAEOLOGIST_TIMEOUT_MS");
        if (int.TryParse(envTimeout, out var timeoutMs) && timeoutMs > 0)
        {
            options.TimeoutSeconds = Math.Max(5, timeoutMs / 1000);
        }
    }

    private static void LoadDotEnvIfPresent()
    {
        try
        {
            var searchPaths = new[]
            {
                System.IO.Path.Combine(AppContext.BaseDirectory, ".env"),
                System.IO.Path.Combine(Directory.GetCurrentDirectory(), ".env"),
                System.IO.Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"),
                System.IO.Path.Combine(Directory.GetCurrentDirectory(), "..", "..", ".env")
            };

            foreach (var path in searchPaths)
            {
                if (System.IO.File.Exists(path))
                {
                    var lines = System.IO.File.ReadAllLines(path);
                    foreach (var rawLine in lines)
                    {
                        var line = rawLine.Trim();
                        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#')) continue;
                        var idx = line.IndexOf('=');
                        if (idx > 0)
                        {
                            var key = line[..idx].Trim();
                            var val = line[(idx + 1)..].Trim();
                            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                            {
                                Environment.SetEnvironmentVariable(key, val);
                            }
                        }
                    }
                    break;
                }
            }
        }
        catch
        {
            // Ignora errori di parsing del file .env locale
        }
    }
}
