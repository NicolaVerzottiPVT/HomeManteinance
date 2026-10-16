# Aggiornare a Domio

## Aggiornamento del 16 ottobre: attività automatiche dal tipo

Quando crei un elemento e scegli il tipo, tutte le attività standard di quel tipo
vengono create automaticamente: non c'è più una casella da attivare.
Lo stesso accade quando associ o cambi il tipo dalla finestra Modifica.
La creazione di elemento e attività avviene nella stessa transazione.

Per un elemento già presente, ad esempio Ford Fiesta:

1. Verifica in Catalogo → Attività standard che Assicurazione, Bollo e le altre
   attività siano associate al tipo Automobile.
2. Apri La mia casa → Ford Fiesta.
3. Premi **Aggiungi attività dal tipo**: vengono aggiunte solo le attività mancanti,
   confrontando il nome (senza differenze di maiuscole o spazi esterni). Le attività
   e le date già presenti non vengono modificate.
4. Per ogni attività premi **Imposta ultima data**, inserisci l'ultima esecuzione
   e salva: prossima scadenza = ultima data + frequenza in giorni.

Finché non scegli una data, le nuove attività compaiono come **Da impostare**
nella scheda elemento, nella dashboard e in Pianificazione. Non vengono conteggiate
come scadute o in ordine. Se non conosci l'ultima esecuzione, puoi scegliere una
scadenza esplicita da Modifica.

Se aggiungi modelli nel Catalogo dopo aver creato l'elemento, usa nuovamente
**Aggiungi attività dal tipo**. Non viene effettuata una sincronizzazione continua:
una cancellazione volontaria resta tale fino a quando richiedi il recupero.
Rinominare un modello nel Catalogo non rinomina le attività già create; un nome
diverso viene considerato una nuova attività dal comando di recupero.

Per pubblicare carica functions/, public/ completo e i sorgenti frontend/.
Elimina dal repository i vecchi asset compilati non presenti nella nuova cartella.
Mantieni database, binding DB e secret APP_PASSWORD: **nessun nuovo SQL**.

## Aggiornamento del 23 settembre: modifica dei dati

È disponibile **Modifica** nella scheda elemento, in Pianificazione, nel Registro
e nelle tre schede del Catalogo. I campi sono precompilati: **Salva** applica le
modifiche e **Annulla** le scarta.

La modifica di un tipo o di un modello non cambia le manutenzioni già create.
Per le manutenzioni puoi scegliere esplicitamente la prossima scadenza.
Correggendo la data di una registrazione, il sistema considera tutto lo storico:
se cambia la data dell'intervento più recente, ricalcola ultima esecuzione e
prossima scadenza con la frequenza attuale. Modificare soltanto le note, o una
data precedente che rimane precedente, conserva la scadenza impostata.

Per pubblicare aggiorna **functions/**, **public/** e i sorgenti **frontend/**.
Non serve nuovo SQL: mantieni database, binding e password.

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
