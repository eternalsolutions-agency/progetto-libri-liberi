const SUPABASE_URL='https://axudbwobzmmrqpdnbamp.supabase.co';
const WEBHOOK_ID='2TS94082WP2195014';

function paypalBase(){
  return (process.env.PAYPAL_ENV||'sandbox')==='live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}
async function accessToken(){
  const id=process.env.PAYPAL_CLIENT_ID, secret=process.env.PAYPAL_CLIENT_SECRET;
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
async function verify(req,event,token){
  const h=req.headers;
  const body={
    auth_algo:h['paypal-auth-algo'],
    cert_url:h['paypal-cert-url'],
    transmission_id:h['paypal-transmission-id'],
    transmission_sig:h['paypal-transmission-sig'],
    transmission_time:h['paypal-transmission-time'],
    webhook_id:WEBHOOK_ID,
    webhook_event:event
  };
  if(!body.auth_algo||!body.cert_url||!body.transmission_id||!body.transmission_sig||!body.transmission_time)
    throw new Error('Header di verifica PayPal mancanti');
  const r=await fetch(`${paypalBase()}/v1/notifications/verify-webhook-signature`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const d=await r.json();
  if(!r.ok||d.verification_status!=='SUCCESS') throw new Error('Firma webhook PayPal non valida');
}
async function sb(path,method,body,key){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    method,
    headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal'},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  if(!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}
function subscriptionId(event){
  const r=event.resource||{};
  if(String(event.event_type||'').startsWith('BILLING.SUBSCRIPTION.')) return r.id||null;
  if(event.event_type==='PAYMENT.SALE.COMPLETED')
    return r.billing_agreement_id||r.subscription_id||null;
  return null;
}
module.exports=async function(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Metodo non consentito'});
  try{
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante');
    const event=req.body;
    if(!event?.event_type) return res.status(400).json({ok:false,message:'Evento PayPal non valido'});

    const token=await accessToken();
    await verify(req,event,token);

    const sid=subscriptionId(event);
    if(!sid) return res.status(200).json({ok:true,ignored:true,event:event.event_type});

    const type=event.event_type;
    const statusMap={
      'BILLING.SUBSCRIPTION.ACTIVATED':'attivo',
      'BILLING.SUBSCRIPTION.RE-ACTIVATED':'attivo',
      'BILLING.SUBSCRIPTION.CANCELLED':'cancellato',
      'BILLING.SUBSCRIPTION.SUSPENDED':'sospeso',
      'BILLING.SUBSCRIPTION.EXPIRED':'scaduto',
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED':'pagamento_fallito'
    };

    if(statusMap[type]){
      await sb(`pagamenti?provider_subscription_id=eq.${encodeURIComponent(sid)}`,'PATCH',{
        stato:statusMap[type],updated_at:new Date().toISOString()
      },key);
    } else if(type==='BILLING.SUBSCRIPTION.UPDATED'){
      const st=(event.resource?.status||'').toUpperCase();
      const mapped={ACTIVE:'attivo',SUSPENDED:'sospeso',CANCELLED:'cancellato',EXPIRED:'scaduto'}[st];
      if(mapped) await sb(`pagamenti?provider_subscription_id=eq.${encodeURIComponent(sid)}`,'PATCH',{
        stato:mapped,updated_at:new Date().toISOString()
      },key);
    } else if(type==='PAYMENT.SALE.COMPLETED'){
      const r=event.resource||{};
      await sb(`pagamenti?provider_subscription_id=eq.${encodeURIComponent(sid)}`,'PATCH',{
        provider_transaction_id:r.id||null,
        stato:'attivo',
        updated_at:new Date().toISOString()
      },key);
    }
    return res.status(200).json({ok:true,event:type,subscription_id:sid});
  }catch(e){
    console.error('PayPal webhook:',e);
    return res.status(400).json({ok:false,message:e.message||'Webhook error'});
  }
};