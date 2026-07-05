const toggle=document.querySelector('.mobile-toggle');const menu=document.querySelector('.menu');if(toggle&&menu){toggle.addEventListener('click',()=>menu.classList.toggle('open'))}
const counters=document.querySelectorAll('[data-count]');let counted=false;function countUp(){if(counted)return;const stats=document.querySelector('.stats');if(!stats)return;const r=stats.getBoundingClientRect();if(r.top<innerHeight-80){counted=true;counters.forEach(el=>{const target=+el.dataset.count;let n=0;const step=Math.max(1,Math.ceil(target/42));const t=setInterval(()=>{n+=step;if(n>=target){n=target;clearInterval(t)}el.textContent=n},35)})}}addEventListener('scroll',countUp);countUp();
const lightbox=document.createElement('div');lightbox.className='lightbox';lightbox.innerHTML='<img alt="Foto Rifugio Libero">';document.body.appendChild(lightbox);document.querySelectorAll('.gallery img').forEach(img=>{img.addEventListener('click',()=>{lightbox.querySelector('img').src=img.src;lightbox.classList.add('open')})});lightbox.addEventListener('click',()=>lightbox.classList.remove('open'));
const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('show')})},{threshold:.12});document.querySelectorAll('.reveal,.card,.section-title').forEach(el=>io.observe(el));

const mapEl=document.querySelector('.fake-map');const listEl=document.querySelector('.locations');
const mapSearch=document.querySelector('#mapSearch');const selectedLocation=document.querySelector('#selectedLocation');
const locations=[
 {name:'Pisa - Via Andrea Pisano',address:'Via Andrea Pisano, Pisa',x:36,y:34,img:'casetta-3.jpeg'},
 {name:'Centro diurno Il Quadrifoglio',address:'Via G. Toniolo 13, Pisa',x:49,y:29,img:'casetta-4.jpeg'},
 {name:'Parco naturale Migliarino San Rossore',address:'Loc. Sterpaia, Parco Naturale Migliarino San Rossore, Pisa',x:22,y:56,img:'casetta1.jpeg'},
 {name:'S. Frediano a Settimo',address:'Via Viviani, San Frediano a Settimo, Pisa',x:63,y:45,img:'casetta-5.jpeg'},
 {name:'Musigliano Cascina',address:'Piazza centrale, Via Rodolfo Berretta, Musigliano Cascina, Pisa',x:71,y:62,img:'casetta-6.jpeg'},
 {name:'S. Giorgio Cascina',address:'Centro ippico Battaglino, San Giorgio Cascina, Pisa',x:58,y:72,img:'casetta-8.jpeg'},
 {name:'Vicopisano - Cucigliana',address:'Bar-pizzeria Sottomonte, Cucigliana, Vicopisano, Pisa',x:83,y:49,img:'casetta.jpeg'},
 {name:'Orentano',address:'Piazza S. Lorenzo, Orentano, Pisa',x:78,y:27,img:'casetta-3.jpeg'},
 {name:'Terricciola',address:'Via del Chianti e parco giochi di Morrona, Terricciola, Pisa',x:41,y:78,img:'casetta-4.jpeg'}
];
function mapsUrl(address){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)}
function selectLoc(i){
 const loc=locations[i];if(!loc||!mapEl||!listEl)return;
 document.querySelectorAll('.pin,.loc').forEach(el=>el.classList.remove('active'));
 document.querySelectorAll(`[data-loc="${i}"]`).forEach(el=>el.classList.add('active'));
 if(selectedLocation){selectedLocation.innerHTML=`<strong>${loc.name}</strong><br><span>${loc.address}</span><br><a class="btn btn-blue" style="margin-top:12px;padding:10px 14px" target="_blank" rel="noopener" href="${mapsUrl(loc.address)}">Apri indicazioni</a>`}
}
if(mapEl&&listEl){
 locations.forEach((loc,i)=>{
  const pin=document.createElement('button');pin.className='pin';pin.type='button';pin.style.left=loc.x+'%';pin.style.top=loc.y+'%';pin.dataset.loc=i;pin.title=loc.name;pin.innerHTML='🏡';pin.addEventListener('click',()=>selectLoc(i));mapEl.appendChild(pin);
  const card=document.createElement('div');card.className='loc';card.dataset.loc=i;card.innerHTML=`<div><strong>${loc.name}</strong><small>${loc.address}</small></div><div class="loc-actions"><button type="button">Vedi</button><a target="_blank" rel="noopener" href="${mapsUrl(loc.address)}">Indicazioni</a></div>`;card.querySelector('button').addEventListener('click',()=>selectLoc(i));listEl.appendChild(card);
 });
 selectLoc(0);
 if(mapSearch){mapSearch.addEventListener('input',()=>{const q=mapSearch.value.toLowerCase().trim();locations.forEach((loc,i)=>{const show=(loc.name+' '+loc.address).toLowerCase().includes(q);document.querySelectorAll(`[data-loc="${i}"]`).forEach(el=>el.classList.toggle('hidden',!show))})})}
}
