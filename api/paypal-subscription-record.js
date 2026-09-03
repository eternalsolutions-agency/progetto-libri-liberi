const SUPABASE_URL='https://axudbwobzmmrqpdnbamp.supabase.co';

const VALID_PLANS={
  'P-93G84049M39763023NKMWXIQ':{tipologia:'sostenitore',piano:'mensile',importo:3.99},
  'P-35292608CJ9955259NKMXPBQ':{tipologia:'sostenitore',piano:'annuale',importo:39.90},
  'P-45885765J93513534NKMXPBY':{tipologia:'partner',piano:'mensile',importo:19.90},
  'P-7S305652AE760404ENKMXPCA':{tipologia:'partner',piano:'annuale',importo:189},
  'P-83G22360TS406391YNKMXPCA':{tipologia:'sponsor',piano:'mensile',importo:49.90},
  'P-1CR59062UF415371RNKMXPCI':{tipologia:'sponsor',piano:'annuale',importo:489}
};

function paypalBase(){
  return (process.env.PAYPAL_ENV||'sandbox')==='live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}
async function accessToken(){
  const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id||!secret) throw new Error('Credenziali PayPal mancanti');
  const r=await fetch(`${paypalBase()}/v1/oauth2/token`,{
    method:'POST',
    headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  const d=await r.json();
  if(!r.ok) throw new Error(d.error_description||'PayPal auth error');
  return d.access_token;
}
module.exports=async function(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Metodo non consentito'});
  try{
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante su Vercel');

    const {subscription_id}=req.body||{};
    if(!subscription_id) return res.status(400).json({ok:false,message:'Subscription ID mancante'});

    const token=await accessToken();
    const pr=await fetch(`${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(subscription_id)}`,{
      headers:{Authorization:`Bearer ${token}`}
    });
    const sub=await pr.json();
    if(!pr.ok) throw new Error(sub.message||'Impossibile verificare la sottoscrizione');

    const verified=VALID_PLANS[sub.plan_id];
    if(!verified) return res.status(400).json({ok:false,message:'Piano PayPal non riconosciuto'});
    if(!['ACTIVE','APPROVAL_PENDING','APPROVED'].includes(sub.status))
      return res.status(400).json({ok:false,message:`Stato sottoscrizione non valido: ${sub.status}`});

    const payload={
      email:sub.subscriber?.email_address||null,
      nome:sub.subscriber?.name?.given_name||null,
      cognome:sub.subscriber?.name?.surname||null,
      tipologia:verified.tipologia,
      piano:verified.piano,
      importo:verified.importo,
      provider:'paypal',
      provider_subscription_id:subscription_id,
      stato:sub.status==='ACTIVE'?'attivo':'in_attesa',
      data_inizio:sub.start_time||new Date().toISOString()
    };

    const rr=await fetch(`${SUPABASE_URL}/rest/v1/pagamenti`,{
      method:'POST',
      headers:{
        apikey:serviceKey,
        Authorization:`Bearer ${serviceKey}`,
        'Content-Type':'application/json',
        Prefer:'return=minimal'
      },
      body:JSON.stringify(payload)
    });
    if(!rr.ok){
      const detail=await rr.text();
      throw new Error(`Supabase ${rr.status}: ${detail}`);
    }
    return res.status(200).json({ok:true,subscription_id,status:sub.status,plan:verified});
  }catch(e){
    console.error(e);
    return res.status(500).json({ok:false,message:e.message||'Errore'});
  }
};