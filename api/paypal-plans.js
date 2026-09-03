const BASE='https://api-m.sandbox.paypal.com';
async function token(){const id=process.env.PAYPAL_CLIENT_ID,s=process.env.PAYPAL_CLIENT_SECRET;if(!id||!s)throw Error('Credenziali PayPal mancanti');const r=await fetch(BASE+'/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${id}:${s}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});const d=await r.json();if(!r.ok)throw Error(d.error_description||'Autenticazione PayPal fallita');return d.access_token}
async function call(path,t,opt={}){const r=await fetch(BASE+path,{...opt,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json',...(opt.headers||{})}});const text=await r.text();let d={};try{d=JSON.parse(text)}catch{}if(!r.ok){const detail=d.details?.map(x=>`${x.field||''} ${x.issue||''}`).join('; ');throw Error(detail||d.message||text||`PayPal ${r.status}`)}return d}
const defs=[
 ['sostenitore-annuale','Sostenitore Progetto Libri Liberi','YEAR','39.90','Sostenitore annuale 39,90 EUR'],
 ['partner-mensile','Partner Progetto Libri Liberi','MONTH','19.90','Partner mensile 19,90 EUR'],
 ['partner-annuale','Partner Progetto Libri Liberi','YEAR','189.00','Partner annuale 189 EUR'],
 ['sponsor-mensile','Sponsor Progetto Libri Liberi','MONTH','49.90','Sponsor mensile 49,90 EUR'],
 ['sponsor-annuale','Sponsor Progetto Libri Liberi','YEAR','489.00','Sponsor annuale 489 EUR']
];
module.exports=async(req,res)=>{if(req.method!=='GET')return res.status(405).json({ok:false,message:'Metodo non consentito'});try{
 if((process.env.PAYPAL_ENV||'sandbox')!=='sandbox')throw Error('PAYPAL_ENV deve essere sandbox');
 const t=await token(),out={'sostenitore-mensile':'P-93G84049M39763023NKMWXIQ'};
 for(const [slug,productName,unit,price,planName] of defs){
   const product=await call('/v1/catalogs/products',t,{method:'POST',headers:{'PayPal-Request-Id':`pll-${slug}-product-v4`},body:JSON.stringify({name:productName,type:'SERVICE'})});
   const plan=await call('/v1/billing/plans',t,{method:'POST',headers:{'PayPal-Request-Id':`pll-${slug}-plan-v4`},body:JSON.stringify({
     product_id:product.id,
     name:planName,
     billing_cycles:[{frequency:{interval_unit:unit,interval_count:1},tenure_type:'REGULAR',sequence:1,total_cycles:0,pricing_scheme:{fixed_price:{value:price,currency_code:'EUR'}}}],
     payment_preferences:{auto_bill_outstanding:true,payment_failure_threshold:1}
   })});
   out[slug]=plan.id;
 }
 return res.status(200).json({ok:true,environment:'sandbox',plans:out});
}catch(e){return res.status(500).json({ok:false,message:e.message})}};
