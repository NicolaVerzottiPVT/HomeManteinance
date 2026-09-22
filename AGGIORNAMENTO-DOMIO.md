# Aggiornare a Domio

Il nome dell'applicazione ora è **Domio**. La cartella locale resta casa-cura-pages per continuità: non devi rinominare repository, progetto Cloudflare o database, né cambiare indirizzo.

## Se hai già pubblicato la versione precedente

1. Su GitHub aggiorna il contenuto del repository con questa cartella. In particolare sostituisci functions/_middleware.ts e functions/api/casa.ts e carica public/ completo con il nuovo index.html e gli asset. Non sovrascrivere solo i sorgenti frontend/.
2. Elimina da public/assets i vecchi file compilati non più presenti nella nuova cartella, se stai caricando via browser. GitHub non elimina automaticamente i file vecchi.
3. Cloudflare Pages farà il deploy dal branch main con le stesse impostazioni: framework None, build vuota, output public.
4. Mantieni il binding DB e lo stesso database. **Non serve eseguire SQL o ricreare il database per questo aggiornamento.**
5. Il secret si chiama ancora APP_PASSWORD. La password attuale continuerà a funzionare. Se vuoi cambiarla, scegli qualsiasi valore non vuoto, anche corto, salvalo nel pannello Cloudflare e ripeti il deploy.
6. Apri il sito: vedrai il login Domio con il solo campo Password. Il nome utente casa non viene più usato. Usa Esci nella barra laterale per uscire; la sessione scade dopo 12 ore.

## Eliminare i dati

Tutti i pulsanti di eliminazione chiedono conferma.

- **Catalogo → Tipi di elemento:** il cestino elimina il tipo e i suoi modelli standard. Gli elementi già registrati restano senza quel tipo; manutenzioni e storico esistenti restano.
- **Catalogo → Attività standard:** elimina un modello senza toccare le manutenzioni già create.
- **Catalogo → Stanze:** elimina la stanza lasciando gli elementi come “Senza stanza”.
- **Pianificazione:** elimina una manutenzione insieme al suo storico.
- **Registro:** elimina una singola registrazione. Non annulla il completamento e non modifica le date della manutenzione.
- **La mia casa → scheda elemento:** elimina l'elemento e le manutenzioni e registrazioni collegate, come prima.

I default già presenti vengono mantenuti finché non li elimini tu. Una volta eliminati non ricompaiono.
Le installazioni nuove partono vuote: nessun catalogo viene creato automaticamente.

## Verifica dopo il deploy

Accedi, elimina un tipo standard che non ti serve e ricarica la pagina: deve restare eliminato.
Controlla che i tuoi elementi siano ancora presenti. Prova Esci e accedi nuovamente con la sola password.

