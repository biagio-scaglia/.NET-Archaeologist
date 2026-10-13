using System;
using System.IO;
using System.Threading.Tasks;
using DotNetArchaeologist.Analysis.Engines;
using DotNetArchaeologist.Core.Domain;
using Xunit;

namespace DotNetArchaeologist.Analysis.Tests;

public sealed class SolutionInspectorTests
{
    [Fact]
    public async Task InspectSolutionAsync_ThrowsFileNotFound_WhenPathDoesNotExist()
    {
        var inspector = new SolutionInspector();
        var nonExistentPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString(), "fake.sln");

        await Assert.ThrowsAsync<FileNotFoundException>(() =>
            inspector.InspectSolutionAsync(nonExistentPath));
    }

    [Fact]
    public async Task InspectSolutionAsync_ParsesSolutionStructure_Correctly()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "DotNetArchaeologist_SlnTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        try
        {
            var slnPath = Path.Combine(tempDir, "SampleSystem.sln");
            var proj1Dir = Path.Combine(tempDir, "SampleService");
            var proj2Dir = Path.Combine(tempDir, "SampleData");
            Directory.CreateDirectory(proj1Dir);
            Directory.CreateDirectory(proj2Dir);

            var proj1File = Path.Combine(proj1Dir, "SampleService.csproj");
            var proj2File = Path.Combine(proj2Dir, "SampleData.csproj");

            await File.WriteAllTextAsync(proj1File, """
                <Project Sdk="Microsoft.NET.Sdk">
                  <PropertyGroup>
                    <TargetFramework>net8.0</TargetFramework>
                    <OutputType>Library</OutputType>
                  </PropertyGroup>
                  <ItemGroup>
                    <PackageReference Include="System.ServiceModel.Primitives" Version="6.0.0" />
                    <ProjectReference Include="..\SampleData\SampleData.csproj" />
                  </ItemGroup>
                </Project>
                """);

            await File.WriteAllTextAsync(proj2File, """
                <Project Sdk="Microsoft.NET.Sdk">
                  <PropertyGroup>
                    <TargetFramework>net8.0</TargetFramework>
                  </PropertyGroup>
                  <ItemGroup>
                    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
                  </ItemGroup>
                </Project>
                """);

            var slnContent = "Microsoft Visual Studio Solution File, Format Version 12.00\r\n" +
                "Project(\"{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}\") = \"SampleService\", \"SampleService\\SampleService.csproj\", \"{11111111-1111-1111-1111-111111111111}\"\r\n" +
                "EndProject\r\n" +
                "Project(\"{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}\") = \"SampleData\", \"SampleData\\SampleData.csproj\", \"{22222222-2222-2222-2222-222222222222}\"\r\n" +
                "EndProject\r\n";

            await File.WriteAllTextAsync(slnPath, slnContent);

            var inspector = new SolutionInspector();
            var descriptor = await inspector.InspectSolutionAsync(slnPath);

            Assert.Equal("SampleSystem", descriptor.Name);
            Assert.Equal(2, descriptor.TotalProjects);

            var svcProject = Assert.Single(descriptor.Projects, p => p.Name == "SampleService");
            Assert.Contains("SampleData", svcProject.ProjectReferences);
            Assert.Equal(ComponentCategory.Service, svcProject.Category);

            var dataProject = Assert.Single(descriptor.Projects, p => p.Name == "SampleData");
            Assert.Equal(ComponentCategory.Database, dataProject.Category);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }
    }

    [Fact]
    public async Task InspectSolutionAsync_CanInspectLocalLegacySolution_IfConfigured()
    {
        // Se configurata la variabile d'ambiente DOTNET_ARCHAEOLOGIST_TEST_SLN, esegue il test con la solution specificata
        var targetSln = Environment.GetEnvironmentVariable("DOTNET_ARCHAEOLOGIST_TEST_SLN");
        if (string.IsNullOrWhiteSpace(targetSln) || !File.Exists(targetSln))
        {
            return;
        }

        var inspector = new SolutionInspector();
        var result = await inspector.InspectSolutionAsync(targetSln);

        Assert.NotNull(result);
        Assert.True(result.TotalProjects > 0);
    }
}
