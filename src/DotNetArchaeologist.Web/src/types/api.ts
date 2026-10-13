export interface AssemblyReference {
  name: string
  version: string | null
  culture: string | null
  publicKeyToken: string | null
}

export interface MemberInfo {
  name: string
  kind: 'Method' | 'Constructor' | 'Property' | 'Field' | 'Event'
  returnTypeOrType: string
  accessibility: string
  isStatic: boolean
  isVirtual: boolean
  isAbstract: boolean
}

export interface TypeInfo {
  fullName: string
  namespace: string
  name: string
  kind: 'Class' | 'Interface' | 'Struct' | 'Enum' | 'Delegate' | 'Record'
  accessibility: string
  isAbstract: boolean
  isSealed: boolean
  isStatic: boolean
  isNested: boolean
  baseTypeFullName: string | null
  implementedInterfaces: string[]
  members: MemberInfo[]
  attributes: string[]
}

export interface AssemblyDescriptor {
  name: string
  version: string | null
  culture: string | null
  publicKeyToken: string | null
  targetFramework: string | null
  mvid: string
  totalTypesCount: number
  references: AssemblyReference[]
  types: TypeInfo[]
}

export interface TreeTypeItem {
  fullName: string
  name: string
  kind: string
  accessibility: string
  isAbstract: boolean
  isSealed: boolean
  isStatic: boolean
  membersCount: number
}

export interface TreeNamespaceGroup {
  namespace: string
  types: TreeTypeItem[]
}

export interface AssemblyTreeResponse {
  assemblyName: string
  totalTypes: number
  namespaces: TreeNamespaceGroup[]
}

export interface InspectResponse {
  sessionId: string
  assembly: AssemblyDescriptor
}

export interface DecompileResponse {
  sessionId: string
  type: string | null
  method: string | null
  code: string
}

export interface DiscoveredAssemblyItem {
  name: string
  filePath: string
  relativePath: string
  version: string
  typesCount: number
  sizeBytes: number
}

export interface InspectFolderResponse {
  folderPath: string
  totalFound: number
  assemblies: DiscoveredAssemblyItem[]
}

export interface ServiceEndpointDescriptor {
  name: string
  httpMethodOrContract: string | null
  routeOrAction: string | null
  returnType: string | null
  parameters: string[]
}

export interface DiscoveredServiceDescriptor {
  serviceName: string
  projectName: string
  technology: string
  contractInterface: string | null
  implementationType: string | null
  assemblyPath: string | null
  endpoints: ServiceEndpointDescriptor[]
}

export interface DiscoveredDatabaseDescriptor {
  name: string
  projectName: string
  technology: string
  baseTypeOrPattern: string | null
  assemblyPath: string | null
  entitiesOrTables: string[]
  detectedStoredProceduresOrQueries: string[]
}

export interface DiscoveredBatchWorkerDescriptor {
  workerName: string
  projectName: string
  technology: string
  entryPointOrJobClass: string | null
  assemblyPath: string | null
  triggersOrSchedules: string[]
}

export interface DiscoveredDomainComponentDescriptor {
  name: string
  projectName: string
  category: string
  assemblyPath: string | null
  totalTypes: number
  sampleTypes: string[]
}

export interface SolutionProjectDescriptor {
  name: string
  projectPath: string
  relativePath: string
  outputAssemblyPath: string | null
  assemblyExists: boolean
  category: 'Service' | 'Database' | 'Batch' | 'Web' | 'Domain' | 'Test' | 'Library'
  projectReferences: string[]
  packageReferences: string[]
  detectedTechnologies: string[]
}

export interface SolutionDescriptor {
  name: string
  solutionPath: string
  projects: SolutionProjectDescriptor[]
  services: DiscoveredServiceDescriptor[]
  databases: DiscoveredDatabaseDescriptor[]
  batchWorkers: DiscoveredBatchWorkerDescriptor[]
  domainComponents: DiscoveredDomainComponentDescriptor[]
  totalProjects: number
  totalServices: number
  totalDatabases: number
  totalBatchWorkers: number
}

export type RelationKind = 'Inherits' | 'Implements' | 'References' | 'Calls' | 'Declares'

export interface GraphNodeDto {
  id: string
  label: string
  kind: string
  namespace: string | null
  metadata: Record<string, string>
}

export interface GraphEdgeDto {
  id: string
  source: string
  target: string
  relation: RelationKind
  label: string
}

export interface ArchitectureGraphDto {
  nodes: GraphNodeDto[]
  edges: GraphEdgeDto[]
  totalNodes: number
  totalEdges: number
}
