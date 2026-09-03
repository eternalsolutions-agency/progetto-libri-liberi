const SUPABASE_URL = 'https://axudbwobzmmrqpdnbamp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_JHJBoonYn5HFxERyv-RWKA_oKpYsV7W';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ items: [] });

  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/galleria?select=id,titolo,immagine_url,alt_text,ordine&pubblicata=eq.true&order=ordine.asc,created_at.desc`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Supabase gallery error ${response.status}: ${details}`);
    }

    const items = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ items: [], error: 'gallery_unavailable' });
  }
};
