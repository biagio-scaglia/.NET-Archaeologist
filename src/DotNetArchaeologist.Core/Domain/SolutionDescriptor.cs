using System.Collections.Generic;

namespace DotNetArchaeologist.Core.Domain;

/// <summary>
/// Categoria architetturale del componente o del progetto.
/// </summary>
public enum ComponentCategory
{
    Service,
    Database,
    Batch,
    Web,
    Domain,
    Test,
    Library
}

/// <summary>
/// Dettaglio di un endpoint o operazione di servizio (WCF OperationContract, Web API Action, ecc.).
/// </summary>
public sealed record ServiceEndpointDescriptor(
    string Name,
    string? HttpMethodOrContract,
    string? RouteOrAction,
    string? ReturnType,
    IReadOnlyList<string> Parameters);

/// <summary>
/// Descrittore di un servizio o microservizio rilevato (WCF, REST Web API, gRPC, SOAP).
/// </summary>
public sealed record DiscoveredServiceDescriptor(
    string ServiceName,
    string ProjectName,
    string Technology,
    string? ContractInterface,
    string? ImplementationType,
    string? AssemblyPath,
    IReadOnlyList<ServiceEndpointDescriptor> Endpoints);

/// <summary>
/// Descrittore di un componente di persistenza o database (DbContext, Repository, Stored Procedure, ecc.).
/// </summary>
public sealed record DiscoveredDatabaseDescriptor(
    string Name,
    string ProjectName,
    string Technology,
    string? BaseTypeOrPattern,
    string? AssemblyPath,
    IReadOnlyList<string> EntitiesOrTables,
    IReadOnlyList<string> DetectedStoredProceduresOrQueries);

/// <summary>
/// Descrittore di un componente batch, worker o processo in background.
/// </summary>
public sealed record DiscoveredBatchWorkerDescriptor(
    string WorkerName,
    string ProjectName,
    string Technology,
    string? EntryPointOrJobClass,
    string? AssemblyPath,
    IReadOnlyList<string> TriggersOrSchedules);

/// <summary>
/// Descrittore di un componente di dominio o libreria interna.
/// </summary>
public sealed record DiscoveredDomainComponentDescriptor(
    string Name,
    string ProjectName,
    string Category,
    string? AssemblyPath,
    int TotalTypes,
    IReadOnlyList<string> SampleTypes);

/// <summary>
/// Descrittore di un progetto appartenente alla Solution.
/// </summary>
public sealed record SolutionProjectDescriptor(
    string Name,
    string ProjectPath,
    string RelativePath,
    string? OutputAssemblyPath,
    bool AssemblyExists,
    ComponentCategory Category,
    IReadOnlyList<string> ProjectReferences,
    IReadOnlyList<string> PackageReferences,
    IReadOnlyList<string> DetectedTechnologies);

/// <summary>
/// Rappresenta la mappa complessiva del sistema ricostruita dall'analisi della Solution.
/// </summary>
public sealed record SolutionDescriptor(
    string Name,
    string SolutionPath,
    IReadOnlyList<SolutionProjectDescriptor> Projects,
    IReadOnlyList<DiscoveredServiceDescriptor> Services,
    IReadOnlyList<DiscoveredDatabaseDescriptor> Databases,
    IReadOnlyList<DiscoveredBatchWorkerDescriptor> BatchWorkers,
    IReadOnlyList<DiscoveredDomainComponentDescriptor> DomainComponents)
{
    public int TotalProjects => Projects.Count;
    public int TotalServices => Services.Count;
    public int TotalDatabases => Databases.Count;
    public int TotalBatchWorkers => BatchWorkers.Count;
}
