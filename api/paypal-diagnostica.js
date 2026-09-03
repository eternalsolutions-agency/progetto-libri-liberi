const BASE='https://api-m.sandbox.paypal.com';
const SUBSCRIPTION_ID='I-YE15DURH2SB6';
const EXPECTED_PLAN='P-93G84049M39763023NKMWXIQ';

async function token(){
  const id=process.env.PAYPAL_CLIENT_ID, secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id||!secret) throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET mancanti');
  const r=await fetch(BASE+'/v1/oauth2/token',{
    method:'POST',
    headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  const d=await r.json();
  if(!r.ok) throw new Error('PayPal auth: '+(d.error_description||d.error||r.status));
  return d.access_token;
}

module.exports=async(req,res)=>{
  if(req.method!=='GET') return res.status(405).json({ok:false,message:'Usa GET'});
  try{
    const t=await token();
    const r=await fetch(`${BASE}/v1/billing/subscriptions/${SUBSCRIPTION_ID}`,{
      headers:{Authorization:`Bearer ${t}`}
    });
    const sub=await r.json();
    if(!r.ok) return res.status(r.status).json({ok:false,step:'paypal_lookup',paypal:sub});

    const result={
      subscription_id:sub.id,
      status:sub.status,
      plan_id:sub.plan_id,
      plan_matches:sub.plan_id===EXPECTED_PLAN,
      subscriber_email:sub.subscriber?.email_address||null,
      subscriber_name:[sub.subscriber?.name?.given_name,sub.subscriber?.name?.surname].filter(Boolean).join(' ')||null,
      start_time:sub.start_time||null,
      next_billing_time:sub.billing_info?.next_billing_time||null,
      last_payment:sub.billing_info?.last_payment||null
    };

    // Diagnose the same Supabase REST insert used by the current integration.
    const SU='https://axudbwobzmmrqpdnbamp.supabase.co';
    const SK='sb_publishable_JHJBoonYn5HFxERyv-RWKA_oKpYsV7W';
    const payload={
      email:result.subscriber_email,
      tipologia:'sostenitore',
      piano:'mensile',
      importo:3.99,
      provider:'paypal',
      provider_subscription_id:SUBSCRIPTION_ID,
      stato:sub.status==='ACTIVE'?'attivo':'in_attesa',
      data_inizio:new Date().toISOString()
    };
    const sr=await fetch(`${SU}/rest/v1/pagamenti`,{
      method:'POST',
      headers:{apikey:SK,Authorization:`Bearer ${SK}`,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify(payload)
    });
    const raw=await sr.text();
    let body; try{body=JSON.parse(raw)}catch{body=raw}

    if(!sr.ok) return res.status(200).json({
      ok:false,
      step:'supabase_insert',
      paypal:result,
      payload_sent:payload,
      supabase_status:sr.status,
      supabase_response:body
    });

    return res.status(200).json({
      ok:true,
      message:'Abbonamento PayPal verificato e registrato in Supabase.',
      paypal:result,
      inserted:body
    });
  }catch(e){
    return res.status(500).json({ok:false,step:'exception',message:e.message});
  }
};