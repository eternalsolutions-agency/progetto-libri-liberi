const SUPABASE_URL = 'https://axudbwobzmmrqpdnbamp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JHJBoonYn5HFxERyv-RWKA_oKpYsV7W';

function paypalBase() {
  return (process.env.PAYPAL_ENV || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}
async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_CLIENT_SECRET;
  const r = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method:'POST',
    headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  const d = await r.json();
  if(!r.ok) throw new Error(d.error_description || 'PayPal auth error');
  return d.access_token;
}
module.exports = async function(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Metodo non consentito'});
  try{
    if((process.env.PAYPAL_ENV||'sandbox')!=='sandbox') return res.status(400).json({ok:false,message:'Endpoint di test solo Sandbox'});
    const {subscription_id,tipologia,piano,importo}=req.body||{};
    if(!subscription_id) return res.status(400).json({ok:false,message:'Subscription ID mancante'});
    const token=await accessToken();
    const pr=await fetch(`${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(subscription_id)}`,{
      headers:{Authorization:`Bearer ${token}`}
    });
    const sub=await pr.json();
    if(!pr.ok) throw new Error(sub.message||'Impossibile verificare la sottoscrizione');
    if(sub.plan_id!=='P-93G84049M39763023NKMWXIQ') return res.status(400).json({ok:false,message:'Piano PayPal non valido'});
    if(!['ACTIVE','APPROVAL_PENDING','APPROVED'].includes(sub.status)) return res.status(400).json({ok:false,message:`Stato sottoscrizione non valido: ${sub.status}`});

    const email=sub.subscriber?.email_address||null;
    const rr=await fetch(`${SUPABASE_URL}/rest/v1/pagamenti`,{
      method:'POST',
      headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({
        email,
        tipologia:tipologia||'sostenitore',
        piano:piano||'mensile',
        importo:Number(importo||3.99),
        provider:'paypal',
        provider_subscription_id:subscription_id,
        stato:sub.status==='ACTIVE'?'attivo':'in_attesa',
        data_inizio:new Date().toISOString()
      })
    });
    if(!rr.ok) throw new Error('PayPal verificato, ma Supabase ha rifiutato la registrazione');
    return res.status(200).json({ok:true,subscription_id,status:sub.status});
  }catch(e){
    console.error(e);
    return res.status(500).json({ok:false,message:e.message||'Errore'});
  }
};