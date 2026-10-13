using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using DotNetArchaeologist.Analysis.Tests.Helpers;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DotNetArchaeologist.Api.Tests;

public sealed class AssemblyApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public AssemblyApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOkAndHealthyStatus()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);

        Assert.Equal("Healthy", json.RootElement.GetProperty("status").GetString());
        Assert.Equal("DotNetArchaeologist.Api", json.RootElement.GetProperty("service").GetString());
    }

    [Fact]
    public async Task FullInspectionLifecycle_Inspect_Get_Tree_Graph_And_Decompile()
    {
        // 1. Generazione di un assembly di test in memoria tramite Roslyn
        const string source = """
            namespace OrderProcessing;

            public interface IOrderService
            {
                bool ProcessOrder(int orderId);
            }

            public class OrderService : IOrderService
            {
                public int MaxRetryCount { get; set; } = 3;

                public bool ProcessOrder(int orderId)
                {
                    return orderId > 0;
                }
            }
            """;

        await using var assemblyStream = TestAssemblyGenerator.CreateAssemblyStream(source, "OrderModule");
        var rawBytes = assemblyStream.ToArray();

        // 2. Chiamata POST /api/assemblies/inspect con Multipart form
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(rawBytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/octet-stream");
        form.Add(fileContent, "file", "OrderModule.dll");

        var inspectResponse = await _client.PostAsync("/api/assemblies/inspect", form);
        Assert.Equal(HttpStatusCode.OK, inspectResponse.StatusCode);

        var inspectJson = JsonDocument.Parse(await inspectResponse.Content.ReadAsStringAsync());
        var sessionId = inspectJson.RootElement.GetProperty("sessionId").GetString();
        Assert.False(string.IsNullOrWhiteSpace(sessionId));

        // 3. Chiamata GET /api/assemblies/{sessionId}
        var getResponse = await _client.GetAsync($"/api/assemblies/{sessionId}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var getJson = JsonDocument.Parse(await getResponse.Content.ReadAsStringAsync());
        Assert.Equal("OrderModule", getJson.RootElement.GetProperty("name").GetString());

        // 4. Chiamata GET /api/assemblies/{sessionId}/tree
        var treeResponse = await _client.GetAsync($"/api/assemblies/{sessionId}/tree");
        Assert.Equal(HttpStatusCode.OK, treeResponse.StatusCode);
        var treeJson = JsonDocument.Parse(await treeResponse.Content.ReadAsStringAsync());
        Assert.Equal("OrderModule", treeJson.RootElement.GetProperty("assemblyName").GetString());
        Assert.True(treeJson.RootElement.GetProperty("namespaces").GetArrayLength() > 0);

        // 5. Chiamata GET /api/assemblies/{sessionId}/graph
        var graphResponse = await _client.GetAsync($"/api/assemblies/{sessionId}/graph");
        Assert.Equal(HttpStatusCode.OK, graphResponse.StatusCode);
        var graphJson = JsonDocument.Parse(await graphResponse.Content.ReadAsStringAsync());
        Assert.True(graphJson.RootElement.GetProperty("totalNodes").GetInt32() >= 3);
        Assert.True(graphJson.RootElement.GetProperty("totalEdges").GetInt32() >= 2);

        // 6. Chiamata GET /api/assemblies/{sessionId}/decompile?type=...
        var decompileResponse = await _client.GetAsync(
            $"/api/assemblies/{sessionId}/decompile?type=OrderProcessing.OrderService");
        Assert.Equal(HttpStatusCode.OK, decompileResponse.StatusCode);
        var decompileJson = JsonDocument.Parse(await decompileResponse.Content.ReadAsStringAsync());
        var code = decompileJson.RootElement.GetProperty("code").GetString();
        Assert.NotNull(code);
        Assert.Contains("class OrderService", code);
        Assert.Contains("ProcessOrder", code);
    }

    [Fact]
    public async Task GetTree_ReturnsNotFoundForUnknownSession()
    {
        var response = await _client.GetAsync("/api/assemblies/unknown-session-123/tree");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Inspect_ReturnsBadRequestWhenNoFileProvided()
    {
        using var emptyContent = new ByteArrayContent(System.Array.Empty<byte>());
        var response = await _client.PostAsync("/api/assemblies/inspect", emptyContent);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
