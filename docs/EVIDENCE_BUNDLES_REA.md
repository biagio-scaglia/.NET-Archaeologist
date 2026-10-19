# Interoperabilità Evidence Bundles & Integrazione REA

Questo documento illustra il funzionamento, il formato e i protocolli di interoperabilità dei **Fascicoli Evidenze Archeologiche (Evidence Bundles)** di **.NET Archaeologist**, concepiti per consentire lo scambio di dati analitici con la suite **REA (Reverse Engineer Anything)** e con agenti AI specializzati.

---

## 1. Principi Fondamentali & Zero-Execution

1. **Passività Assoluta**:
   - L'importazione e l'elaborazione dei file `.json` di Evidence Bundle opera a sola lettura (`read-only`).
   - I dati descrivono le proprietà e le anomalie osservate sul target ma **non contengono ed non eseguono mai codice a runtime** (nessuna invocazione di `Assembly.Load`, reflection attiva o esecuzione di script).
2. **Identificatori Canonici REA**:
   - Ogni evidenza oggettiva possiede un identificatore immutabile e deterministico nel formato:
     ```text
     ev_[a-f0-9]{64}
     ```
   - L'identificatore è calcolato tramite hashing SHA-256 dei parametri fondanti dell'evidenza (target SHA-256, categoria, soggetto, titolo e seed deterministico).
3. **Disaccoppiamento Runtime**:
   - Il backend locale di .NET Archaeologist non dipende da runtime esterni o server MCP in esecuzione. Lo scambio avviene esclusivamente tramite formati file aperti (`.json` e Markdown `.md`).

---

## 2. Struttura del Formato `DotNetArchaeologist.EvidenceBundle`

Un fascicolo Evidence Bundle è un documento JSON conforme al seguente schema:

```json
{
  "format": "DotNetArchaeologist.EvidenceBundle",
  "version": "1.0.0",
  "bundleId": "c56a8d8e7b1a432f91a5e1234567890a",
  "targetName": "LegacyEnterpriseSystem.sln",
  "targetSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "targetKind": "Solution",
  "createdAtUtc": "2026-10-19T10:15:00Z",
  "summary": "Evidence Bundle per la soluzione con 18 evidenze architetturali documentate a Zero-Execution.",
  "metadata": {
    "SolutionPath": "C:\\Projects\\LegacyEnterpriseSystem.sln",
    "ProjectCount": "4",
    "VerificationPolicy": "Zero-Execution Static Analysis"
  },
  "records": [
    {
      "evidenceId": "ev_4f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
      "category": "ServiceContract",
      "title": "Servizio rilevato: 'OrderService' (WCF SOAP)",
      "description": "Interfaccia/Contratto IOrderService con 3 endpoint.",
      "subject": "OrderService",
      "confidence": 1.0,
      "timestampUtc": "2026-10-19T10:15:00Z",
      "attributes": {
        "ServiceName": "OrderService",
        "Technology": "WCF SOAP",
        "ContractInterface": "IOrderService",
        "EndpointsCount": 3
      }
    }
  ]
}
```

### Categorie di Evidenze Rilevate

| Categoria | Descrizione |
|---|---|
| `AssemblyHeader` | Intestazione ECMA-335, target framework, MVID, conteggio tipi dichiarati |
| `TypeDefinition` | Visibilità, costrutti (Class, Interface, Struct), interfacce ereditate e signature |
| `ArchitectureGraph` | Topologia di nodi e archi vettoriali del grafo architetturale CAD |
| `ServiceContract` | Microservizi e contratti API (WCF SOAP, Web API REST, gRPC) |
| `PersistenceContext` | ORM e database (Entity Framework DbContext, Stored Procedure, tabelle) |
| `BatchWorker` | Applicazioni console, job schedulati, trigger in background |
| `ArchitecturalDebt` | Punteggio debito tecnico (0-100), rating, vulnerabilità architetturali e piano |

---

## 3. Endpoint API Dedicati

### 1. Esportazione per Assembly in Sessione
- **Metodo**: `GET /api/assemblies/{sessionId}/evidence-bundle`
- **Descrizione**: Genera e restituisce il fascicolo completo delle evidenze dell'assembly binario aperto, compreso l'hash SHA-256 reale dell'eseguibile/libreria.

### 2. Esportazione per Soluzione .NET (.sln)
- **Metodo**: `POST /api/solution/evidence-bundle`
- **Body**: `{ "solutionOrFolderPath": "C:\\Percorso\\Progetto.sln" }`
- **Descrizione**: Scansiona staticamente tutti i progetti, categorizza i componenti architetturali e restituisce il fascicolo evidenze consolidato.

### 3. Validazione & Lettura Passiva (Zero-Execution)
- **Metodo**: `POST /api/evidence-bundle/validate`
- **Body**: `{ "bundleJson": "{ ... }" }`
- **Descrizione**: Convalida sintassi, identificatori `ev_` e integrità senza alcun caricamento di codice a runtime.

---

## 4. Modalità di Utilizzo da Interfaccia Utente (Windows 98)

1. **Apertura Dialog**:
   - Dalla barra menu classica in alto, fare clic su `[📦 Evidenze REA...]`.
2. **Scheda "Ispezione Evidenze"**:
   - Mostra il target attivo, l'hash SHA-256 calcolato e il contatore delle evidenze.
   - Permette di filtrare istantaneamente per categoria o ricerca testuale.
   - Selezionando un record nella tabella, il pannello laterale mostra l'ID canonico `ev_...`, la confidenza e tutti gli attributi oggettivi.
   - Facendo clic su `[Esporta .json]`, il file viene salvato localmente sul filesystem dell'utente.
3. **Scheda "Importa / Valida Bundle (.json)"**:
   - Permette di caricare un file `.json` generato in precedenza o incollare il testo JSON grezzo per verificarne la conformità a Zero-Execution.
