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

function clean(value, max = 3000) {
  return String(value || '').trim().slice(0, max);
}

function splitName(fullName = '') {
  const parts = clean(fullName, 150).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

async function brevoRequest(url, apiKey, payload) {
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
  return { response, data };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Metodo non consentito.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL || 'info@progettolibriliberi.it';
  const listId = Number.parseInt(process.env.BREVO_LIST_ID || '', 10);

  if (!apiKey) {
    console.error('BREVO_API_KEY non configurata');
    return res.status(500).json({ ok: false, message: 'Servizio email non configurato.' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, message: 'Dati del modulo non validi.' });
  }

  // Honeypot: i visitatori reali non compilano questo campo.
  if (clean(body.website, 200)) {
    return res.status(200).json({ ok: true, message: 'Messaggio ricevuto.' });
  }

  const formType = clean(body.form_type, 100) || 'Contatto dal sito';
  const name = clean(body.nome || body.referente || body.azienda, 150);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.telefono, 80);
  const company = clean(body.azienda, 180);
  const contactPerson = clean(body.referente, 180);
  const requestType = clean(body.richiesta, 250);
  const message = clean(body.messaggio, 5000);
  const privacy = clean(body.consenso_privacy, 50);

  if (!email || !message || !privacy) {
    return res.status(400).json({ ok: false, message: 'Compila tutti i campi obbligatori e accetta la privacy.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: 'Inserisci un indirizzo email valido.' });
  }

  const displayName = contactPerson || name || company || email;
  const { firstName, lastName } = splitName(displayName);

  // 1) Crea o aggiorna il contatto in Brevo.
  // Se BREVO_LIST_ID è configurata, il contatto viene inserito nella lista che avvia l'automazione.
  const contactPayload = {
    email,
    updateEnabled: true,
    attributes: {
      FIRSTNAME: firstName,
      LASTNAME: lastName,
    },
  };
  if (Number.isInteger(listId) && listId > 0) {
    contactPayload.listIds = [listId];
  }

  try {
    const { response: contactResponse, data: contactData } = await brevoRequest(
      BREVO_CONTACTS_ENDPOINT,
      apiKey,
      contactPayload,
    );

    if (!contactResponse.ok) {
      console.error('Errore Brevo contatto:', contactResponse.status, contactData);
      return res.status(502).json({
        ok: false,
        message: 'Non è stato possibile registrare il contatto. Riprova tra poco.',
      });
    }
  } catch (error) {
    console.error('Errore sincronizzazione contatto:', error);
    return res.status(500).json({
      ok: false,
      message: 'Errore temporaneo durante la registrazione del contatto.',
    });
  }

  // 2) Invia la notifica interna a info@progettolibriliberi.it.
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
    ['Data invio', new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })],
  ].filter(([, value]) => value);

  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eadfce;font-weight:700;vertical-align:top;width:180px">${escapeHtml(label)}</td>
      <td style="padding:10px;border-bottom:1px solid #eadfce;white-space:pre-wrap">${escapeHtml(value)}</td>
    </tr>`).join('');

  const emailPayload = {
    sender: { name: 'Progetto Libri Liberi', email: contactEmail },
    to: [{ email: contactEmail, name: 'Progetto Libri Liberi' }],
    replyTo: { email, name: displayName },
    subject: `${formType} - progettolibriliberi.it`,
    htmlContent: `<!doctype html><html><body style="margin:0;background:#f7f1e8;font-family:Arial,sans-serif;color:#2d241e">
      <div style="max-width:680px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #decdb5">
        <div style="background:#6b3f24;color:#fff;padding:22px 26px"><h1 style="margin:0;font-size:22px">Nuovo messaggio dal sito</h1><p style="margin:6px 0 0">Progetto Libri Liberi</p></div>
        <table style="width:100%;border-collapse:collapse">${htmlRows}</table>
        <div style="padding:18px 26px;font-size:12px;color:#6f6258">Rispondi direttamente a questa email per contattare il mittente.</div>
      </div></body></html>`,
  };

  try {
    const { response, data } = await brevoRequest(BREVO_EMAIL_ENDPOINT, apiKey, emailPayload);
    if (!response.ok) {
      console.error('Errore Brevo email:', response.status, data);
      return res.status(502).json({ ok: false, message: 'Il contatto è stato registrato, ma la notifica non è partita. Riprova tra poco.' });
    }
    return res.status(200).json({
      ok: true,
      message: 'Grazie! La tua richiesta è stata inviata correttamente. Controlla anche la tua email.',
    });
  } catch (error) {
    console.error('Errore invio email:', error);
    return res.status(500).json({ ok: false, message: 'Errore temporaneo durante l’invio. Riprova tra poco.' });
  }
};
