function paypalBase() {
  return (process.env.PAYPAL_ENV || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Credenziali PayPal mancanti su Vercel.');
  }

  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Autenticazione PayPal fallita.');
  }

  return data.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Metodo non consentito.' });
  }

  try {
    const environment = process.env.PAYPAL_ENV || 'sandbox';

    if (environment !== 'sandbox') {
      return res.status(400).json({
        ok: false,
        message: 'Test bloccato: PAYPAL_ENV non è sandbox.'
      });
    }

    await getAccessToken();

    return res.status(200).json({
      ok: true,
      environment: 'sandbox',
      message: 'Connessione PayPal Sandbox riuscita.'
    });
  } catch (error) {
    console.error('PayPal connection test:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Errore di connessione a PayPal.'
    });
  }
};
