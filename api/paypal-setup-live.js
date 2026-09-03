const BASE='https://api-m.paypal.com';

async function token(){
  const id=process.env.PAYPAL_LIVE_CLIENT_ID;
  const secret=process.env.PAYPAL_LIVE_CLIENT_SECRET;
  if(!id||!secret) throw new Error('Credenziali PayPal Live mancanti');
  const r=await fetch(`${BASE}/v1/oauth2/token`,{
    method:'POST',
    headers:{
      Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:'grant_type=client_credentials'
  });
  const d=await r.json();
  if(!r.ok) throw new Error(d.error_description||d.error||'Errore autenticazione PayPal Live');
  return d.access_token;
}

async function pp(path,method,t,body){
  const r=await fetch(`${BASE}${path}`,{
    method,
    headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','Accept':'application/json'},
    body:body?JSON.stringify(body):undefined
  });
  const d=await r.json();
  if(!r.ok) throw new Error(`${r.status} ${JSON.stringify(d)}`);
  return d;
}

module.exports=async function(req,res){
  if(req.method!=='GET') return res.status(405).json({ok:false,message:'Metodo non consentito'});
  try{
    const t=await token();
    const product=await pp('/v1/catalogs/products','POST',t,{
      name:'Progetto Libri Liberi',
      description:'Adesioni e sostegno a Progetto Libri Liberi',
      type:'SERVICE',
      category:'CHARITY'
    });

    const defs=[
      ['sostenitore-mensile','Sostenitore mensile','MONTH',1,'3.99'],
      ['sostenitore-annuale','Sostenitore annuale','YEAR',1,'39.90'],
      ['partner-mensile','Partner mensile','MONTH',1,'19.90'],
      ['partner-annuale','Partner annuale','YEAR',1,'189.00'],
      ['sponsor-mensile','Sponsor mensile','MONTH',1,'49.90'],
      ['sponsor-annuale','Sponsor annuale','YEAR',1,'489.00']
    ];
    const plans={};
    for(const [key,name,unit,count,value] of defs){
      const p=await pp('/v1/billing/plans','POST',t,{
        product_id:product.id,
        name,
        description:`${name} - Progetto Libri Liberi`,
        status:'ACTIVE',
        billing_cycles:[{
          frequency:{interval_unit:unit,interval_count:count},
          tenure_type:'REGULAR',
          sequence:1,
          total_cycles:0,
          pricing_scheme:{fixed_price:{value,currency_code:'EUR'}}
        }],
        payment_preferences:{
          auto_bill_outstanding:true,
          setup_fee:{value:'0',currency_code:'EUR'},
          setup_fee_failure_action:'CONTINUE',
          payment_failure_threshold:3
        }
      });
      plans[key]=p.id;
    }
    return res.status(200).json({ok:true,environment:'live',product_id:product.id,plans});
  }catch(e){
    console.error('PayPal LIVE setup:',e);
    return res.status(500).json({ok:false,message:e.message});
  }
};