using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Core.Contracts;

/// <summary>
/// Contratto per la generazione, serializzazione ed importazione a sola lettura
/// di Evidence Bundle conformi ai principi di Zero-Execution.
/// </summary>
public interface IEvidenceBundleService
{
    /// <summary>
    /// Crea un fascicolo di evidenze a partire da un assembly ispezionato,
    /// con eventuale grafo architetturale e report esecutivo collegati.
    /// </summary>
    EvidenceBundle CreateFromAssembly(
        AssemblyDescriptor assembly,
        ArchitectureGraph? graph = null,
        ExecutiveReport? report = null,
        byte[]? binaryBytes = null);

    /// <summary>
    /// Crea un fascicolo di evidenze a partire da una soluzione .NET (.sln) ispezionata.
    /// </summary>
    EvidenceBundle CreateFromSolution(
        SolutionDescriptor solution,
        ExecutiveReport? report = null);

    /// <summary>
    /// Valida e deserializza in sicurezza un Evidence Bundle in formato JSON,
    /// garantendo che nessun codice venga invocato a runtime.
    /// </summary>
    EvidenceBundleValidationResult ValidateAndRead(string jsonContent);
}
