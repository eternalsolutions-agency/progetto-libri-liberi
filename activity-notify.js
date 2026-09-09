const BREVO_EMAIL_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function clean(value, max = 1200) {
  return String(value ?? '').trim().slice(0, max);
}
function esc(value = '') {
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, message:'Metodo non consentito.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL || 'info@progettolibriliberi.it';
  if (!apiKey) return res.status(500).json({ ok:false, message:'Servizio email non configurato.' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch { return res.status(400).json({ ok:false, message:'Dati non validi.' }); }

  const allowed = new Set(['registrazione','download','attestato','richiesta_evento']);
  const tipo = clean(body.tipo, 60);
  if (!allowed.has(tipo)) return res.status(400).json({ ok:false, message:'Tipo evento non valido.' });

  const origin = clean(req.headers.origin || '', 300);
  const referer = clean(req.headers.referer || '', 500);
  const hostOk = !origin || /(^https:\/\/(www\.)?progettolibriliberi\.it$)|(^http:\/\/localhost(:\d+)?$)/i.test(origin);
  if (!hostOk) return res.status(403).json({ ok:false, message:'Origine non consentita.' });

  const details = {
    nome: clean(body.nome, 160),
    cognome: clean(body.cognome, 160),
    email: clean(body.email, 220),
    piano: clean(body.piano, 80),
    elemento: clean(body.elemento, 400),
    pagina: clean(body.pagina, 500),
    note: clean(body.note, 700),
    referer
  };

  const labels = {
    registrazione: '🆕 Nuova registrazione',
    download: '⬇️ Nuovo download',
    attestato: '🏆 Attestato scaricato',
    richiesta_evento: '📅 Nuova richiesta partecipazione evento'
  };
  const rows = [
    ['Tipo', labels[tipo]], ['Nome', details.nome], ['Cognome', details.cognome], ['Email', details.email],
    ['Piano', details.piano], ['Elemento', details.elemento], ['Pagina', details.pagina], ['Note', details.note],
    ['Data', new Date().toLocaleString('it-IT',{timeZone:'Europe/Rome'})]
  ].filter(([,v])=>v).map(([k,v])=>`<tr><td style="padding:9px;border-bottom:1px solid #eadfce;font-weight:700;width:150px">${esc(k)}</td><td style="padding:9px;border-bottom:1px solid #eadfce">${esc(v)}</td></tr>`).join('');

  try {
    const response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method:'POST',
      headers:{accept:'application/json','content-type':'application/json','api-key':apiKey},
      body:JSON.stringify({
        sender:{name:'Progetto Libri Liberi',email:contactEmail},
        to:[{email:contactEmail,name:'Progetto Libri Liberi'}],
        subject:`${labels[tipo]} - progettolibriliberi.it`,
        htmlContent:`<!doctype html><html><body style="margin:0;background:#f7f1e8;font-family:Arial,sans-serif;color:#2d241e"><div style="max-width:680px;margin:24px auto;background:#fff;border:1px solid #decdb5;border-radius:14px;overflow:hidden"><div style="background:#6b3f24;color:#fff;padding:20px 24px"><h1 style="margin:0;font-size:21px">${esc(labels[tipo])}</h1></div><table style="width:100%;border-collapse:collapse">${rows}</table></div></body></html>`
      })
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) { console.error('Brevo activity notify:', response.status, data); return res.status(502).json({ok:false}); }
    return res.status(200).json({ok:true});
  } catch (e) {
    console.error('Activity notify error:', e);
    return res.status(500).json({ok:false});
  }
};
