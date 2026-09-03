const SANDBOX_PLANS={"sostenitore-mensile": "P-93G84049M39763023NKMWXIQ", "sostenitore-annuale": "P-35292608CJ9955259NKMXPBQ", "partner-mensile": "P-45885765J93513534NKMXPBY", "partner-annuale": "P-7S305652AE760404ENKMXPCA", "sponsor-mensile": "P-83G22360TS406391YNKMXPCA", "sponsor-annuale": "P-1CR59062UF415371RNKMXPCI"};
const LIVE_PLANS={"sostenitore-mensile": "P-9A561918VF768084BNKMZQDA", "sostenitore-annuale": "P-2EN81542U3034004CNKMZQDA", "partner-mensile": "P-49H94937NM375584RNKMZQDA", "partner-annuale": "P-15K98418UR180681TNKMZQDA", "sponsor-mensile": "P-6RX74384NX2907108NKMZQDI", "sponsor-annuale": "P-5CW677631B732840SNKMZQDI"};
module.exports=async function(req,res){
 if(req.method!=='GET')return res.status(405).json({ok:false,message:'Metodo non consentito'});
 const live=(process.env.PAYPAL_ENV||'sandbox')==='live';
 const clientId=live?process.env.PAYPAL_LIVE_CLIENT_ID:process.env.PAYPAL_CLIENT_ID;
 if(!clientId)return res.status(500).json({ok:false,message:'PayPal Client ID non configurato'});
 return res.status(200).json({ok:true,environment:live?'live':'sandbox',client_id:clientId,plans:live?LIVE_PLANS:SANDBOX_PLANS});
};