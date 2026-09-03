function paypalBase() {
  return (process.env.PAYPAL_ENV || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function token() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Credenziali PayPal mancanti.');

  const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || 'Autenticazione PayPal fallita.');
  return d.access_token;
}

async function pp(path, accessToken, options = {}) {
  const r = await fetch(`${paypalBase()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || d.name || `Errore PayPal ${r.status}`);
  return d;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Metodo non consentito.' });
  }

  try {
    if ((process.env.PAYPAL_ENV || 'sandbox') !== 'sandbox') {
      return res.status(400).json({ ok: false, message: 'Operazione consentita solo in Sandbox.' });
    }

    const accessToken = await token();
    const productName = 'Sostenitore Progetto Libri Liberi';
    const planName = 'Sostenitore mensile 3,99 EUR';

    const products = await pp('/v1/catalogs/products?page_size=20&page=1&total_required=true', accessToken);
    let product = (products.products || []).find(p => p.name === productName);

    if (!product) {
      product = await pp('/v1/catalogs/products', accessToken, {
        method: 'POST',
        headers: { 'PayPal-Request-Id': 'pll-sostenitore-product-20260903' },
        body: JSON.stringify({
          name: productName,
          description: 'Abbonamento sostenitore per privati del Progetto Libri Liberi',
          type: 'SERVICE'
        })
      });
    }

    const plans = await pp(
      `/v1/billing/plans?product_id=${encodeURIComponent(product.id)}&page_size=20&page=1&total_required=true`,
      accessToken
    );
    let plan = (plans.plans || []).find(p => p.name === planName && p.status !== 'INACTIVE');

    if (!plan) {
      plan = await pp('/v1/billing/plans', accessToken, {
        method: 'POST',
        headers: { 'PayPal-Request-Id': 'pll-sostenitore-monthly-20260903' },
        body: JSON.stringify({
          product_id: product.id,
          name: planName,
          description: 'Sostenitore Progetto Libri Liberi - rinnovo mensile',
          status: 'ACTIVE',
          billing_cycles: [{
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: { value: '3.99', currency_code: 'EUR' }
            }
          }],
          payment_preferences: {
            auto_bill_outstanding: true,
            payment_failure_threshold: 1
          }
        })
      });
    }

    return res.status(200).json({
      ok: true,
      environment: 'sandbox',
      product_id: product.id,
      plan_id: plan.id,
      status: plan.status,
      plan: planName,
      amount: '3.99 EUR',
      frequency: 'mensile'
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: e.message || 'Errore PayPal.' });
  }
};
