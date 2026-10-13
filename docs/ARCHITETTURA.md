# Architettura di .NET Archaeologist

Questo documento illustra la visione architetturale, i principi di design e la separazione delle responsabilità per il progetto **.NET Archaeologist**.

---

## 1. Visione e Filosofia di Progetto

**.NET Archaeologist** nasce come strumento di ispezione e comprensione passiva di binari .NET. L'architettura deve riflettere quattro pilastri fondamentali:

1. **Sicurezza e Isolamento Assoluto (Zero Execution)**:
   Gli assembly forniti dall'utente possono provenire da origini non fidate o sconosciute. L'applicazione non deve mai eseguire l'assembly target, non deve invocarne metodi e non deve istanziare oggetti tramite Reflection a runtime. L'accesso avviene unicamente a livello di byte stream e parsing statico dei metadati ECMA-335.
2. **Offline-by-Design & Privacy Assoluta**:
   Nessun dato di analisi, nome di classe, codice decompilato o hash di file viene inviato a servizi cloud o API esterne.
3. **Architettura Proporzionata e Modulare**:
   Evitare sovradimensionamenti per l'MVP. Mantenere confini netti tra astrazioni di dominio, motori di decompilazione e layer di presentazione API/Web.
4. **Verificabilità e Integrità dei Dati**:
   I risultati presentati all'utente devono rispecchiare con precisione quanto registrato nelle tabelle dei metadati e nel flusso IL. Nessun dato fittizio o approssimato viene mostrato come reale.

---

## 2. Componenti del Sistema

L'architettura è suddivisa in una parte **Backend** (.NET / C#) e una parte **Frontend** (React / TypeScript).

```
+-------------------------------------------------------------+
|               DotNetArchaeologist.Web (SPA)                 |
|   React + TypeScript + Vite + React Flow + Syntax Viewer    |
+------------------------------+------------------------------+
                               | Chiamate HTTP Locali (JSON)
+------------------------------v------------------------------+
|               DotNetArchaeologist.Api                       |
|   ASP.NET Core Minimal API (Server locale su localhost)     |
+------------------------------+------------------------------+
                               | Dipendenza interna
+------------------------------v------------------------------+
|               DotNetArchaeologist.Analysis                  |
|   - System.Reflection.Metadata (Metadata Reader)            |
|   - ICSharpCode.Decompiler (C# Decompilatore ILSpy)         |
+------------------------------+------------------------------+
                               | Dipendenza interna
+------------------------------v------------------------------+
|               DotNetArchaeologist.Core                      |
|   - Modelli di Dominio (Assembly, Type, Member, Relazioni)  |
|   - Modelli di Grafo (GraphNode, GraphEdge)                 |
|   - Contratti e Interfacce di Analisi                       |
+-------------------------------------------------------------+
```

### 2.1 `DotNetArchaeologist.Core`
- **Scopo**: Libreria pura contenente i contratti e i modelli di dominio.
- **Dipendenze**: Nessuna dipendenza da framework esterni o librerie di terze parti.
- **Responsabilità**:
  - Definizione delle entità: `AssemblyMetadata`, `TypeDefinitionModel`, `MemberDescriptor`, `RelationshipType`.
  - Definizione delle strutture del grafo: `ArchitectureGraph`, `GraphNode`, `GraphEdge`.
  - Definizione delle interfacce dei servizi: `IAssemblyReader`, `IDecompilerService`.

### 2.2 `DotNetArchaeologist.Analysis`
- **Scopo**: Implementazione dei motori di analisi statica e decompilazione.
- **Dipendenze**: `DotNetArchaeologist.Core`, `System.Reflection.Metadata`, `ICSharpCode.Decompiler`.
- **Responsabilità**:
  - `MetadataAssemblyReader`: legge tabelle di metadati CLI (TypeDef, TypeRef, MemberRef, MethodDef, InterfaceImpl) mediante `System.Reflection.Metadata.MetadataReader` in modo non bloccante.
  - `ILDecompilerService`: utilizza `CSharpDecompiler` di ILSpy per decompilare tipi, metodi o interi assembly in codice sorgente C# formattato.
  - Costruzione delle relazioni (ereditarietà, implementazione di interfacce, chiamate di metodo, uso di tipi).

