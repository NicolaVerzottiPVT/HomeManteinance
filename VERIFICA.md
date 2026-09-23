# Verifica Domio — 22 settembre 2026

## Verifica aggiuntiva — 23 settembre 2026

Aggiunti moduli precompilati di modifica per elementi, stanze, tipi, modelli,
manutenzioni e registrazioni. Verificati TypeScript, build e salvataggi di tutte
le categorie nel runtime Pages con D1 locale. Verificate le correzioni delle date
dello storico (intervento precedente, ultimo intervento spostato prima/dopo),
la conservazione della scadenza manuale per modifiche alle sole note e il rifiuto
di date, frequenze, riferimenti e identificativi non validi. Nessuna migrazione SQL.

Consegna per Cloudflare Pages e D1. Nessuna pubblicazione o modifica agli account esterni.

## Aggiornamento

- Nome visibile Domio, inclusi titolo della pagina e schermata di accesso.
- Login con sola password, senza nome utente e senza lunghezza minima.
- APP_PASSWORD resta il secret da configurare in Cloudflare; un valore vuoto blocca l'accesso.
- Sessione di 12 ore firmata con HMAC, cookie HttpOnly, SameSite=Strict e Secure su HTTPS.
- Pulsante Esci; cambio della password invalida le sessioni precedenti.
- Eliminazione con conferma di tipi, modelli standard, stanze, manutenzioni e singole registrazioni.
- Elementi e manutenzioni già create conservati quando si elimina un tipo o un modello.
- Eliminazione di una stanza lascia gli elementi senza stanza.
- Default non reinseriti al caricamento. Le nuove installazioni partono vuote.
- Nessuna variazione allo schema SQL: aggiornamento compatibile con il database esistente.

## Test eseguiti

- Controllo TypeScript del frontend e delle Pages Functions.
- Build Vite del sito in public.
- Compilazione e avvio nel runtime locale di Pages con D1.
- Accesso con password di un solo carattere, senza nome utente.
- HTML e asset compilati serviti correttamente.
- API anonime bloccate; homepage anonima reindirizzata al login.
- Cookie protetto su HTTPS; token alterato, scaduto o firmato con la vecchia password rifiutato.
- Uscita con cancellazione del cookie; secret vuoto bloccato.
- Login da un'origine esterna rifiutato.
- Cancellazione di un tipo predefinito e successive letture: nessuna ricreazione.
- Cancellazione di stanza, tipo e modello: elementi e manutenzioni collegati conservati come previsto.
- Cancellazione di una voce del registro: scadenza della manutenzione invariata.
- Cancellazione di manutenzione ed elemento.

I test usano un database locale esterno alla consegna.
Il deploy sul tuo account resta manuale: vedi AGGIORNAMENTO-DOMIO.md.
