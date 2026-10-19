using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DotNetArchaeologist.Api.Tests;

public sealed class ArchaeologistAiServiceTests
{
    private sealed class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_responder(request));
        }
    }

    [Fact]
    public void GetStatus_ReturnsConfiguredOptions()
    {
        var options = new ArchaeologistAiOptions
        {
            Provider = "ollama",
            BaseUrl = "https://ollama.com/v1",
            ApiKey = "test-token",
            Model = "deepseek-v4.1-flash"
        };

        var service = new ArchaeologistAiService(
            new HttpClient(),
            Options.Create(options),
            NullLogger<ArchaeologistAiService>.Instance);

        var status = service.GetStatus();

        Assert.NotNull(status);
        Assert.Equal("ollama", status.Provider);
        Assert.True(status.HasApiKey);
        Assert.True(status.IsConfigured);
    }

    [Fact]
    public async Task AskAsync_WhenOfflineProvider_ReturnsDeterministicFallbackImmediately()
    {
        var options = new ArchaeologistAiOptions
        {
            Provider = "offline",
            BaseUrl = "http://localhost:11434/v1"
        };

        var service = new ArchaeologistAiService(
            new HttpClient(),
            Options.Create(options),
            NullLogger<ArchaeologistAiService>.Instance);

        var request = new ArchaeologistChatRequest(
            Prompt: "Come refactorizzare questo modulo?",
            SelectedNodeTitle: "BillingService",
            SelectedNodeCategory: "Service");

        var response = await service.AskAsync(request);

        Assert.True(response.Success);
        Assert.True(response.FallbackUsed);
        Assert.Equal("offline", response.Provider);
        Assert.Contains("BillingService", response.Answer);
    }

    [Fact]
    public async Task AskAsync_WhenRemoteApiSucceeds_ReturnsParsedResponse()
    {
        var handler = new MockHttpMessageHandler(req =>
        {
            var openAiResponse = new
            {
                choices = new[]
                {
                    new
                    {
                        message = new
                        {
                            role = "assistant",
                            content = "Consiglio di isolare la logica di business in un Service dedicato."
                        }
                    }
                }
            };

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(openAiResponse))
            };
        });

        var httpClient = new HttpClient(handler);
        var options = new ArchaeologistAiOptions
        {
            Provider = "ollama",
            BaseUrl = "https://mock-llm.com/v1",
            ApiKey = "valid-key"
        };

        var service = new ArchaeologistAiService(
            httpClient,
            Options.Create(options),
            NullLogger<ArchaeologistAiService>.Instance);

        var request = new ArchaeologistChatRequest("Come procedere?");
        var response = await service.AskAsync(request);

        Assert.True(response.Success);
        Assert.False(response.FallbackUsed);
        Assert.Equal("Consiglio di isolare la logica di business in un Service dedicato.", response.Answer);
    }

    [Fact]
    public async Task AskAsync_WhenHttpErrorOccurs_FallsBackToDeterministicWithDiagnostic()
    {
        var handler = new MockHttpMessageHandler(req =>
        {
            return new HttpResponseMessage(HttpStatusCode.Unauthorized)
            {
                Content = new StringContent("{\"error\":\"Invalid API Key\"}")
            };
        });

        var httpClient = new HttpClient(handler);
        var options = new ArchaeologistAiOptions
        {
            Provider = "ollama",
            BaseUrl = "https://mock-llm.com/v1",
            ApiKey = "invalid-key"
        };

        var service = new ArchaeologistAiService(
            httpClient,
            Options.Create(options),
            NullLogger<ArchaeologistAiService>.Instance);

        var request = new ArchaeologistChatRequest("Quali sono i rischi?");
        var response = await service.AskAsync(request);

        Assert.True(response.Success);
        Assert.True(response.FallbackUsed);
        Assert.NotNull(response.DiagnosticMessage);
        Assert.Contains("401", response.DiagnosticMessage);
    }
}
