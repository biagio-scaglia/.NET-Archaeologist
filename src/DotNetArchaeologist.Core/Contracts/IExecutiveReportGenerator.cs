using DotNetArchaeologist.Core.Domain;

namespace DotNetArchaeologist.Core.Contracts;

/// <summary>
/// Contratto per la generazione di report tecnici esecutivi in linguaggio naturale e formati di esportazione.
/// </summary>
public interface IExecutiveReportGenerator
{
    /// <summary>
    /// Genera un report esecutivo completo a partire dalla mappa complessiva della Solution.
    /// </summary>
    ExecutiveReport GenerateReport(SolutionDescriptor solution);

    /// <summary>
    /// Genera un report esecutivo specifico per un singolo assembly binario ispezionato.
    /// </summary>
    ExecutiveReport GenerateReport(AssemblyDescriptor assembly);
}
