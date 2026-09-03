const SUPABASE_URL = 'https://axudbwobzmmrqpdnbamp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JHJBoonYn5HFxERyv-RWKA_oKpYsV7W';

function paypalBase() {
  return (process.env.PAYPAL_ENV || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function requireAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return false;
  const user = await userRes.json();

  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } }
  );
  if (!adminRes.ok) return false;
  const rows = await adminRes.json();
  return Array.isArray(rows) && rows.length === 1;
}

async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Credenziali PayPal mancanti su Vercel.');

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Autenticazione PayPal fallita.');
  return data.access_token;
}

async function pp(path, token, options = {}) {
  const res = await fetch(`${paypalBase()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.name || `Errore PayPal ${res.status}`);
  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Metodo non consentito.' });

  try {
    if (!(await requireAdmin(req))) {
      return res.status(403).json({ ok: false, message: 'Accesso amministratore richiesto.' });
    }

    if ((process.env.PAYPAL_ENV || 'sandbox') !== 'sandbox') {
      return res.status(400).json({ ok: false, message: 'Questa procedura è consentita solo in Sandbox.' });
    }

    const token = await accessToken();

    const productName = 'Sostenitore Progetto Libri Liberi';
    const planName = 'Sostenitore mensile 3,99 EUR';

    const products = await pp('/v1/catalogs/products?page_size=20&page=1&total_required=true', token);
    let product = (products.products || []).find(p => p.name === productName);

    if (!product) {
      product = await pp('/v1/catalogs/products', token, {
        method: 'POST',
        headers: { 'PayPal-Request-Id': 'pll-sostenitore-product-v1' },
        body: JSON.stringify({
          name: productName,
          description: 'Abbonamento sostenitore per privati del Progetto Libri Liberi',
          type: 'SERVICE',
          category: 'CHARITY'
        })
      });
    }

    const plans = await pp(`/v1/billing/plans?product_id=${encodeURIComponent(product.id)}&page_size=20&page=1&total_required=true`, token);
    let plan = (plans.plans || []).find(p => p.name === planName && p.status !== 'INACTIVE');

    if (!plan) {
      plan = await pp('/v1/billing/plans', token, {
        method: 'POST',
        headers: { 'PayPal-Request-Id': 'pll-sostenitore-monthly-v1' },
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
            pricing_scheme: { fixed_price: { value: '3.99', currency_code: 'EUR' } }
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
      plan_name: plan.name,
      amount: '3.99 EUR / mese'
    });
  } catch (error) {
    console.error('PayPal setup error:', error);
    return res.status(500).json({ ok: false, message: error.message || 'Errore durante la configurazione PayPal.' });
  }
};
