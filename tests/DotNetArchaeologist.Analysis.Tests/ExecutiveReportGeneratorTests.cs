using System;
using System.Collections.Generic;
using DotNetArchaeologist.Analysis.Reporting;
using DotNetArchaeologist.Core.Domain;
using Xunit;

namespace DotNetArchaeologist.Analysis.Tests;

public class ExecutiveReportGeneratorTests
{
    private readonly ExecutiveReportGenerator _generator = new();

    [Fact]
    public void GenerateReport_ForSolution_CalculatesDebtScoreAndGeneratesNaturalLanguageNarrative()
    {
        // Arrange
        var solution = new SolutionDescriptor(
            Name: "ContosoEnterprise",
            SolutionPath: @"C:\Progetti\ContosoEnterprise.sln",
            Projects: new List<SolutionProjectDescriptor>
            {
                new("ContosoEnterprise.Web", @"C:\Progetti\Web\Web.csproj", "Web\\Web.csproj", @"C:\Progetti\bin\Web.dll", true, ComponentCategory.Web, new[] { "ContosoEnterprise.Service" }, Array.Empty<string>(), new[] { "ASP.NET MVC", ".NET Framework 4.8" }),
                new("ContosoEnterprise.Service", @"C:\Progetti\Service\Service.csproj", "Service\\Service.csproj", @"C:\Progetti\bin\Service.dll", true, ComponentCategory.Service, Array.Empty<string>(), new[] { "System.ServiceModel" }, new[] { "WCF Service (SOAP)" })
            },
            Services: new List<DiscoveredServiceDescriptor>
            {
                new("WsBillingService", "ContosoEnterprise.Service", "WCF Service (SOAP)", "IWsBillingService", "WsBillingService", @"C:\Progetti\bin\Service.dll", new List<ServiceEndpointDescriptor>
                {
                    new("ProcessInvoice", "SOAP Action", "ProcessInvoice", "bool", new[] { "int invoiceId" })
                })
            },
            Databases: new List<DiscoveredDatabaseDescriptor>
            {
                new("ContosoDbContext", "ContosoEnterprise.Data", "Entity Framework", "ObjectContext", @"C:\Progetti\bin\Data.dll", new[] { "Invoices", "Customers" }, new[] { "sp_InsertInvoice" })
            },
            BatchWorkers: new List<DiscoveredBatchWorkerDescriptor>
            {
                new("BillingBatchWorker", "ContosoEnterprise.Batch", "Console Batch Worker", "Program.Main", @"C:\Progetti\bin\Batch.exe", new[] { "Console EntryPoint (Main)" })
            },
            DomainComponents: Array.Empty<DiscoveredDomainComponentDescriptor>());

        // Act
        var report = _generator.GenerateReport(solution);

        // Assert
        Assert.NotNull(report);
        Assert.Equal("ContosoEnterprise", report.TargetName);
        Assert.Equal("Solution", report.TargetType);
        Assert.True(report.TechDebtScore >= 60, $"TechDebtScore should reflect legacy components, was {report.TechDebtScore}");
        Assert.NotEmpty(report.TechDebtRating);
        Assert.Contains("L'analisi architetturale condotta sulla soluzione 'ContosoEnterprise'", report.ExecutiveSummary);
        Assert.Contains("WCF", report.ExecutiveSummary);
        Assert.Contains("ObjectContext", report.ExecutiveSummary);
        Assert.Contains("stored procedure", report.ExecutiveSummary);

        Assert.NotEmpty(report.KeyFindings);
        Assert.Single(report.ServiceCatalog);
        Assert.Equal("WsBillingService", report.ServiceCatalog[0].ServiceName);
        Assert.Single(report.DataPersistence);
        Assert.Contains("Invoices", report.DataPersistence[0].Tables);
        Assert.Contains("sp_InsertInvoice", report.DataPersistence[0].StoredProcedures);
        Assert.Single(report.BatchWorkers);
        Assert.NotEmpty(report.IdentifiedRisks);
        Assert.NotEmpty(report.ModernizationRoadmap);

        // Verifica contenuto Markdown esportabile
        Assert.Contains("# Report Architetturale Esecutivo: ContosoEnterprise", report.MarkdownContent);
        Assert.Contains("## 1. Sintesi Esecutiva Narrativa", report.MarkdownContent);
        Assert.Contains("## 2. Superficie di Esposizione e Servizi API", report.MarkdownContent);
        Assert.Contains("## 6. Piano di Modernizzazione Strategica", report.MarkdownContent);
    }

    [Fact]
    public void GenerateReport_ForAssembly_GeneratesAssemblyReport()
    {
        // Arrange
        var assembly = new AssemblyDescriptor(
            Name: "ContosoCoreLib",
            Version: new Version(1, 0, 0, 0),
            Culture: "neutral",
            PublicKeyToken: null,
            TargetFramework: ".NETFramework,Version=v4.8",
            Mvid: Guid.NewGuid(),
            References: new List<AssemblyReferenceDescriptor>
            {
                new("mscorlib", new Version(4, 0, 0, 0), null, null),
                new("System", new Version(4, 0, 0, 0), null, null)
            },
            Types: new List<TypeDescriptor>
            {
                new("Contoso.Core.CustomerService", "Contoso.Core", "CustomerService", TypeKind.Class, AccessibilityModifier.Public, false, false, false, false, "System.Object", new[] { "Contoso.Core.ICustomerService" }, Array.Empty<MemberDescriptor>(), Array.Empty<string>())
            });

        // Act
        var report = _generator.GenerateReport(assembly);

        // Assert
        Assert.NotNull(report);
        Assert.Equal("ContosoCoreLib", report.TargetName);
        Assert.Equal("Assembly", report.TargetType);
        Assert.Contains(".NET Framework", report.ExecutiveSummary);
        Assert.NotEmpty(report.KeyFindings);
        Assert.NotEmpty(report.ModernizationRoadmap);
        Assert.Contains("# Report Architetturale Esecutivo: ContosoCoreLib", report.MarkdownContent);
    }
}
