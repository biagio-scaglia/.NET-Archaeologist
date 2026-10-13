using System;
using System.IO;
using System.Threading.Tasks;
using DotNetArchaeologist.Analysis.Engines;
using DotNetArchaeologist.Analysis.Tests.Helpers;
using Xunit;

namespace DotNetArchaeologist.Analysis.Tests;

public sealed class CSharpDecompilerServiceTests
{
    private readonly CSharpDecompilerService _decompiler = new();

    private const string SampleSource = """
        namespace AccountingSystem;

        public class InvoiceCalculator
        {
            public decimal TaxRate { get; set; } = 0.22m;

            public decimal CalculateTotal(decimal netAmount)
            {
                if (netAmount < 0)
                {
                    throw new System.ArgumentException("Net amount cannot be negative");
                }
                return netAmount * (1 + TaxRate);
            }
        }
        """;

    [Fact]
    public async Task DecompileTypeAsync_ReturnsFaithfulCSharpSourceCode()
    {
        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(SampleSource, "AccountingAssembly");

        var csharpCode = await _decompiler.DecompileTypeAsync(stream, "AccountingSystem.InvoiceCalculator");

        Assert.NotNull(csharpCode);
        Assert.Contains("class InvoiceCalculator", csharpCode);
        Assert.Contains("CalculateTotal", csharpCode);
        Assert.Contains("TaxRate", csharpCode);
    }

    [Fact]
    public async Task DecompileMethodAsync_ReturnsMethodBodySpecifically()
    {
        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(SampleSource, "AccountingAssembly");

        var methodCode = await _decompiler.DecompileMethodAsync(
            stream,
            "AccountingSystem.InvoiceCalculator",
            "CalculateTotal");

        Assert.NotNull(methodCode);
        Assert.Contains("CalculateTotal", methodCode);
        Assert.Contains("ArgumentException", methodCode);
    }

    [Fact]
    public async Task DecompileWholeAssemblyAsync_ReturnsEntireModuleContent()
    {
        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(SampleSource, "AccountingAssembly");

        var wholeCode = await _decompiler.DecompileWholeAssemblyAsync(stream);

        Assert.NotNull(wholeCode);
        Assert.Contains("namespace AccountingSystem", wholeCode);
        Assert.Contains("class InvoiceCalculator", wholeCode);
    }

    [Fact]
    public async Task DecompileTypeAsync_ThrowsWhenTypeNotFound()
    {
        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(SampleSource, "AccountingAssembly");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _decompiler.DecompileTypeAsync(stream, "AccountingSystem.NonExistentClass"));
    }

    [Fact]
    public async Task DecompileMethodAsync_ThrowsWhenMethodNotFound()
    {
        await using var stream = TestAssemblyGenerator.CreateAssemblyStream(SampleSource, "AccountingAssembly");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _decompiler.DecompileMethodAsync(stream, "AccountingSystem.InvoiceCalculator", "MissingMethod"));
    }
}
