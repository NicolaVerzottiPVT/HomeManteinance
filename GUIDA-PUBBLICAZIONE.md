# Pubblicare Domio: istruzioni manuali

Per aggiornare un'installazione già attiva leggi prima [AGGIORNAMENTO-DOMIO.md](AGGIORNAMENTO-DOMIO.md).

Questa guida riguarda esclusivamente la cartella **casa-cura-pages**.
Sostituisce le precedenti istruzioni per casa-cura-cloudflare.
Non occorre installare software per il primo caricamento: userai GitHub e il pannello Cloudflare dal browser.

## 1. Prepara la cartella

Apri casa-cura-pages. Devi vedere public, functions, migrations, frontend, README.md e questa guida.
Caricherai **il contenuto** di questa cartella nella radice del repository, non una cartella esterna che lo racchiude.

Mantieni le sottocartelle. In particolare:
- public/index.html deve restare in public;
- functions/api/casa.ts deve restare sotto functions/api;
- functions/_middleware.ts deve restare sotto functions;
- public/_routes.json deve essere incluso: protegge anche i file statici.

La cartella frontend conserva i sorgenti e le licenze. Per questa prima pubblicazione non devi compilarla.
Non caricare eventuali node_modules, .wrangler, .env, .dev.vars o file con password che creerai in futuro.
Il caricamento via browser non applica automaticamente le esclusioni di .gitignore.

## 2. Crea il repository GitHub

1. Accedi al tuo account GitHub.
2. Usa **New repository** e scegli un nome, per esempio casa-cura.
3. Scegli **Private** se vuoi mantenere privati anche i sorgenti. Il sito avrà comunque una protezione separata tramite password.
4. Crea il repository. Puoi inizializzarlo con un README per rendere disponibile il pulsante di caricamento.
5. Nella scheda Code scegli **Add file → Upload files**. Se il repository è vuoto, usa il collegamento per caricare file esistenti.
6. Trascina il contenuto della cartella casa-cura-pages nell'area di caricamento. Se Windows nasconde .gitignore, abilita la visualizzazione dei file nascosti e includilo.
7. Verifica che compaiano percorsi come public/index.html e functions/api/casa.ts. Non devono iniziare con casa-cura-pages/.
8. Scrivi un messaggio, ad esempio “Prima versione Domio”, e conferma con **Commit changes** sul branch main.
9. Controlla nella pagina principale che public e functions siano cartelle sorelle alla radice.

Non caricare uno ZIP come unico file del repository: GitHub non lo estrae per il deploy.
Se il repository contiene già la vecchia versione Workers, è più semplice creare un nuovo repository per questa consegna. Non mescolare le due strutture.

## 3. Crea il database D1

1. Accedi al tuo account Cloudflare.
2. Cerca **D1 SQL Database** nella navigazione (generalmente sotto Storage & databases).
3. Scegli **Create database**.
4. Come nome puoi usare casa-cura-db. Conferma la creazione.
5. Apri il database appena creato e la scheda **Console**.
6. Apri sul computer migrations/0001_init.sql con un editor di testo.
7. Copia tutto il contenuto SQL nella console D1 ed eseguilo con **Execute**.
8. Controlla che non ci siano errori. Se la console non accetta l'intero blocco, esegui le singole istruzioni terminate da punto e virgola, nell'ordine del file.
9. Nella scheda Tables verifica queste sei tabelle: rooms, asset_types, assets, maintenance_templates, maintenance_tasks, maintenance_logs.

Il file usa CREATE ... IF NOT EXISTS: rieseguirlo non elimina righe esistenti. Non aggiorna però automaticamente strutture precedenti differenti: per questa prima pubblicazione usa un database nuovo.
Non devi copiare l'ID del database in alcun file.
La nuova installazione parte vuota. Aggiungi solo stanze, tipologie, elementi e manutenzioni che ti servono; nessun default viene reinserito automaticamente.
I dati eventualmente salvati nella vecchia anteprima non vengono trasferiti da questo caricamento.

## 4. Collega GitHub a Cloudflare Pages

1. Apri **Workers & Pages**.
2. Scegli **Create application**, poi il percorso **Pages → Connect to Git**. La disposizione dei pulsanti può variare: assicurati di creare un progetto Pages.
3. Seleziona GitHub e autorizza Cloudflare ad accedere al repository appena creato. Puoi limitare l'autorizzazione a quel repository.
4. Seleziona casa-cura e avvia la configurazione.
5. Inserisci questi valori esatti:

| Campo | Valore |
| --- | --- |
| Project name | casa-cura, o un altro nome disponibile |
| Production branch | main |
| Framework preset | None |
| Build command | lasciare vuoto |
| Build output directory | public |
| Root directory / Path | lasciare vuoto |

Non inserire comandi di deploy Wrangler. Non selezionare Next.js o un Worker.
Il file package.json è intenzionalmente sotto frontend: la prima pubblicazione usa i file già pronti e non richiede installazione delle dipendenze.
6. Premi **Save and Deploy** e attendi il completamento.
7. Apri il progetto. L'indirizzo assegnato terminerà in pages.dev.

In questa fase il sito può rispondere “Configurazione incompleta” con stato 503: è previsto finché non imposti la password.
Le Functions vengono compilate da Pages automaticamente dalla cartella functions, anche con il comando di build vuoto.

## 5. Collega il database e imposta la password

Nel progetto Pages apri **Settings**.

### Database

1. Seleziona l'ambiente **Production** se viene richiesto.
2. Vai in **Bindings → Add → D1 database bindings**.
3. In Variable name scrivi esattamente **DB**, maiuscolo.
4. Seleziona il database casa-cura-db.
5. Salva.

