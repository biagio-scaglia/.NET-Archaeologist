# Roadmap di .NET Archaeologist

Questo documento definisce le milestone di sviluppo di **.NET Archaeologist**, organizzate in ordine sequenziale e corredate da criteri di verifica oggettivi.

---

## 📌 Panoramica delle Milestone

```
[M0: Inizializzazione & Governance] (Attuale)
                │
                ▼
[M1: Solution .NET & Metadata Engine]
                │
                ▼
[M2: Decompilazione C# & API Locale]
                │
                ▼
[M3: Frontend SPA & Code Viewer]
                │
                ▼
[M4: Grafo Architetturale Interattivo]
                │
                ▼
[M5: Report Markdown & Integrazione Evidenze REA]
                │
                ▼
[M6: Persistenza Locale SQLite]
```

---

## Milestone 0: Inizializzazione & Governance (Stato: In Corso)
**Obiettivo**: Allestire il repository open source con fondamenta architetturali chiare, documentate e verificabili.

- [x] Inizializzazione repository Git e associazione al remote GitHub ufficiale.
- [x] Configurazione del file `.gitignore` per .NET, Node.js e protezione dati/segreti.
- [x] Redazione del documento di architettura (`docs/ARCHITETTURA.md`).
- [x] Redazione delle linee guida di sviluppo (`docs/SVILUPPO.md`).
- [x] Redazione della roadmap sequenziale (`docs/ROADMAP.md`).
- [x] Definizione delle convenzioni per gli agenti AI (`AGENTS.md`).
- [x] Licenza open source (MIT).
- [ ] Primo commit atomico e push verificato su GitHub.

**Criteri di verifica**:
- Repository pulito, senza file non tracciati o residui.
- Cronologia Git coerente con messaggi semantici in italiano.
- Remote `origin` allineato con il branch `main`.

---

## Milestone 1: Solution .NET e Core Metadata Engine (Stato: Completata)
**Obiettivo**: Creare la Solution .NET e implementare la lettura passiva dei metadati CLI tramite `System.Reflection.Metadata`.

- [x] Creazione della solution `DotNetArchaeologist.slnx` (.NET 8).
- [x] Creazione del progetto `DotNetArchaeologist.Core` (modelli di dominio ed entità immutabili).
- [x] Creazione del progetto `DotNetArchaeologist.Analysis` con parser `MetadataReader`.
  - Ispezione intestazioni PE e metadati ECMA-335.
  - Estrazione di nomi di assembly, moduli, MVID e target framework.
  - Mappatura di Namespace, tipi (`Class`, `Interface`, `Struct`, `Enum`, `Delegate`, `Record`), membri e parametri.
  - Costruzione del grafo architetturale (`ArchitectureGraphBuilder`).
- [x] Creazione del progetto di test `DotNetArchaeologist.Core.Tests` (xUnit).
- [x] Creazione del progetto di test `DotNetArchaeologist.Analysis.Tests` (xUnit).
  - Test automatizzati su assembly in-memory compilati con Roslyn.
  - Test di conformità Zero-Execution (`IsolatedSecurityCheckAssembly`).
- [x] Script di automazione dei test (`scripts/run-tests.ps1`) e audit di sicurezza (`scripts/verify-offline-safety.ps1`).

**Criteri di verifica**:
- `dotnet build` completa senza warning o errori.
- Tutti i test xUnit passano con successo su assembly complessi con strutture gerarchiche.
- Nessuna esecuzione di codice target (`Assembly.Load` non deve essere mai richiamato).

---

## Milestone 2: Decompilazione C# e API HTTP Locale (Stato: Completata)
**Obiettivo**: Integrare il motore di decompilazione C# ILSpy e creare un backend locale minimale in ASP.NET Core.

- [x] Integrazione di `ICSharpCode.Decompiler` nel layer `Analysis`.
  - Servizio `CSharpDecompilerService` per la decompilazione sicura di un intero tipo, metodo o modulo.
  - Generazione di codice C# formattato e pulito con supporto C# moderno (`LanguageVersion.Latest`).
  - Definizione dell'interfaccia `IDecompilerService` in `Core.Contracts`.
