Casa · Manutenzioni
MVP personale per tenere traccia delle manutenzioni domestiche senza dover inserire dati ogni giorno.
Cosa fa
Dashboard con manutenzioni scadute, prossime e in regola.
Elementi della casa organizzati per stanza.
Manutenzioni ricorrenti espresse in giorni.
Pulsante Fatto che registra lo storico e aggiorna automaticamente la prossima scadenza.
Aggiunta rapida di elementi e manutenzioni.
API Cloudflare Worker + database Cloudflare D1.
Stack
React + TypeScript + Vite
Cloudflare Workers
Cloudflare D1 / SQLite
CSS custom, responsive
Avvio locale
Installa le dipendenze:
```bash
   npm install
   ```
Crea il database D1 locale applicando la migration:
```bash
   npm run db:migrate:local
   ```
Per sviluppare il frontend con hot reload, avvia Wrangler in un terminale:
```bash
   npx wrangler dev
   ```
In un secondo terminale avvia Vite:
```bash
   npm run dev
   ```
Vite inoltra `/api/\*` a Wrangler su `http://localhost:8787`. Per provare invece l'app esattamente come verrà pubblicata, esegui `npm run cf:dev`: compila React e Wrangler serve sia gli asset sia le API.
Pubblicazione su Cloudflare
Accedi con Wrangler:
```bash
   npx wrangler login
   ```
Crea D1:
```bash
   npx wrangler d1 create casa-maintenance
   ```
Copia il `database\_id` restituito dentro `wrangler.jsonc`.
Applica le migration remote:
```bash
   npm run db:migrate:remote
   ```
Pubblica tutto con un singolo comando:
```bash
   npm run deploy
   ```
Il Worker serve sia il frontend compilato in `dist/` sia `/api/\*`, quindi non devi configurare Cloudflare Pages separatamente.
Modello dati
`rooms`: stanze
`assets`: elementi/impianti/elettrodomestici
`maintenance\_tasks`: manutenzioni ricorrenti
`maintenance\_logs`: storico delle esecuzioni
La prossima scadenza non viene salvata: è calcolata da `last\_completed\_at + interval\_days`.
Prossimi passi sensati
Pagina dettaglio elemento con storico completo.
Modifica/eliminazione di elementi e manutenzioni.
Ricorrenze mensili/annuali oltre agli intervalli in giorni.
PWA installabile sul telefono.
Backup/esportazione JSON/CSV.
Accesso privato tramite Cloudflare Access, senza costruire login/password.
Anagrafiche riutilizzabili
La versione aggiornata include una sezione Anagrafiche con:
tipi di elemento (Lavatrice, Caldaia, Climatizzatore, ecc.);
manutenzioni standard associate a ciascun tipo;
creazione automatica delle manutenzioni quando registri un nuovo elemento.
Dopo l'aggiornamento applica anche la seconda migrazione:
```bash
npx wrangler d1 migrations apply casa-maintenance --local
# e per il database remoto:
npx wrangler d1 migrations apply casa-maintenance --remote
```
