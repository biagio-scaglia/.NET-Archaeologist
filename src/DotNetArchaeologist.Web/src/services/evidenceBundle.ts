import type { EvidenceBundle, EvidenceBundleValidationResult } from '../types/api'

export async function fetchAssemblyEvidenceBundle(sessionId: string): Promise<EvidenceBundle> {
  const response = await fetch(`/api/assemblies/${encodeURIComponent(sessionId)}/evidence-bundle`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Errore HTTP ${response.status} durante il recupero dell'Evidence Bundle dell'assembly.`)
  }
  return response.json()
}

export async function fetchSolutionEvidenceBundle(solutionOrFolderPath: string): Promise<EvidenceBundle> {
  const response = await fetch('/api/solution/evidence-bundle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solutionOrFolderPath })
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Errore HTTP ${response.status} durante il recupero dell'Evidence Bundle della solution.`)
  }
  return response.json()
}

export async function validateEvidenceBundle(bundleJson: string): Promise<EvidenceBundleValidationResult> {
  const response = await fetch('/api/evidence-bundle/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bundleJson })
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Errore HTTP ${response.status} durante la validazione dell'Evidence Bundle.`)
  }
  return response.json()
}
