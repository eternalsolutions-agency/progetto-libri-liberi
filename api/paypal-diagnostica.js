const BASE='https://api-m.sandbox.paypal.com';
const SUBSCRIPTION_ID='I-YE15DURH2SB6';
const SUPABASE_URL='https://axudbwobzmmrqpdnbamp.supabase.co';

async function token(){
  const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id||!secret) throw new Error('Credenziali PayPal mancanti');
  const r=await fetch(BASE+'/v1/oauth2/token',{
    method:'POST',
    headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  const d=await r.json();
  if(!r.ok) throw new Error(d.error_description||'PayPal auth error');
  return d.access_token;
}
module.exports=async(req,res)=>{
  if(req.method!=='GET') return res.status(405).json({ok:false,message:'Usa GET'});
  try{
    const sk=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!sk) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante su Vercel');

    const t=await token();
    const r=await fetch(`${BASE}/v1/billing/subscriptions/${SUBSCRIPTION_ID}`,{
      headers:{Authorization:`Bearer ${t}`}
    });
    const sub=await r.json();
    if(!r.ok) return res.status(r.status).json({ok:false,step:'paypal_lookup',paypal:sub});

    const payload={
      email:sub.subscriber?.email_address||null,
      tipologia:'sostenitore',
      piano:'mensile',
      importo:3.99,
      provider:'paypal',
      provider_subscription_id:SUBSCRIPTION_ID,
      stato:sub.status==='ACTIVE'?'attivo':'in_attesa',
      data_inizio:sub.start_time||new Date().toISOString()
    };

    const sr=await fetch(`${SUPABASE_URL}/rest/v1/pagamenti`,{
      method:'POST',
      headers:{apikey:sk,Authorization:`Bearer ${sk}`,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify(payload)
    });
    const raw=await sr.text();
    let body;try{body=JSON.parse(raw)}catch{body=raw}
    if(!sr.ok) return res.status(200).json({ok:false,step:'supabase_insert',supabase_status:sr.status,supabase_response:body});

    return res.status(200).json({ok:true,message:'Registrazione con Service Role riuscita.',inserted:body});
  }catch(e){
    return res.status(500).json({ok:false,step:'exception',message:e.message});
  }
};