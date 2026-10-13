using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace DotNetArchaeologist.Api.Tests;

public sealed class SecurityApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SecurityApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CrossOrigin_RejectsUnauthorizedOriginHeader()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", "https://malicious-site.example");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("origine cross-origin non autorizzata", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CrossOrigin_RejectsCrossSiteSecFetchSite()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Sec-Fetch-Site", "cross-site");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("cross-site non sono consentite", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AllowedOrigin_PermitsLocalFrontendRequests()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task InspectPath_RejectsNonAssemblyExtensions()
    {
        var tempTxt = Path.GetTempFileName();
        try
        {
            var payload = JsonSerializer.Serialize(new { FilePath = tempTxt });
            var response = await _client.PostAsync(
                "/api/assemblies/inspect-path",
                new StringContent(payload, Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("non consentita", content, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            if (File.Exists(tempTxt)) File.Delete(tempTxt);
        }
    }

    [Fact]
    public async Task InspectPath_RejectsUncRemotePaths()
    {
        var payload = JsonSerializer.Serialize(new { FilePath = @"\\192.168.1.100\share\target.dll" });
        var response = await _client.PostAsync(
            "/api/assemblies/inspect-path",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("UNC", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InspectPath_RejectsSystemDirectoryAccess()
    {
        var winDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        var protectedTarget = Path.Combine(winDir, "System32", "kernel32.dll");

        var payload = JsonSerializer.Serialize(new { FilePath = protectedTarget });
        var response = await _client.PostAsync(
            "/api/assemblies/inspect-path",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("directory di sistema", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InspectFolder_RejectsDriveRootScan()
    {
        var payload = JsonSerializer.Serialize(new { FolderPath = @"C:\" });
        var response = await _client.PostAsync(
            "/api/assemblies/inspect-folder",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("radice", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InspectFolder_RejectsUncFolderPath()
    {
        var payload = JsonSerializer.Serialize(new { FolderPath = @"\\remote-server\c$\Projects" });
        var response = await _client.PostAsync(
            "/api/assemblies/inspect-folder",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("UNC", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InspectFolder_RejectsSystemDirectoryScan()
    {
        var winDir = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        var payload = JsonSerializer.Serialize(new { FolderPath = winDir });
        var response = await _client.PostAsync(
            "/api/assemblies/inspect-folder",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("directory di sistema", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InspectSolution_RejectsInvalidFileExtensions()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.txt");
        await File.WriteAllTextAsync(tempFile, "not a solution");
        try
        {
            var payload = JsonSerializer.Serialize(new { SolutionOrFolderPath = tempFile });
            var response = await _client.PostAsync(
                "/api/solution/inspect",
                new StringContent(payload, Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains(".sln", content, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            if (File.Exists(tempFile)) File.Delete(tempFile);
        }
    }

    [Fact]
    public async Task InspectSolution_RejectsUncPaths()
    {
        var payload = JsonSerializer.Serialize(new { SolutionOrFolderPath = @"\\remote\share\Legacy.sln" });
        var response = await _client.PostAsync(
            "/api/solution/inspect",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("UNC", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InspectMultipart_RejectsNonDllExeExtensions()
    {
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("alert('test')"));
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/plain");
        form.Add(fileContent, "file", "malicious_script.js");

        var response = await _client.PostAsync("/api/assemblies/inspect", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("non supportata", content, StringComparison.OrdinalIgnoreCase);
    }
}
