using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.RegularExpressions;
using DotNetArchaeologist.Analysis.Reporting;
using DotNetArchaeologist.Core.Domain;
using Xunit;

namespace DotNetArchaeologist.Analysis.Tests;

public class EvidenceBundleServiceTests
{
    private static readonly Regex EvidenceIdRegex = new(@"^ev_[0-9a-f]{64}$", RegexOptions.Compiled);

    [Fact]
    public void CreateFromAssembly_GeneratesValidEvidenceBundle_WithCanonicalEvidenceIds()
    {
        // Arrange
        var service = new EvidenceBundleService();
        var members = new List<MemberDescriptor>
        {
            new("GetCustomerById", MemberKind.Method, "Customer", AccessibilityModifier.Public, false, false, false, Array.Empty<ParameterDescriptor>(), Array.Empty<string>())
        };

        var types = new List<TypeDescriptor>
        {
            new(
                FullName: "Legacy.Service.CustomerService",
                Namespace: "Legacy.Service",
                Name: "CustomerService",
                Kind: TypeKind.Class,
                Accessibility: AccessibilityModifier.Public,
                IsAbstract: false,
                IsSealed: false,
                IsStatic: false,
                IsNested: false,
                BaseTypeFullName: "System.Object",
                ImplementedInterfaces: new[] { "Legacy.Contracts.ICustomerService" },
                Members: members,
                Attributes: Array.Empty<string>())
        };

        var assembly = new AssemblyDescriptor(
            Name: "TestLegacyModule",
            Version: new Version(1, 0, 0, 0),
            Culture: null,
            PublicKeyToken: null,
            TargetFramework: ".NETFramework,Version=v4.8",
            Mvid: Guid.NewGuid(),
            References: Array.Empty<AssemblyReferenceDescriptor>(),
            Types: types);

        var dummyBytes = new byte[] { 0x4D, 0x5A, 0x90, 0x00, 0x03 };

        // Act
        var bundle = service.CreateFromAssembly(assembly, binaryBytes: dummyBytes);

        // Assert
        Assert.NotNull(bundle);
        Assert.Equal(EvidenceBundle.DefaultFormat, bundle.Format);
        Assert.Equal(EvidenceBundle.CurrentVersion, bundle.Version);
        Assert.Equal("TestLegacyModule", bundle.TargetName);
        Assert.Equal("Assembly", bundle.TargetKind);
        Assert.False(string.IsNullOrWhiteSpace(bundle.TargetSha256));
        Assert.NotEmpty(bundle.Records);

        foreach (var record in bundle.Records)
        {
            Assert.Matches(EvidenceIdRegex, record.EvidenceId);
            Assert.False(string.IsNullOrWhiteSpace(record.Title));
            Assert.False(string.IsNullOrWhiteSpace(record.Category));
            Assert.InRange(record.Confidence, 0.0, 1.0);
        }
    }

    [Fact]
    public void CreateFromSolution_GeneratesValidEvidenceBundle_CoveringAllCategories()
    {
        // Arrange
        var service = new EvidenceBundleService();
        var projects = new List<SolutionProjectDescriptor>
        {
            new(
                Name: "OrderProcessing.Api",
                ProjectPath: "src/OrderProcessing.Api/OrderProcessing.Api.csproj",
                RelativePath: "src/OrderProcessing.Api",
                OutputAssemblyPath: "bin/Debug/net472/OrderProcessing.Api.dll",
                AssemblyExists: true,
                Category: ComponentCategory.Service,
                ProjectReferences: Array.Empty<string>(),
                PackageReferences: new[] { "Newtonsoft.Json" },
                DetectedTechnologies: new[] { "WCF", "ASP.NET Web API" })
        };

        var services = new List<DiscoveredServiceDescriptor>
        {
            new(
                ServiceName: "OrderService",
                ProjectName: "OrderProcessing.Api",
                Technology: "WCF SOAP",
                ContractInterface: "IOrderService",
                ImplementationType: "OrderService",
                AssemblyPath: null,
                Endpoints: new List<ServiceEndpointDescriptor>
                {
                    new("SubmitOrder", "POST", "/submit", "void", Array.Empty<string>())
                })
        };

        var databases = new List<DiscoveredDatabaseDescriptor>
        {
            new(
                Name: "OrderDbContext",
                ProjectName: "OrderProcessing.Api",
                Technology: "Entity Framework 6",
                BaseTypeOrPattern: "DbContext",
                AssemblyPath: null,
                EntitiesOrTables: new[] { "Orders", "OrderLines" },
                DetectedStoredProceduresOrQueries: new[] { "sp_ArchiveOldOrders" })
        };

        var batchWorkers = new List<DiscoveredBatchWorkerDescriptor>
        {
            new(
                WorkerName: "OrderNightlyReconciler",
                ProjectName: "OrderProcessing.Api",
                Technology: "Console Task",
                EntryPointOrJobClass: "Program.Main",
                AssemblyPath: null,
                TriggersOrSchedules: new[] { "Cron(0 2 * * *)" })
        };

        var solution = new SolutionDescriptor(
            Name: "LegacyEnterpriseSystem",
            SolutionPath: "C:\\Projects\\LegacyEnterpriseSystem.sln",
            Projects: projects,
            Services: services,
            Databases: databases,
            BatchWorkers: batchWorkers,
            DomainComponents: Array.Empty<DiscoveredDomainComponentDescriptor>());

        // Act
        var bundle = service.CreateFromSolution(solution);

        // Assert
        Assert.NotNull(bundle);
        Assert.Equal("LegacyEnterpriseSystem", bundle.TargetName);
        Assert.Equal("Solution", bundle.TargetKind);
        Assert.Contains(bundle.Records, r => r.Category == "ServiceContract");
        Assert.Contains(bundle.Records, r => r.Category == "PersistenceContext");
        Assert.Contains(bundle.Records, r => r.Category == "BatchWorker");
        Assert.All(bundle.Records, r => Assert.Matches(EvidenceIdRegex, r.EvidenceId));
    }

    [Fact]
    public void ValidateAndRead_WithValidJson_ReturnsSuccess()
    {
        // Arrange
        var service = new EvidenceBundleService();
        var originalBundle = new EvidenceBundle
        {
            TargetName = "ValidatedAssembly",
            TargetSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            Records = new List<EvidenceRecord>
            {
                new()
                {
                    EvidenceId = "ev_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                    Category = "TypeDefinition",
                    Title = "Test observation",
                    Subject = "Core.Service"
                }
            }
        };

        var json = JsonSerializer.Serialize(originalBundle);

        // Act
        var result = service.ValidateAndRead(json);

        // Assert
        Assert.True(result.IsValid);
        Assert.Null(result.ErrorMessage);
        Assert.NotNull(result.Bundle);
        Assert.Equal("ValidatedAssembly", result.Bundle.TargetName);
        Assert.Equal(1, result.RecordCount);
    }

    [Fact]
    public void ValidateAndRead_WithInvalidOrEmptyJson_ReturnsFailure()
    {
        // Arrange
        var service = new EvidenceBundleService();

        // Act & Assert
        var emptyResult = service.ValidateAndRead("");
        Assert.False(emptyResult.IsValid);

        var corruptedResult = service.ValidateAndRead("{ not-valid-json }");
        Assert.False(corruptedResult.IsValid);
        Assert.NotNull(corruptedResult.ErrorMessage);
    }
}
