# Casa · Manutenzioni

MVP personale per tenere traccia delle manutenzioni domestiche senza dover inserire dati ogni giorno.

## Cosa fa

- Dashboard con manutenzioni **scadute**, **prossime** e **in regola**.
- Elementi della casa organizzati per stanza.
- Manutenzioni ricorrenti espresse in giorni.
- Pulsante **Fatto** che registra lo storico e aggiorna automaticamente la prossima scadenza.
- Aggiunta rapida di elementi e manutenzioni.
- API Cloudflare Worker + database Cloudflare D1.

## Stack

- React + TypeScript + Vite
- Cloudflare Workers
- Cloudflare D1 / SQLite
- CSS custom, responsive

## Avvio locale

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Crea il database D1 locale applicando la migration:

   ```bash
   npm run db:migrate:local
   ```

3. Per sviluppare il frontend con hot reload, avvia Wrangler in un terminale:

   ```bash
   npx wrangler dev
   ```

4. In un secondo terminale avvia Vite:

   ```bash
   npm run dev
   ```

Vite inoltra `/api/*` a Wrangler su `http://localhost:8787`. Per provare invece l'app esattamente come verrà pubblicata, esegui `npm run cf:dev`: compila React e Wrangler serve sia gli asset sia le API.

## Pubblicazione su Cloudflare

1. Accedi con Wrangler:

   ```bash
   npx wrangler login
   ```

2. Crea D1:

   ```bash
   npx wrangler d1 create casa-maintenance
   ```

3. Copia il `database_id` restituito dentro `wrangler.jsonc`.

4. Applica le migration remote:

   ```bash
   npm run db:migrate:remote
   ```

5. Pubblica tutto con un singolo comando:

   ```bash
   npm run deploy
   ```

Il Worker serve sia il frontend compilato in `dist/` sia `/api/*`, quindi non devi configurare Cloudflare Pages separatamente.

## Modello dati

- `rooms`: stanze
- `assets`: elementi/impianti/elettrodomestici
- `maintenance_tasks`: manutenzioni ricorrenti
- `maintenance_logs`: storico delle esecuzioni

La prossima scadenza non viene salvata: è calcolata da `last_completed_at + interval_days`.

## Prossimi passi sensati

1. Pagina dettaglio elemento con storico completo.
2. Modifica/eliminazione di elementi e manutenzioni.
3. Ricorrenze mensili/annuali oltre agli intervalli in giorni.
4. PWA installabile sul telefono.
5. Backup/esportazione JSON/CSV.
6. Accesso privato tramite Cloudflare Access, senza costruire login/password.

## Anagrafiche riutilizzabili

La versione aggiornata include una sezione **Anagrafiche** con:

- tipi di elemento (Lavatrice, Caldaia, Climatizzatore, ecc.);
- manutenzioni standard associate a ciascun tipo;
- creazione automatica delle manutenzioni quando registri un nuovo elemento.

Dopo l'aggiornamento applica anche la seconda migrazione:

```bash
npx wrangler d1 migrations apply casa-maintenance --local
# e per il database remoto:
npx wrangler d1 migrations apply casa-maintenance --remote
```