### Password

1. Apri **Variables and Secrets** (in alcune interfacce Environment variables).
2. Seleziona Production.
3. Aggiungi una variabile di tipo **Secret**, nome **APP_PASSWORD**.
4. Imposta la password che preferisci: non c'è una lunghezza minima. Il valore non deve essere vuoto e viene confrontato esattamente, senza rimuovere gli spazi.
5. Salva la password nel tuo gestore di password e salva la configurazione Cloudflare.

Si accede con la sola password scelta da te. Non è richiesto un nome utente.
Non usare il prefisso VITE_ per il secret e non scriverlo nei sorgenti o nei file SQL.
L'accesso usa la schermata Domio con un solo campo Password. La sessione è conservata in un cookie HttpOnly, Secure su HTTPS e SameSite=Strict; dura 12 ore.

### Protezione in caso di limite Functions

In **Settings → Runtime → Fail open / closed**, se l'opzione è disponibile, scegli **Fail closed**.
Tutte le richieste passano dal middleware di accesso: questo evita che i file statici siano serviti senza controllo quando il limite Functions viene raggiunto.

## 6. Ripeti il deploy

I nuovi binding e secret richiedono un nuovo deploy.
Apri **Deployments**, seleziona l'ultimo deploy di produzione e usa **Retry deployment** o il comando equivalente per rifarlo.
Se non compare, modifica una riga del README su GitHub e fai un nuovo commit su main: partirà un nuovo deploy.
Attendi lo stato di successo prima di aprire il sito.

Non devi rieseguire il file SQL a ogni deploy. Il database persiste separatamente dal codice.

## 7. Verifica il sito

1. Apri l'indirizzo HTTPS pages.dev in una finestra privata.
2. Verifica che compaia la schermata Domio con il solo campo Password.
3. Accedi con la password configurata.
4. Controlla dashboard e cataloghi.
5. Aggiungi un elemento domestico di prova.
6. Crea una manutenzione, completala e verifica lo storico e la nuova scadenza.
7. Ricarica la pagina: i dati devono esserci ancora.
8. Cancella l'elemento di prova quando hai finito: l'eliminazione rimuove anche le manutenzioni e lo storico associati.
9. In una nuova sessione privata senza credenziali, apri /api/casa: deve restituire 401 e non mostrare dati; aprendo la homepage deve comparire il login.

Usa **Esci** nella barra laterale per chiudere la sessione. Dopo 12 ore dovrai accedere nuovamente.
Cambiare il secret e ripetere il deploy invalida le sessioni firmate con la vecchia password.

## 8. Preview, aggiornamenti e dominio

Per gli aggiornamenti caricati su main, Pages esegue automaticamente un nuovo deploy.
Le preview degli altri branch hanno configurazione separata: lasciale senza secret per mantenerle bloccate, oppure configura un diverso APP_PASSWORD e un database D1 di prova con binding DB e le stesse tabelle. Evita di collegare le preview al database domestico di produzione.

Per un dominio personalizzato, apri **Custom domains → Set up a custom domain** nel progetto Pages e segui la procedura guidata. Il middleware protegge anche il dominio personalizzato.
Puoi usare subito l'indirizzo pages.dev senza acquistare domini.

### Modificare il frontend in futuro

Modificando solo frontend/ non cambia il sito già compilato. Per rigenerarlo, da terminale dentro frontend/:

```powershell
npx pnpm@11.19.0 install --frozen-lockfile
npx pnpm@11.19.0 run build
```

Serve Node.js 22.13 o successivo. La build ricrea public/.
Carica su GitHub sia i sorgenti modificati sia public/ aggiornato, mantenendo la struttura.
Le modifiche a functions/ sono invece compilate automaticamente da Pages.
Non caricare frontend/node_modules dopo l'installazione.
Per modifiche al database aggiungi una nuova migrazione conservativa e applicala in D1 prima di pubblicare codice che dipende dalle nuove colonne. Non cancellare il database per aggiornare il sito.

## Problemi frequenti

| Sintomo | Controllo |
| --- | --- |
| 503 “Configurazione incompleta” | APP_PASSWORD assente, vuota o configurata nell'ambiente sbagliato; ripeti il deploy dopo averla salvata. |
| Richiesta continua di credenziali | Password corretta, nessuno spazio aggiunto. Prova una sessione privata. |
| Pagina visibile, dati non disponibili | Binding DB assente, database sbagliato o SQL non eseguito. Guarda i log Functions senza pubblicare credenziali. |
| “no such table” nei log | Esegui migrations/0001_init.sql sul database collegato al binding DB. |
| Homepage 404 | Output deve essere public e public/index.html deve esistere nel repository. |
| API restituisce HTML anziché JSON | functions non è alla radice, oppure è stato usato un caricamento statico invece dell'integrazione Git Pages. |
| Cloudflare chiede un deploy command | Probabilmente sei nel flusso Workers: torna alla creazione di un progetto Pages. |
| Cambiamenti React non visibili | Rigenera public con la build e carica anche i file compilati. |
| Preview bloccata ma produzione funziona | È previsto senza i secret e binding separati per Preview. |

## Riferimenti ufficiali

- [Collegare Pages a GitHub](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Configurare binding D1 e secret](https://developers.cloudflare.com/pages/functions/bindings/)
- [Routing Functions e fail closed](https://developers.cloudflare.com/pages/functions/routing/)
- [Creare database e tabelle D1](https://developers.cloudflare.com/d1/get-started/)
- [Caricare file su GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

Guida verificata il 22 settembre 2026. Le etichette del pannello possono cambiare; binding DB e secret APP_PASSWORD sono i nomi richiesti dal codice.
