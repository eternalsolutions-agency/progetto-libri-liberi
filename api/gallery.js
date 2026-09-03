module.exports=async function handler(req,res){
 if(req.method!=='GET') return res.status(405).json({items:[]});
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) return res.status(200).json({items:[]});
 try{
  const r=await fetch(`${url}/rest/v1/galleria?select=id,titolo,immagine_url,alt_text,ordine&pubblicata=eq.true&order=ordine.asc`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok) throw new Error('Supabase gallery error');
  return res.status(200).json({items:await r.json()});
 }catch(e){console.error(e);return res.status(200).json({items:[]});}
};
