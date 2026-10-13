using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace DotNetArchaeologist.Core.Contracts;

/// <summary>
/// Contratto per la decompilazione del codice IL in codice sorgente C#.
/// </summary>
public interface IDecompilerService
{
    /// <summary>
    /// Decompila la definizione di un tipo specifico (classe, interfaccia, struct, enum, record) in codice C#.
    /// </summary>
    /// <param name="peStream">Stream contenente il binario .NET in sola lettura.</param>
    /// <param name="typeFullName">Nome completo del tipo (es. "MyNamespace.MyClass").</param>
    /// <param name="cancellationToken">Token di cancellazione.</param>
    /// <returns>Codice sorgente C# decompilato.</returns>
    Task<string> DecompileTypeAsync(
        Stream peStream,
        string typeFullName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Decompila un singolo metodo di un tipo in codice C#.
    /// </summary>
    /// <param name="peStream">Stream contenente il binario .NET in sola lettura.</param>
    /// <param name="typeFullName">Nome completo del tipo contenitore.</param>
    /// <param name="methodName">Nome del metodo o costruttore da decompilare.</param>
    /// <param name="cancellationToken">Token di cancellazione.</param>
    /// <returns>Codice sorgente C# decompilato del metodo.</returns>
    Task<string> DecompileMethodAsync(
        Stream peStream,
        string typeFullName,
        string methodName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Decompila l'intero assembly in codice C# strutturato.
    /// </summary>
    /// <param name="peStream">Stream contenente il binario .NET in sola lettura.</param>
    /// <param name="cancellationToken">Token di cancellazione.</param>
    /// <returns>Codice sorgente C# decompilato dell'assembly.</returns>
    Task<string> DecompileWholeAssemblyAsync(
        Stream peStream,
        CancellationToken cancellationToken = default);
}
