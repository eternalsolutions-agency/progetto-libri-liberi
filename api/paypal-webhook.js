const SUPABASE_URL='https://axudbwobzmmrqpdnbamp.supabase.co';
const WEBHOOK_ID=process.env.PAYPAL_WEBHOOK_ID||'2TS94082WP2195014';

function paypalBase(){
  return (process.env.PAYPAL_ENV||'sandbox')==='live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function accessToken(){
  const id=process.env.PAYPAL_CLIENT_ID;
  const secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id||!secret) throw new Error('Credenziali PayPal mancanti');
  const r=await fetch(`${paypalBase()}/v1/oauth2/token`,{
    method:'POST',
    headers:{
      Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:'grant_type=client_credentials'
  });
  const d=await r.json();
  if(!r.ok) throw new Error(d.error_description||'PayPal auth error');
  return d.access_token;
}

async function verifyWebhook(req,event,token){
  const h=req.headers;
  const payload={
    auth_algo:h['paypal-auth-algo'],
    cert_url:h['paypal-cert-url'],
    transmission_id:h['paypal-transmission-id'],
    transmission_sig:h['paypal-transmission-sig'],
    transmission_time:h['paypal-transmission-time'],
    webhook_id:WEBHOOK_ID,
    webhook_event:event
  };
  if(!payload.auth_algo||!payload.cert_url||!payload.transmission_id||
     !payload.transmission_sig||!payload.transmission_time){
    throw new Error('Header di verifica PayPal mancanti');
  }
  const r=await fetch(`${paypalBase()}/v1/notifications/verify-webhook-signature`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const d=await r.json();
  if(!r.ok||d.verification_status!=='SUCCESS')
    throw new Error('Firma webhook PayPal non valida');
}

async function supabase(path,method,key,body,prefer='return=minimal'){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    method,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      'Content-Type':'application/json',
      Prefer:prefer
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const raw=await r.text();
  if(!r.ok) throw new Error(`Supabase ${r.status}: ${raw}`);
  if(!raw) return null;
  try{return JSON.parse(raw)}catch{return raw}
}

function getSubscriptionId(event){
  const r=event.resource||{};
  if(String(event.event_type||'').startsWith('BILLING.SUBSCRIPTION.')) return r.id||null;
  if(event.event_type==='PAYMENT.SALE.COMPLETED')
    return r.billing_agreement_id||r.subscription_id||null;
  return null;
}

async function paymentExists(sid,key){
  const rows=await supabase(
    `pagamenti?provider_subscription_id=eq.${encodeURIComponent(sid)}&select=id&limit=1`,
    'GET',key,undefined,'return=representation'
  );
  return Array.isArray(rows)&&rows.length>0;
}



module.exports=async function(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Metodo non consentito'});

  try{
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante');

    const event=req.body;
    if(!event?.id||!event?.event_type)
      return res.status(400).json({ok:false,message:'Evento PayPal non valido'});

    const token=await accessToken();
    await verifyWebhook(req,event,token);

    const sid=getSubscriptionId(event);
    if(!sid) return res.status(200).json({ok:true,ignored:true,event:event.event_type});

    // Idempotenza naturale: gli eventi di stato fanno PATCH sulla stessa sottoscrizione.
    // PAYMENT.SALE.COMPLETED aggiorna la riga esistente e non crea duplicati.
    const exists=await paymentExists(sid,key);
    if(!exists){
      // L'inserimento iniziale è responsabilità dell'onApprove verificato.
      // Un webhook sconosciuto non può inventare una nuova adesione.
      return res.status(200).json({ok:true,ignored:true,reason:'subscription_not_registered',subscription_id:sid});
    }

    const type=event.event_type;
    const state={
      'BILLING.SUBSCRIPTION.ACTIVATED':'attivo',
      'BILLING.SUBSCRIPTION.RE-ACTIVATED':'attivo',
      'BILLING.SUBSCRIPTION.CANCELLED':'cancellato',
      'BILLING.SUBSCRIPTION.SUSPENDED':'sospeso',
      'BILLING.SUBSCRIPTION.EXPIRED':'scaduto',
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED':'pagamento_fallito'
    }[type];

    if(state){
      await supabase(
        `pagamenti?provider_subscription_id=eq.${encodeURIComponent(sid)}`,
        'PATCH',key,{stato:state,updated_at:new Date().toISOString()}
      );
    }else if(type==='BILLING.SUBSCRIPTION.UPDATED'){
      const ps=String(event.resource?.status||'').toUpperCase();
      const mapped={
        ACTIVE:'attivo',SUSPENDED:'sospeso',
        CANCELLED:'cancellato',EXPIRED:'scaduto'
      }[ps];
      if(mapped){
        await supabase(
          `pagamenti?provider_subscription_id=eq.${encodeURIComponent(sid)}`,
          'PATCH',key,{stato:mapped,updated_at:new Date().toISOString()}
        );
      }
    }else if(type==='PAYMENT.SALE.COMPLETED'){
      const r=event.resource||{};
      await supabase(
        `pagamenti?provider_subscription_id=eq.${encodeURIComponent(sid)}`,
        'PATCH',key,{
          provider_transaction_id:r.id||null,
          stato:'attivo',
          updated_at:new Date().toISOString()
        }
      );
    }

    return res.status(200).json({ok:true,event:type,subscription_id:sid});
  }catch(e){
    console.error('PayPal webhook:',e);
    return res.status(400).json({ok:false,message:e.message||'Webhook error'});
  }
};