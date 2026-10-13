# Convenzioni Operative per Agenti AI (AGENTS.md)

Questo documento stabilisce le regole di ingaggio, i vincoli di sicurezza e le convenzioni operative che ogni agente di intelligenza artificiale (incluso Antigravity) deve seguire rigorosamente quando opera nella codebase di **.NET Archaeologist**.

---

## 1. Principi di Sicurezza e Riservatezza (Non Negoziabili)

1. **Nessuna esecuzione di codice target**:
   - Non eseguire mai gli assembly .NET oggetto di analisi (né tramite `Process.Start`, né tramite `Assembly.Load`, né tramite reflection invocata a runtime).
   - L'ispezione deve avvenire esclusivamente tramite lettura passiva di stream binari e metadati (`System.Reflection.Metadata`, `ICSharpCode.Decompiler`).
2. **Nessuna modifica ai binari analizzati**:
   - L'applicazione e gli script ausiliari non devono alterare i byte dei file binari esaminati.
3. **Nessun dato inviato all'esterno**:
   - L'applicazione deve rimanere al 100% offline. Non introdurre dipendenze, SDK di telemetria o chiamate HTTP verso servizi cloud terzi.
4. **Nessun segreto o percorso personale**:
   - Non inserire credenziali, token, chiavi o percorsi assoluti legati alla macchina di un utente specifico (`C:\Users\...`) all'interno del codice o della configurazione tracciata da Git.

---

## 2. Lingua e Denominazione

- **Documentazione**: Tutti i file di documentazione per sviluppatori (`README.md`, `docs/*`, `AGENTS.md`), i messaggi di commit e i commenti al codice devono essere redatti in **italiano**.
- **Identificatori di codice**: Nomi di classi, metodi, variabili, interfacce, file di codice C#/TypeScript, rotte API e pacchetti NuGet/npm devono essere in **inglese** secondo gli standard di settore.
- **Onestà dello stato**: Distinguere chiaramente tra funzionalità **effettivamente implementate**, **pianificate** e **da verificare**. Non dichiarare mai come completata o funzionante una funzionalità che non è stata realmente testata o implementata.

---

## 3. Gestione del Repository e Commit Git

1. **Atomicità e Coerenza**:
   - Effettuare commit piccoli, frequenti e semanticamente significativi.
   - Ogni commit deve rappresentare una singola unità logica di lavoro.
2. **Messaggi di Commit**:
   - Scrivere messaggi in italiano con prefissi semantici chiari (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
3. **Divieto di comandi distruttivi**:
   - Non utilizzare mai `git reset --hard`, `git clean -fd` o `git push --force`.
   - Non scartare modifiche locali dell'utente.
   - Non usare `git add .` indiscriminato: aggiungere sempre i singoli file esplicitamente dopo aver esaminato `git status` e `git diff`.
4. **Verifica Prima del Commit**:
   - Eseguire sempre `git diff` e `git diff --cached` prima di procedere al commit.
   - Se sono presenti test automatici per i file modificati, eseguirli e verificarne l'esito prima di dichiarare il lavoro completato.

---

## 4. Ruolo e Confini di REA (Reverse Engineer Anything)

- La suite **REA** è uno strumento utilizzabile dall'**agente AI** tramite il server MCP per condurre analisi binarie avanzate o verifiche sul filesystem durante la sessione di lavoro.
- **Importante**: Il backend C# di .NET Archaeologist non ha accesso a runtime al server MCP di REA. Non generare codice applicativo che presupponga endpoint o librerie REA a runtime.
- Qualsiasi interazione futura tra REA e l'applicazione avverrà solo tramite formati di interscambio file (es. *Evidence Bundles* o export Markdown).

---

## 5. Criteri di Accettazione del Codice

- Seguire i principi di **Clean Code** e responsabilità singola.
- Non introdurre boilerplate o framework sovradimensionati prima che ce ne sia una reale esigenza documentata nella roadmap.
- Evitare mockup di dati statici spacciati per analisi reale: se un modulo non legge ancora un certo metadato, sollevare un'eccezione esplicita o ritornare uno stato non supportato chiaramente tipizzato.
