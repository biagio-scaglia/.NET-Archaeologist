import type {
  ArchaeologistChatRequest,
  ArchaeologistChatResponse,
  ArchaeologistStatusResponse
} from '../types/api'

/**
 * Recupera lo stato del provider AI dell'Archeologo (Ollama / Cloud / Offline).
 */
export async function getArchaeologistStatus(): Promise<ArchaeologistStatusResponse> {
  try {
    const res = await fetch('/api/archaeologist/status')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    return await res.json()
  } catch (error) {
    return {
      provider: 'offline',
      baseUrl: 'locale',
      model: 'euristico-locale',
      hasApiKey: false,
      isConfigured: false
    }
  }
}

/**
 * Invia una richiesta di analisi o domanda al consulente AI dell'Archeologo.
 */
export async function askArchaeologist(
  request: ArchaeologistChatRequest,
  signal?: AbortSignal
): Promise<ArchaeologistChatResponse> {
  try {
    const res = await fetch('/api/archaeologist/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error || `HTTP ${res.status}: ${res.statusText}`)
    }

    return await res.json()
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error
    }
    return {
      success: false,
      answer: `Si è verificato un problema nella comunicazione con il servizio AI: ${error.message}. Verifica che il backend sia attivo e che le impostazioni in .env siano corrette.`,
      modelUsed: 'nessuno',
      provider: 'offline',
      diagnosticMessage: error.message,
      fallbackUsed: true
    }
  }
}
