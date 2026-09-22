# Verifica della consegna — 22 settembre 2026

La consegna è predisposta per Cloudflare Pages con integrazione GitHub.
Non è stata pubblicata e non sono stati modificati account esterni.

## Correzioni rispetto alla cartella precedente

- Passaggio da Workers/Vinext a file statici in public e Pages Functions alla radice.
- Conservazione dell'interfaccia React, compilata in anticipo: prima pubblicazione senza build.
- Rimozione di Next, Vinext, Drizzle e componenti UI non utilizzati dalla nuova consegna.
- Nessun file Wrangler, account ID o database ID da inserire nel repository.
- Accesso privato mediante secret APP_PASSWORD configurato nel pannello Cloudflare.
- Tutte le rotte protette; risposte private non memorizzabili in cache.
- Controllo dell'origine delle richieste di modifica e del formato JSON.
- Schema SQL ripetibile senza eliminare tabelle o righe.

## Verifiche eseguite

- Controllo TypeScript del frontend e delle Functions.
- Build Vite riuscita; index.html e asset referenziati disponibili.
- Compilazione Pages Functions con Wrangler nel runtime locale Cloudflare.
- SQL eseguito su D1 locale e rieseguito senza errori.
- Richieste anonime a homepage, favicon e API: 401.
- Secret assente: 503 senza invocare l'applicazione.
- Accesso valido: homepage, asset e API rispondono correttamente.
- Cataloghi iniziali: 6 stanze, 8 tipologie e 12 modelli di manutenzione.
- Creazione di un elemento, creazione e completamento di una manutenzione.
- Verifica di storico e scadenza successiva.
- Eliminazione dell'elemento e delle manutenzioni e registrazioni collegate.
- Richiesta da origine esterna: 403; formato non JSON: 415; JSON malformato: 400.

I test hanno usato soltanto un database locale esterno alla cartella consegnata.
L'installazione finale nel tuo account non è verificabile senza il caricamento manuale.
Restano da configurare repository, progetto Pages, database D1, binding DB e secret
APP_PASSWORD, quindi eseguire il deploy e la verifica descritta nella guida.

Il frontend è React compilato, non una riscrittura vanilla. I sorgenti sono conservati
in frontend per manutenzione; per aggiornarli bisogna rigenerare public.
L'applicazione gestisce una sola casa condivisa, con accesso Basic tramite browser.
