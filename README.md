# .NET Archaeologist

> Applicazione locale per l'esplorazione archeologica di assembly .NET: analisi dei metadati, decompilazione del codice sorgente C#, ricostruzione interattiva delle relazioni architetturali e indagini guidate da evidenze.

---

## Cos'e .NET Archaeologist?

**.NET Archaeologist** e uno strumento desktop/locale open source progettato per ingegneri del software, architetti e ricercatori di sicurezza che devono esplorare, comprendere e mappare assembly .NET (DLL, EXE) senza dover eseguire il binario analizzato.

L'applicazione consente di:
- **Mappare intere Solution .NET (.sln)**: identifica automaticamente i **Microservizi / Servizi WCF / REST**, i componenti **Database (DbContext, Repository, Stored Procedure)**, i **Processi Batch** e le dipendenze tra progetti proprietari da un singolo file o cartella.
- **Esplorare i metadati .NET** a basso livello (assembly, moduli, tipi, interfacce, metodi, attributi e referenze).
- **Decompilare codice C#** in modo trasparente e performante sfruttando `ICSharpCode.Decompiler` (motore di ILSpy), con navigazione fluida dalla mappa architetturale al singolo metodo.
- **Visualizzare l'architettura del sistema** attraverso un'interfaccia classica Windows 98 (`98.css`) senza distrazioni e 100% offline.
- **Condurre investigazioni assistite da evidenze** con supporto all'analisi statica e cooperazione con strumenti avanzati (come REA per l'agente AI).
- **Esportare report tecnici** in formato Markdown leggibili e condivisibili.

---

## Principi di Sicurezza e Privacy
 
- **Nessuna esecuzione di codice target**: Gli assembly esaminati vengono caricati esclusivamente per via statica e passiva (`System.Reflection.Metadata` / stream di decompilazione). Nessun codice non fidato viene eseguito a runtime.
- **Offline & Privacy-first**: Nessun binario, metadato o informazione proprietaria viene inviata a cloud o server esterni. Tutto rimane confinato sul computer locale.
- **Isolamento su Loopback e Protezione Cross-Origin**: L'API ascolta solo su loopback locale ed e protetta da un middleware che respinge richieste provenienti da origini esterne (`Sec-Fetch-Site: cross-site`), mitigando attacchi web drive-by.
- **Restrizioni Filesystem e Difesa in Profondita**: I percorsi di file e cartelle sono normalizzati e vincolati a estensioni ammesse (`.dll`, `.exe`, `.sln`, `.slnx`), con blocco di percorsi remoti UNC, directory di sistema protette e limiti dimensionali (max 250 MB per assembly).
- **Gestione della Memoria con TTL**: Le sessioni in RAM adottano scadenza temporale (TTL di 60 minuti con sliding expiration), limite massimo di concorrenza (50 sessioni) e politica di espulsione LRU al raggiungimento della memoria massima (500 MB).
- **Integrita dei binari**: L'applicazione non modifica ne corrompe mai i file analizzati.

---

## Stack Tecnologico

| Componente | Tecnologia | Ruolo |
| :--- | :--- | :--- |
| **Backend** | C# 10+ / ASP.NET Core | API locale minimale per servire metadati e sorgenti decompilati |
| **Analisi Metadati** | `System.Reflection.Metadata` | Lettura rapida, sicura e senza lock di tabelle CLI/ECMA-335 |
| **Decompilazione** | `ICSharpCode.Decompiler` (ILSpy) | Ricostruzione C# fedele dai byte IL |
| **Frontend** | React, TypeScript, Vite, 98.css | Interfaccia utente desktop in stile classico Windows 98 |
| **Visualizzazione Grafi** | React Flow | Rappresentazione interattiva di dipendenze e gerarchie |
| **Test Backend** | xUnit | Test automatici su motori di analisi, decompilazione e API |
| **Test Frontend** | Vitest | Test unitari su componenti e manipolazioni di stato |
| **Persistenza (Pianificata)**| SQLite | Cronologia investigazioni, note e annotazioni sui nodi |

---

## Ruolo di REA (Reverse Engineer Anything)

Nello sviluppo di .NET Archaeologist:
- **REA** e una suite integrata via Model Context Protocol (MCP) impiegata dall'**agente AI** durante lo sviluppo e per condurre analisi binarie avanzate sul sistema.
- **Confine applicativo**: Il backend di .NET Archaeologist **non** effettua chiamate dirette a runtime verso il server MCP di REA. La futura cooperazione tra .NET Archaeologist e REA avverra tramite l'importazione/esportazione di formati standard di evidenze (*Evidence Bundles*) o report strutturati, preservando l'autonomia e la portabilita del software.

---

## Stato Attuale del Progetto
 
- [x] Inizializzazione della repository Git e configurazione remote (Milestone 0).
- [x] Definizione dell'architettura di base e dei confini di responsabilita (Milestone 0).
- [x] Redazione delle linee guida operative e della roadmap di sviluppo (Milestone 0).
- [x] Creazione della Solution .NET e del Core Metadata Engine (Milestone 1).
- [x] Decompilazione C# tramite ILSpy e API locale ASP.NET Core (Milestone 2).
- [x] Frontend SPA in React + TypeScript con interfaccia retro 98.css / xp.css / 7.css (Milestone 3).
- [x] Mappatura automatica di Solution .NET (.sln) e identificazione ruoli (Milestone 3.5).
- [x] Disegno Tecnico CAD Blueprint e Grafo Dipendenze con Minimappa (Milestone 4).
- [x] Generatore di Report Esecutivi in linguaggio naturale, export PDF A4 e Markdown (Milestone 5).
- [x] Consulente architetturale live "L'Archeologo AI" con supporto Ollama Cloud/Locale e fallback euristico (Milestone 5).
- [ ] Esportazione / importazione Evidence Bundles REA (Milestone 5).
- [ ] Persistenza e sessioni locali SQLite (Milestone 6).
 
Consulta [docs/ROADMAP.md](docs/ROADMAP.md) per il piano dettagliato delle prossime fasi.

---

## Documentazione

- [Architettura del Sistema](docs/ARCHITETTURA.md): Principi di design, separazione delle responsabilita e contratti.
- [Guida allo Sviluppo](docs/SVILUPPO.md): Prerequisiti, convenzioni e configurazione dell'ambiente.
- [Roadmap di Progetto](docs/ROADMAP.md): Milestone ordinate e verificabili.
- [Convenzioni per Agenti AI](AGENTS.md): Regole operative per l'assistenza allo sviluppo con agenti autonomi.

---

## Licenza

Questo progetto e rilasciato sotto licenza [MIT](LICENSE).