### 2.3 `DotNetArchaeologist.Api`
- **Scopo**: API HTTP locale per esporre le funzionalità al frontend.
- **Dipendenze**: `DotNetArchaeologist.Analysis`, `DotNetArchaeologist.Core`, ASP.NET Core.
- **Responsabilità**:
  - Esposizione di endpoint REST / Minimal API vincolati all'indirizzo di loopback (`127.0.0.1`).
  - Gestione del ciclo di vita delle sessioni di analisi (apertura file, rilascio stream).
  - Serializzazione JSON ottimizzata per strutture gerarchiche e grafi.
  - Validazione rigorosa degli input (percorsi di file locali, sanitizzazione).

### 2.4 `DotNetArchaeologist.Web`
- **Scopo**: Interfaccia utente web per l'esplorazione visiva.
- **Dipendenze**: React 19, TypeScript, Vite, React Flow, Lucide Icons.
- **Responsabilità**:
  - **Assembly Explorer**: albero gerarchico (Namespaces -> Tipi -> Membri).
  - **Decompiler View**: visualizzazione del codice C# decompilato con syntax highlighting e navigazione ipertestuale dei tipi.
  - **Graph Canvas**: grafo interattivo delle dipendenze e delle relazioni (React Flow) con filtro per livello di granularità (Assembly, Type, Method).
  - **Metadata Inspector**: visualizzazione grezza dei metadati, flag IL, attributi e dipendenze esterne.

---

## 3. Modello Dati del Grafo Architetturale

La ricostruzione architetturale viene modellata come un grafo diretto pesato:

- **Nodi (`GraphNode`)**:
  - `Id`: identificatore univoco deterministico (es. `asm://MyLib/Namespace/Type`).
  - `Label`: nome leggibile dell'elemento.
  - `Kind`: `Assembly`, `Namespace`, `Class`, `Interface`, `Struct`, `Enum`, `Method`.
  - `Attributes`: dizionario di metadati accessori (visibilità, modificatori, dimensione IL).

- **Archi (`GraphEdge`)**:
  - `Source`: identificatore nodo sorgente.
  - `Target`: identificatore nodo destinazione.
  - `Relation`:
    - `Inherits`: ereditarietà di classi.
    - `Implements`: implementazione di interfacce.
    - `Calls`: invocazione di metodi rilevata nei byte IL.
    - `References`: dipendenza tra tipi/campi.
    - `Declares`: contenimento gerarchico (Namespace dichiara Tipo, Tipo dichiara Membro).

---

## 4. Confini e Integrazione di REA (Reverse Engineer Anything)

Nello sviluppo del progetto è presente la skill locale e il server MCP **REA**:

1. **Ambiente Agente vs Ambiente Applicativo**:
   - Il server MCP di REA è accessibile **esclusivamente dall'agente di sviluppo AI** (Antigravity).
   - L'applicazione `DotNetArchaeologist` **non** effettua chiamate dirette a runtime verso il server MCP di REA.
2. **Ruolo di REA durante lo sviluppo**:
   - Analisi comparativa dei binari di test e benchmark.
   - Verifica di conformità e reverse engineering di assembly complessi o obfuscati per validare l'output del nostro motore.
3. **Pianificazione futura**:
   - In una milestone avanzata, .NET Archaeologist potrà supportare l'esportazione e l'importazione di formati di evidenza compatibili con REA (*Evidence Bundle* JSON), permettendo all'utente di scambiare dati di analisi con flussi assistiti da agenti AI senza accoppiare il runtime applicativo.

---

## 5. Strategia di Test

- **Unit Test Backend (xUnit)**:
  - Verifica della lettura dei metadati su assembly di fixture noti.
  - Verifica del calcolo corretto di nodi e archi del grafo.
  - Verifica del decompiler su costrutti C# moderni (records, async/await, generics).
- **Unit & Component Test Frontend (Vitest)**:
  - Test sui reducer e sullo stato del grafo.
  - Test dei componenti UI di navigazione ad albero e ispezione metadati.
