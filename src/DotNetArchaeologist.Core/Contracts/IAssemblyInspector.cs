using System.IO;
using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Core.Contracts;

/// <summary>
/// Contratto per l'ispezione statica e passiva di un assembly .NET.
/// Garantisce la sicurezza assoluta: nessun assembly viene caricato per l'esecuzione a runtime.
/// </summary>
public interface IAssemblyInspector
{
    /// <summary>
    /// Ispeziona i metadati di un assembly a partire da uno stream binario in sola lettura.
    /// </summary>
    /// <param name="peStream">Stream contenente il file binario PE/CLI.</param>
    /// <param name="sourceIdentifier">Identificatore o nome logico della sorgente (es. nome file).</param>
    /// <param name="cancellationToken">Token di cancellazione.</param>
    /// <returns>Descrittore completo dei metadati dell'assembly.</returns>
    Task<AssemblyDescriptor> InspectAsync(
        Stream peStream,
        string? sourceIdentifier = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Ispeziona i metadati di un file assembly locale in sola lettura.
    /// </summary>
    /// <param name="filePath">Percorso locale del file binario (.dll, .exe).</param>
    /// <param name="cancellationToken">Token di cancellazione.</param>
    /// <returns>Descrittore completo dei metadati dell'assembly.</returns>
    Task<AssemblyDescriptor> InspectFileAsync(
        string filePath,
        CancellationToken cancellationToken = default);
}