- [x] Creazione del progetto `DotNetArchaeologist.Api` (ASP.NET Core Minimal API).
  - Binding locale esclusivo con policy CORS ristretta a `localhost` (`5173`, `3000`).
  - Store delle sessioni in memoria thread-safe (`InMemoryAssemblySessionStore`).
  - Endpoint di caricamento/ispezione file: `POST /api/assemblies/inspect` e `POST /api/assemblies/inspect-path`.
  - Endpoint per i metadati: `GET /api/assemblies/{sessionId}`.
  - Endpoint per l'albero dei tipi e namespace: `GET /api/assemblies/{sessionId}/tree`.
  - Endpoint per il grafo architetturale: `GET /api/assemblies/{sessionId}/graph`.
  - Endpoint di decompilazione mirata o globale: `GET /api/assemblies/{sessionId}/decompile?type=...&method=...`.
  - Endpoint di diagnostica: `GET /health`.
- [x] Gestione degli errori controllata (400 Bad Request, 404 Not Found, eccezioni gestite).
- [x] Creazione del progetto `tests/DotNetArchaeologist.Api.Tests` con xUnit e `WebApplicationFactory`.
  - Test end-to-end del ciclo completo di ispezione, albero, grafo e decompilazione.

---

## Milestone 3: Frontend SPA (React, TypeScript & 98.css) (Stato: Completata)
**Obiettivo**: Realizzare l'interfaccia utente web per navigare la struttura dell'assembly e visualizzare il codice decompilato con estetica retro Windows 98 (98.css) senza emoji.

- [x] Inizializzazione del frontend `DotNetArchaeologist.Web` (React 19 + Vite 8 + TypeScript).
- [x] Integrazione della libreria `98.css` per una fedele interfaccia desktop in stile Windows 98.
- [x] Design rigorosamente privo di emoji con badge tipizzati ([C], [I], [S], [E], [R], [D]).
- [x] Componenti realizzati:
  - `TitleBar`: barra del titolo Windows 98 con controlli finestra e nome assembly.
  - `MenuBar`: barra dei menu classici (File, Reimposta, Guida).
  - `OpenDialog`: dialog a schede per caricamento file o inserimento percorso locale.
  - `ExplorerTree`: albero di navigazione (`tree-view`) con filtro istantaneo di ricerca per tipo e namespace.
  - `DecompilerView`: visualizzatore di codice C# con font monospace, pulsanti di copia e selezione.
  - `MetadataInspector`: ispezione dettagliata delle definizioni di tipo, interfacce e tabella membri.
  - `StatusBar`: barra inferiore a campi incassati con stato, assembly, target runtime e tipo selezionato.
  - `AboutDialog`: finestra informativa sul software e sulla licenza MIT.
- [x] Connessione al backend locale tramite proxy Vite (`/api`).
- [x] Test unitari del frontend con Vitest e Testing Library (8/8 superati).
- [x] Build di produzione verificata (`npm run build`).

---

## Milestone 3.5: Archeologia di Solution (.sln) & Mappa di Sistema (Stato: Completata)
**Obiettivo**: Consentire l'apertura diretta di file Solution (`.sln`) o cartelle di progetto e identificare automaticamente la mappa architetturale del sistema: Microservizi/API, Database/Stored Procedure, Processi Batch e dipendenze proprietarie.

- [x] Contratti di dominio per Solution e ruoli architetturali (`ISolutionInspector`, `SolutionDescriptor`, `ComponentCategory`).
- [x] Motore di analisi `SolutionInspector`:
  - Parsing del file `.sln` ed estrazione dei progetti di codice (`.csproj`).
  - Parsing dei metadati di progetto (ProjectReference, PackageReference, OutputType, tecnologie).
  - Localizzazione automatica dei binari compilati in `bin/` (`.dll` o `.exe`).
  - Ispezione statica dei metadati ECMA-335 a Zero-Execution per categorizzare:
    - **Servizi & Microservizi**: contratti WCF SOAP (`[ServiceContract]`, `[MessageContract]`), controller ASP.NET Web API (REST) ed endpoint/operazioni esposte.
    - **Database & Persistenza**: contesti Entity Framework (`DbContext`, `ObjectContext`), pattern `Repository`, tabelle/entità mappate e rilevamento Stored Procedure / query SQL.
    - **Processi Batch & Workers**: applicazioni console, job schedulati, trigger ed entry point di esecuzione.
    - **Dominio & Modelli**: moduli condivisi e librerie di logica di business.
- [x] Endpoint backend dedicato `POST /api/solution/inspect`.
- [x] Componente frontend Windows 98 `SolutionOverview` con navigazione a schede (`[SVC]`, `[DB]`, `[BAT]`, `[PRJ]`) e pulsanti per passare all'istante alla decompilazione di qualsiasi componente.
- [x] Aggiornamento della finestra `OpenDialog` con la modalità Solution come prima scheda consigliata.
- [x] Suite di test automatizzati (37/37 superati: 26 xUnit backend + 11 Vitest frontend).

