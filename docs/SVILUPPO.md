# Guida allo Sviluppo di .NET Archaeologist

Questa guida descrive i prerequisiti di sistema, la configurazione dell'ambiente di lavoro locale e le convenzioni di sviluppo per il progetto **.NET Archaeologist**.

---

## 1. Prerequisiti di Sistema

Prima di compilare ed eseguire il progetto, accertati che i seguenti strumenti siano installati e disponibili nel terminale:

- **.NET SDK**: versione moderna (supportate versioni LTS/STS recenti, verificato con .NET SDK 10.0.401).
  - Verifica: `dotnet --version`
- **Node.js**: versione LTS o Current moderna (verificato con Node.js v24.x).
  - Verifica: `node --version`
- **npm**: versione 10 o successiva (verificato con npm 11.x).
  - Verifica: `npm --version`
- **Git**: per la gestione del versionamento (verificato con Git 2.40+).
  - Verifica: `git --version`

---

## 2. Preparazione dell'Ambiente Locale

### 2.1 Clonazione del Repository

```bash
git clone https://github.com/biagio-scaglia/.NET-Archaeologist.git
cd .NET-Archaeologist
```

### 2.2 Ripristino e Compilazione Backend (.NET)
*(Disponibile a partire dalla Milestone 1)*

```bash
# Ripristino pacchetti e build della solution
dotnet restore
dotnet build
```

### 2.3 Esecuzione dei Test Backend
*(Disponibile a partire dalla Milestone 1)*

```bash
dotnet test --logger "console;verbosity=normal"
```

### 2.4 Setup e Avvio Frontend (React + Vite)
*(Disponibile a partire dalla Milestone 3)*

```bash
cd src/DotNetArchaeologist.Web
npm install
npm run dev
```

---

## 3. Convenzioni di Codifica

Per garantire omogeneità, leggibilità e manutenibilità nel tempo, adottiamo le seguenti convenzioni:

### 3.1 Lingua
- **Documentazione**: Tutta la documentazione di progetto, inclusi README, guide architetturali, roadmap, convenzioni e messaggi di commit, è redatta in **italiano**.
- **Codice sorgente**: Tutti gli identificatori di codice (nomi di classi, interfacce, metodi, variabili, parametri, proprietà, namespace, tabelle e rotte API) sono rigorosamente in **inglese** secondo le convenzioni convenzionali del settore.
- **Commenti nel codice**: Quando necessari per spiegare il *perché* di scelte non ovvie o logiche di parsing complesse, i commenti devono essere scritti in italiano chiaro e conciso.

### 3.2 Standard C# / .NET
- Abilitare sempre `<Nullable>enable</Nullable>` e `<ImplicitUsings>enable</ImplicitUsings>`.
- Rispettare i pattern di denominazione standard Microsoft:
  - `PascalCase` per classi, interfacce (con prefisso `I`), metodi, proprietà, record.
  - `camelCase` per parametri e variabili locali.
  - `_camelCase` per campi privati `readonly`.
- Preferire immutabilità (`record`, `readonly struct`, `IReadOnlyList<T>`) per i modelli di dominio e i dati restituiti dal parser.
- Separazione netta delle responsabilità: nessun codice di decompilazione direttamente nei controller o endpoint Minimal API.

### 3.3 Standard TypeScript / React
- TypeScript in `strict mode`.
- Niente uso indiscriminato di `any`; definire sempre interfacce o type alias per i payload JSON del backend.
- Componenti funzionali con hook (`React.FC` o funzioni dichiarative tipizzate).
- Gestione dello stato locale prevedibile e disaccoppiata dalla visualizzazione.

---

## 4. Regole di Sicurezza ed Etica di Sviluppo

1. **Nessuna esecuzione di codice target**:
   È severamente vietato utilizzare `Assembly.Load` o istanziare tipi estratti dagli assembly in esame nel contesto di esecuzione dell'applicazione. L'analisi deve sempre passare tramite `System.Reflection.Metadata` o lettori statici disaccoppiati.
2. **Nessun invio a server remoti**:
   L'applicazione non deve contenere chiamate di telemetria, tracciamento o invio di binari/metadati verso internet.
3. **Nessun segreto nel repository**:
   Non committare mai chiavi private, token API, file `.env` con credenziali reali o percorsi assoluti specifici della macchina personale.
4. **Nessun file binario pesante nella cronologia Git**:
   I file `.dll`, `.exe` o campioni di test usati durante lo sviluppo locale devono essere ignorati dal `.gitignore` o inseriti come fixture minime generate a runtime tramite Roslyn nei test automatici.

---

## 5. Linee Guida per i Commit Git

- Scrivere messaggi di commit in italiano chiaro, conciso e atomico.
- Usare prefissi convenzionali:
  - `feat:` nuova funzionalità.
  - `fix:` correzione di un difetto.
  - `docs:` modifiche alla documentazione.
  - `test:` aggiunta o modifica di test automatici.
  - `refactor:` riorganizzazione del codice senza alterazione del comportamento esterno.
  - `chore:` aggiornamenti di build, configurazioni o dipendenze.
- Verificare sempre `git diff` e `git diff --cached` prima di confermare il commit.
