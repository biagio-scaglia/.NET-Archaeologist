using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using DotNetArchaeologist.Api.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DotNetArchaeologist.Api.Tests;

public sealed class ArchaeologistApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ArchaeologistApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetArchaeologistStatus_ReturnsOkAndStatusResponse()
    {
        var response = await _client.GetAsync("/api/archaeologist/status");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var status = await response.Content.ReadFromJsonAsync<ArchaeologistStatusResponse>();

        Assert.NotNull(status);
        Assert.NotEmpty(status.Provider);
        Assert.NotEmpty(status.Model);
    }

    [Fact]
    public async Task PostArchaeologistAsk_WithEmptyPrompt_ReturnsBadRequest()
    {
        var request = new ArchaeologistChatRequest(string.Empty);
        var response = await _client.PostAsJsonAsync("/api/archaeologist/ask", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostArchaeologistAsk_WithValidPrompt_ReturnsOkAndResponse()
    {
        var request = new ArchaeologistChatRequest(
            Prompt: "Qual è l'architettura ideale per questo componente?",
            SelectedNodeTitle: "CustomerRepository",
            SelectedNodeCategory: "Database");

        var response = await _client.PostAsJsonAsync("/api/archaeologist/ask", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var chatResponse = await response.Content.ReadFromJsonAsync<ArchaeologistChatResponse>();

        Assert.NotNull(chatResponse);
        Assert.True(chatResponse.Success);
        Assert.NotEmpty(chatResponse.Answer);
    }
}