---

## Milestone 4: Grafo Architetturale Interattivo (Stato: Completata)
**Obiettivo**: Ricostruire e visualizzare le relazioni tra componenti in un grafo architetturale CAD interattivo fedele all'estetica retro Windows 98 (98.css).

- [x] Calcolo delle relazioni strutturali e semantiche nel backend (`ArchitectureGraphBuilder`):
  - Ereditarietà di classi e tipi base (`Inherits`).
  - Implementazione di contratti e interfacce (`Implements`).
  - Decodifica delle signature ECMA-335 a Zero-Execution con `MetadataSignatureTypeProvider` (`ISignatureTypeProvider`).
  - Mappatura automatica delle dipendenze di tipo attraverso campi, proprietà, parametri e valori di ritorno (`References`).
  - Configurazione avanzata con `ArchitectureGraphOptions` (inclusione/esclusione tipi esterni e riferimenti membri).
- [x] Endpoint backend dedicato `GET /api/assemblies/{sessionId}/graph` con query string `includeReferences` e `includeExternal`.
- [x] Grafo architetturale e disegno tecnico CAD Blueprint interattivo nel frontend (`TechnicalDiagram.tsx`):
  - Visualizzazione a doppia modalità: *Mappa di Sistema Solution* (4 colonne tematiche) e *Grafo Dipendenze Tipi & Relazioni*.
  - Nodi tipizzati in stile Windows 98 per Classi (`[C]`), Interfacce (`[I]`), Strutture (`[S]`), Enumerazioni (`[E]`) e Record (`[R]`).
  - Connettori Bézier vettoriali orientati con frecce piene, cave o tratteggiate a seconda del tipo di relazione (`Inherits`, `Implements`, `References`).
  - Barra di ricerca nodi istantanea con evidenziazione in tempo reale e selezione rapida.
  - Minimappa CAD / Radar Pan flottante con anteprima in scala della griglia e dei componenti.
  - Controlli CAD fluidi: Zoom percentualizzato (40% - 250%), Reset 1:1, filtri per categoria e modalità di connessione (*Focus*, *Tutte*, *Nessuna*).
- [x] Sincronizzazione bidirezionale completa tra Grafo e Decompilatore C#:
  - Cliccando su un blocco nel grafo si apre il pannello laterale con il pulsante *Visualizza Classe nel Decompilatore*, che apre direttamente il codice sorgente C#.
  - Dalla vista codice e dall'Ispettore Metadati, il pulsante *[Mostra nel Grafo Tecnico]* seleziona ed evidenzia immediatamente il nodo nel diagramma.
- [x] Suite completa di test automatizzati (62/62 superati: 46 xUnit backend + 16 Vitest frontend).

---

## Milestone 5: Esportazione Report & Integrazione Evidenze REA (Stato: In Corso)
**Obiettivo**: Fornire reportistica avanzata ed esportazione dei risultati per flussi assistiti da agenti AI.

- [x] Generatore di report tecnici esecutivi in linguaggio naturale con calcolo del debito architetturale (`ExecutiveReportGenerator`).
- [x] Endpoint API dedicati `POST /api/solution/report` e `GET /api/assemblies/{sessionId}/report`.
- [x] Interfaccia frontend per visualizzazione documento, stampa/salvataggio PDF nativo (A4 print-ready) e download Markdown (`.md`).
- [ ] Supporto all'esportazione/importazione di *Evidence Bundles* compatibili con il protocollo di reverse engineering assistito (REA).
- [ ] Documentazione su come condurre audit di sicurezza o analisi di debito tecnico tramite i report generati.

**Criteri di verifica**:
- Il report Markdown e la stampa PDF sono immediatamente consultabili, validi sintatticamente e completi di sintesi narrativa e piani di modernizzazione.

---

## Milestone 6: Persistenza e Sessioni Locali (SQLite)
**Obiettivo**: Memorizzare cronologia di indagine, annotazioni e preferenze di visualizzazione.

- [ ] Integrazione SQLite locale nel backend.
- [ ] Salvataggio dello stato della sessione (file aperti, nodi annotati, bookmark di codice).
- [ ] Possibilità di riprendere un'indagine archeologica interrotta.

**Criteri di verifica**:
- Riavviando l'applicazione, le sessioni e le annotazioni precedenti rimangono intatte.
