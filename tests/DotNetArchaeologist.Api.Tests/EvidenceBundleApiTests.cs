using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using DotNetArchaeologist.Core.Domain;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DotNetArchaeologist.Api.Tests;

public sealed class EvidenceBundleApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public EvidenceBundleApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetEvidenceBundle_ForNonExistentSession_ReturnsNotFound()
    {
        var response = await _client.GetAsync("/api/assemblies/missing-session-12345/evidence-bundle");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostValidateEvidenceBundle_WithValidBundle_ReturnsOkAndValid()
    {
        var bundle = new EvidenceBundle
        {
            TargetName = "ValidatedLibrary",
            TargetSha256 = "112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00",
            Records = new[]
            {
                new EvidenceRecord
                {
                    EvidenceId = "ev_112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00",
                    Category = "AssemblyHeader",
                    Title = "Test Header",
                    Subject = "ValidatedLibrary"
                }
            }
        };

        var request = new ValidateEvidenceBundleRequest(JsonSerializer.Serialize(bundle));
        var response = await _client.PostAsJsonAsync("/api/evidence-bundle/validate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<EvidenceBundleValidationResult>();
        Assert.NotNull(result);
        Assert.True(result.IsValid);
        Assert.Equal("ValidatedLibrary", result.Bundle?.TargetName);
    }

    [Fact]
    public async Task PostValidateEvidenceBundle_WithCorruptJson_ReturnsInvalidResult()
    {
        var request = new ValidateEvidenceBundleRequest("{ corrupted json: true ");
        var response = await _client.PostAsJsonAsync("/api/evidence-bundle/validate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<EvidenceBundleValidationResult>();
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
    }
}
