# Casa Cura — Cloudflare Pages

Gestione domestica di elementi, manutenzioni ricorrenti e storico, con database Cloudflare D1.

**Per pubblicare segui [GUIDA-PUBBLICAZIONE.md](GUIDA-PUBBLICAZIONE.md).**
È sufficiente usare GitHub e il pannello Cloudflare: nessun comando sul tuo computer per la prima pubblicazione.

| Impostazione Pages | Valore |
| --- | --- |
| Framework | None |
| Build command | vuoto |
| Build output directory | public |
| Root directory | vuota |
| Production branch | main |
| Binding D1 | DB |
| Secret obbligatorio | APP_PASSWORD, almeno 16 caratteri |
| Nome utente di accesso | casa |

I file in `public/` sono già compilati. `functions/` contiene le Pages Functions e deve restare nella radice del repository.
La password si imposta solo in Cloudflare. Senza password il sito restituisce 503 e non espone dati.
Il database contiene una sola casa condivisa da chi conosce la password: non è un servizio multiutente con archivi separati.

## Struttura

- `public/`: sito pronto, favicon e regole di routing.
- `functions/_middleware.ts`: accesso con password e controllo dell'origine delle richieste.
- `functions/api/casa.ts`: API D1.
- `migrations/0001_init.sql`: creazione conservativa di tabelle e indici.
- `frontend/`: sorgenti React/TypeScript e strumenti per rigenerare il sito.

React viene mantenuto per conservare l'interfaccia e i componenti già realizzati. Non serve Node per caricare questa consegna.
La build è necessaria soltanto quando si modificano i sorgenti del frontend; le istruzioni sono nella guida.
Non sono inclusi dati domestici esistenti: il nuovo database parte vuoto, con cataloghi iniziali creati al primo accesso.

Nessun account ID, database ID, password o token è richiesto nei file del progetto.

