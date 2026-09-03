function base(){return (process.env.PAYPAL_ENV||'sandbox')==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com'}
async function token(){const id=process.env.PAYPAL_CLIENT_ID,s=process.env.PAYPAL_CLIENT_SECRET;if(!id||!s)throw Error('Credenziali PayPal mancanti');const r=await fetch(base()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${id}:${s}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});const d=await r.json();if(!r.ok)throw Error(d.error_description||'PayPal auth error');return d.access_token}
async function pp(path,t,o={}){const r=await fetch(base()+path,{...o,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json',...(o.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||d.name||`PayPal ${r.status}`);return d}
const defs=[
 ['sostenitore-mensile','Sostenitore','MONTH','3.99','Sostenitore mensile 3,99 EUR'],
 ['sostenitore-annuale','Sostenitore','YEAR','39.90','Sostenitore annuale 39,90 EUR'],
 ['partner-mensile','Partner','MONTH','19.90','Partner mensile 19,90 EUR'],
 ['partner-annuale','Partner','YEAR','189.00','Partner annuale 189 EUR'],
 ['sponsor-mensile','Sponsor','MONTH','49.90','Sponsor mensile 49,90 EUR'],
 ['sponsor-annuale','Sponsor','YEAR','489.00','Sponsor annuale 489 EUR']
];
module.exports=async(req,res)=>{if(req.method!=='GET')return res.status(405).json({ok:false});try{
 if((process.env.PAYPAL_ENV||'sandbox')!=='sandbox')return res.status(400).json({ok:false,message:'Solo Sandbox'});
 const t=await token(), out={};
 const products=await pp('/v1/catalogs/products?page_size=50&page=1&total_required=true',t);
 for(const [slug,label,unit,price,pname] of defs){
   const productName=label+' Progetto Libri Liberi';
   let product=(products.products||[]).find(p=>p.name===productName);
   if(!product) product=await pp('/v1/catalogs/products',t,{method:'POST',headers:{'PayPal-Request-Id':`pll-${label.toLowerCase()}-product-v2`},body:JSON.stringify({name:productName,description:`Abbonamento ${label} Progetto Libri Liberi`,type:'SERVICE'})});
   const ps=await pp(`/v1/billing/plans?product_id=${encodeURIComponent(product.id)}&page_size=50&page=1&total_required=true`,t);
   let plan=(ps.plans||[]).find(p=>p.name===pname&&p.status!=='INACTIVE');
   if(!plan) plan=await pp('/v1/billing/plans',t,{method:'POST',headers:{'PayPal-Request-Id':`pll-${slug}-v2`},body:JSON.stringify({product_id:product.id,name:pname,description:`${label} Progetto Libri Liberi - ${unit==='MONTH'?'rinnovo mensile':'rinnovo annuale'}`,status:'ACTIVE',billing_cycles:[{frequency:{interval_unit:unit,interval_count:1},tenure_type:'REGULAR',sequence:1,total_cycles:0,pricing_scheme:{fixed_price:{value:price,currency_code:'EUR'}}}],payment_preferences:{auto_bill_outstanding:true,payment_failure_threshold:1}})});
   out[slug]=plan.id;
 }
 return res.status(200).json({ok:true,environment:'sandbox',plans:out});
}catch(e){console.error(e);return res.status(500).json({ok:false,message:e.message||'Errore PayPal'})}};
