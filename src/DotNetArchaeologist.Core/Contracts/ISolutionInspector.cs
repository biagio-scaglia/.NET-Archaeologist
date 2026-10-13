using System.Threading;
using System.Threading.Tasks;
using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Core.Contracts;

/// <summary>
/// Contratto per l'ispezione architetturale passiva di una Solution .NET (.sln) o di una cartella di progetto.
/// Ricostruisce la mappa del sistema identificando Microservizi, Database, Batch e dipendenze tra progetti.
/// </summary>
public interface ISolutionInspector
{
    /// <summary>
    /// Ispeziona un file .sln o una cartella contenente una solution, rilevando ruoli architetturali e componenti.
    /// </summary>
    /// <param name="solutionOrFolderPath">Percorso del file .sln o della cartella di progetto.</param>
    /// <param name="cancellationToken">Token di annullamento.</param>
    /// <returns>Descrittore completo della Solution e dei ruoli rilevati.</returns>
    Task<SolutionDescriptor> InspectSolutionAsync(string solutionOrFolderPath, CancellationToken cancellationToken = default);
}
