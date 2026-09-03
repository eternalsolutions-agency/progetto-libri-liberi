module.exports=async function handler(req,res){
 if(req.method!=='GET') return res.status(405).json({items:[]});
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) return res.status(200).json({items:[]});
 try{
  const r=await fetch(`${url}/rest/v1/gallery?select=id,title,image_url,sort_order&published=eq.true&order=sort_order.asc`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok) throw new Error('Supabase gallery error');
  return res.status(200).json({items:await r.json()});
 }catch(e){console.error(e);return res.status(200).json({items:[]});}
};
