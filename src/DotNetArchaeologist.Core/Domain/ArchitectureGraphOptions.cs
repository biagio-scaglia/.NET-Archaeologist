namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Opzioni di configurazione per la generazione del grafo architetturale.
/// </summary>
public sealed record ArchitectureGraphOptions(
    bool IncludeMemberReferences = true,
    bool IncludeExternalTypes = true,
    int MaxReferencedNodes = 500);
