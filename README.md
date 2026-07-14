# Progetto Libri Liberi

Sito statico multipagina pubblicato su Vercel, con moduli inviati tramite Brevo.

## Variabili d'ambiente Vercel

Configura in **Settings → Environment Variables**:

- `BREVO_API_KEY`: chiave API v3 di Brevo.
- `CONTACT_EMAIL`: `info@progettolibriliberi.it`.
- `BREVO_LIST_ID`: ID numerico della lista Brevo usata come trigger dell'automazione (consigliato).

Dopo aver aggiunto o modificato una variabile, esegui un nuovo **Redeploy**.

## Automazione Brevo

1. Crea una lista, ad esempio `Contatti sito web`.
2. Apri la lista e individua il suo ID numerico nell'indirizzo della pagina o nei dettagli della lista.
3. Inserisci quell'ID nella variabile Vercel `BREVO_LIST_ID`.
4. Nell'automazione Brevo usa come trigger: **Contatto aggiunto alla lista Contatti sito web**.
5. Collega l'email automatica e attiva l'automazione.
6. Per una sola risposta per contatto, lascia disattivato il rientro dopo l'uscita.

La funzione `api/contact.js` crea o aggiorna il contatto in Brevo, lo inserisce nella lista configurata e invia la notifica interna a `info@progettolibriliberi.it`.
