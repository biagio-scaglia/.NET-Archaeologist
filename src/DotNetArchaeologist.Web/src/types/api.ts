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
