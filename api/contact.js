const BREVO_EMAIL_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const BREVO_CONTACTS_ENDPOINT = 'https://api.brevo.com/v3/contacts';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clean(value, maxLength = 3000) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

function splitName(fullName = '') {
  const parts = clean(fullName, 150)
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

async function brevoPost(url, apiKey, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  return {
    response,
    data,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      ok: false,
      message: 'Metodo non consentito.',
    });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const contactEmail =
    process.env.CONTACT_EMAIL || 'info@progettolibriliberi.it';
  const listId = Number.parseInt(process.env.BREVO_LIST_ID || '', 10);

  if (!apiKey) {
    console.error('BREVO_API_KEY non configurata');

    return res.status(500).json({
      ok: false,
      message: 'Servizio email non configurato.',
    });
  }

  if (!Number.isInteger(listId) || listId <= 0) {
    console.error('BREVO_LIST_ID non valido:', process.env.BREVO_LIST_ID);

    return res.status(500).json({
      ok: false,
      message: 'Lista Brevo non configurata correttamente.',
    });
  }

  let body = {};

  try {
    body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};
  } catch (error) {
    console.error('Errore parsing body:', error);

    return res.status(400).json({
      ok: false,
      message: 'Dati del modulo non validi.',
    });
  }

  // Campo invisibile anti-spam.
  // Se viene compilato, fingiamo che l'invio sia andato a buon fine.
  if (clean(body.website, 200)) {
    return res.status(200).json({
      ok: true,
      message: 'Messaggio ricevuto.',
    });
  }

  const formType =
    clean(body.form_type, 100) || 'Contatto dal sito';

  const name = clean(
    body.nome || body.referente || body.azienda,
    150,
  );

  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.telefono, 80);
  const company = clean(body.azienda, 180);
  const contactPerson = clean(body.referente, 180);
  const requestType = clean(body.richiesta, 250);
  const message = clean(body.messaggio, 5000);
  const privacy = clean(body.consenso_privacy, 50);

  if (!email || !message || !privacy) {
    return res.status(400).json({
      ok: false,
      message:
        'Compila tutti i campi obbligatori e accetta la Privacy Policy.',
    });
  }

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailIsValid) {
    return res.status(400).json({
      ok: false,
      message: 'Inserisci un indirizzo email valido.',
    });
  }

  const displayName =
    contactPerson || name || company || email;

  const { firstName, lastName } = splitName(displayName);

  /*
   * 1. Crea o aggiorna il contatto in Brevo.
   *
   * listIds inserisce il contatto nella lista usata
   * come trigger dell'automazione.
   *
   * updateEnabled permette di aggiornare un contatto
   * già esistente senza generare errore.
   */
  const contactPayload = {
    email,
    updateEnabled: true,
    listIds: [listId],
    attributes: {
      FIRSTNAME: firstName,
      LASTNAME: lastName,
    },
  };

  if (phone) {
    contactPayload.attributes.PHONE = phone;
  }

  try {
    const {
      response: contactResponse,
      data: contactData,
    } = await brevoPost(
      BREVO_CONTACTS_ENDPOINT,
      apiKey,
      contactPayload,
    );

    if (!contactResponse.ok) {
      console.error(
        'Errore Brevo creazione contatto:',
        contactResponse.status,
        contactData,
      );

      return res.status(502).json({
        ok: false,
        message:
          'Non è stato possibile registrare il contatto. Riprova tra poco.',
      });
    }

    console.log('Contatto Brevo sincronizzato:', {
      status: contactResponse.status,
      email,
      listId,
      response: contactData,
    });
  } catch (error) {
    console.error(
      'Errore chiamata API contatti Brevo:',
      error,
    );

    return res.status(500).json({
      ok: false,
      message:
        'Errore temporaneo durante la registrazione del contatto.',
    });
  }

  /*
   * 2. Prepara la mail interna destinata al progetto.
   */
  const rows = [
    ['Modulo', formType],
    ['Nome', name],
    ['Azienda', company],
    ['Referente', contactPerson],
    ['Email', email],
    ['Telefono', phone],
    ['Tipo richiesta', requestType],
    ['Messaggio', message],
    ['Consenso privacy', privacy],
    [
      'Data invio',
      new Date().toLocaleString('it-IT', {
        timeZone: 'Europe/Rome',
      }),
    ],
  ].filter(([, value]) => value);

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #eadfce;
              font-weight: 700;
              vertical-align: top;
              width: 180px;
            "
          >
            ${escapeHtml(label)}
          </td>

          <td
            style="
              padding: 10px;
              border-bottom: 1px solid #eadfce;
              white-space: pre-wrap;
            "
          >
            ${escapeHtml(value)}
          </td>
        </tr>
      `,
    )
    .join('');

  const emailPayload = {
    sender: {
      name: 'Progetto Libri Liberi',
      email: contactEmail,
    },

    to: [
      {
        email: contactEmail,
        name: 'Progetto Libri Liberi',
      },
    ],

    replyTo: {
      email,
      name: displayName,
    },

    subject: `${formType} - progettolibriliberi.it`,

    htmlContent: `
      <!doctype html>
      <html lang="it">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width">
          <title>Nuovo messaggio dal sito</title>
        </head>

        <body
          style="
            margin: 0;
            background: #f7f1e8;
            font-family: Arial, sans-serif;
            color: #2d241e;
          "
        >
          <div
            style="
              max-width: 680px;
              margin: 24px auto;
              background: #ffffff;
              border-radius: 14px;
              overflow: hidden;
              border: 1px solid #decdb5;
            "
          >
            <div
              style="
                background: #6b3f24;
                color: #ffffff;
                padding: 22px 26px;
              "
            >
              <h1
                style="
                  margin: 0;
                  font-size: 22px;
                "
              >
                Nuovo messaggio dal sito
              </h1>

              <p style="margin: 6px 0 0;">
                Progetto Libri Liberi
              </p>
            </div>

            <table
              style="
                width: 100%;
                border-collapse: collapse;
              "
            >
              ${htmlRows}
            </table>

            <div
              style="
                padding: 18px 26px;
                font-size: 12px;
                color: #6f6258;
              "
            >
              Rispondi direttamente a questa email per contattare il mittente.
            </div>
          </div>
        </body>
      </html>
    `,
  };

  /*
   * 3. Invia la notifica interna.
   */
  try {
    const {
      response: emailResponse,
      data: emailData,
    } = await brevoPost(
      BREVO_EMAIL_ENDPOINT,
      apiKey,
      emailPayload,
    );

    if (!emailResponse.ok) {
      console.error(
        'Errore Brevo invio email:',
        emailResponse.status,
        emailData,
      );

      return res.status(502).json({
        ok: false,
        message:
          'Il contatto è stato registrato, ma la notifica non è partita. Riprova tra poco.',
      });
    }

    console.log('Email interna inviata:', {
      status: emailResponse.status,
      messageId: emailData.messageId || null,
    });

    return res.status(200).json({
      ok: true,
      message:
        'Grazie! La tua richiesta è stata inviata correttamente.',
      debug: {
        contactSynced: true,
        listId,
      },
    });
  } catch (error) {
    console.error(
      'Errore chiamata API email Brevo:',
      error,
    );

    return res.status(500).json({
      ok: false,
      message:
        'Errore temporaneo durante l’invio. Riprova tra poco.',
    });
  }
};
