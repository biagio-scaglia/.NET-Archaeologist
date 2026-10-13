using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Core.Contracts;

/// <summary>
/// Contratto per la costruzione del grafo architetturale a partire dai metadati estratti.
/// </summary>
public interface IArchitectureGraphBuilder
{
    /// <summary>
    /// Costruisce il grafo dei nodi e delle relazioni (ereditarietà, interfacce, dipendenze)
    /// per l'assembly analizzato.
    /// </summary>
    /// <param name="assembly">Descrittore dell'assembly analizzato.</param>
    /// <returns>Grafo architetturale orientato.</returns>
    ArchitectureGraph BuildGraph(AssemblyDescriptor assembly);
}
