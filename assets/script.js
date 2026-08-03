const toggle=document.querySelector('.mobile-toggle');const menu=document.querySelector('.menu');if(toggle&&menu){toggle.addEventListener('click',()=>menu.classList.toggle('open'))}
const counters=document.querySelectorAll('[data-count]');let counted=false;function countUp(){if(counted)return;const stats=document.querySelector('.stats');if(!stats)return;const r=stats.getBoundingClientRect();if(r.top<innerHeight-80){counted=true;counters.forEach(el=>{const target=+el.dataset.count;let n=0;const step=Math.max(1,Math.ceil(target/42));const t=setInterval(()=>{n+=step;if(n>=target){n=target;clearInterval(t)}el.textContent=n},35)})}}addEventListener('scroll',countUp);countUp();
const lightbox=document.createElement('div');lightbox.className='lightbox';lightbox.innerHTML='<img alt="Foto Progetto Libri Liberi">';document.body.appendChild(lightbox);document.querySelectorAll('.gallery img').forEach(img=>{img.addEventListener('click',()=>{lightbox.querySelector('img').src=img.src;lightbox.classList.add('open')})});lightbox.addEventListener('click',()=>lightbox.classList.remove('open'));
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
,
 {name:'CAAF ACLI Pisa',address:'Via Francesco da Buti 20, Pisa',x:46,y:33,img:'casetta-3.jpeg'},
 {name:'Ghezzano',address:'Piazza Tempesti, Ghezzano, Pisa',x:52,y:31,img:'casetta-4.jpeg'},
 {name:'Pasticceria Mannocci Titignano',address:'Titignano, Pisa',x:60,y:52,img:'casetta-5.jpeg'},
 {name:'Bibliocabina San Giuliano Terme',address:'Largo Collodi, San Giuliano Terme, Pisa',x:44,y:22,img:'casetta1.jpeg'},
 {name:'Farmacia Latignano',address:'Via Risorgimento 33, Latignano, Pisa',x:68,y:58,img:'casetta-6.jpeg'},
 {name:'Frigo Libro Ponsacco',address:'Piazza Giovanni Paolo II, Ponsacco, Pisa',x:34,y:86,img:'casetta-8.jpeg'},
 {name:'Crespina',address:'Parco Via XXI Aprile 29, Crespina, Pisa',x:37,y:82,img:'casetta.jpeg'},
 {name:'Calci',address:'Parco della Fonderia, Calci, Pisa',x:73,y:18,img:'casetta-3.jpeg'},
 {name:'Bibliocabina San Piero a Grado',address:'Circolo ACLI, San Piero a Grado, Pisa',x:12,y:53,img:'casetta-4.jpeg'},
 {name:'Agenzia Immobiliare San Giorgio',address:'Marina di Pisa',x:10,y:70,img:'casetta-5.jpeg'},
 {name:'Bagno Gabbiano',address:'Bagno Gabbiano, Marina di Pisa',x:11,y:72,img:'casetta-6.jpeg'},
 {name:'Pappiana',address:'Via Montessori, Pappiana, Pisa',x:57,y:40,img:'casetta1.jpeg'},
 {name:'Metato',address:'Piazza Berlinguer, Metato, Pisa',x:49,y:14,img:'casetta-8.jpeg'},
 {name:'Mezzana',address:'Via Traversagna, Mezzana, Pisa',x:61,y:36,img:'casetta.jpeg'},

];
function mapsUrl(address){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)}
function selectLoc(i){
 const loc=locations[i];if(!loc||!mapEl||!listEl)return;
 document.querySelectorAll('.pin,.loc').forEach(el=>el.classList.remove('active'));
 document.querySelectorAll(`[data-loc="${i}"]`).forEach(el=>el.classList.add('active'));
 if(selectedLocation){selectedLocation.innerHTML=`<strong>${loc.name}</strong><br><span>${loc.address}</span><br><a class="btn btn-blue" style="margin-top:12px;padding:10px 14px" target="_blank" rel="noopener" href="${mapsUrl(loc.address)}">Apri indicazioni</a>`}
}
if(mapEl&&listEl){
 const legend=document.createElement('div');legend.className='map-legend';legend.innerHTML='<span>📍</span> Casette Progetto Libri Liberi';mapEl.appendChild(legend);
 locations.forEach((loc,i)=>{
  const pin=document.createElement('button');pin.className='pin';pin.type='button';pin.style.left=loc.x+'%';pin.style.top=loc.y+'%';pin.dataset.loc=i;pin.title=loc.name;pin.innerHTML='<img src="assets/img/logo.png" alt="Casetta Progetto Libri Liberi">';pin.addEventListener('click',()=>selectLoc(i));mapEl.appendChild(pin);
  const card=document.createElement('div');card.className='loc';card.dataset.loc=i;card.innerHTML=`<div><strong>${loc.name}</strong><small>${loc.address}</small></div><div class="loc-actions"><button type="button">Vedi</button><a target="_blank" rel="noopener" href="${mapsUrl(loc.address)}">Indicazioni</a></div>`;card.querySelector('button').addEventListener('click',()=>selectLoc(i));listEl.appendChild(card);
 });
 selectLoc(0);
 if(mapSearch){mapSearch.addEventListener('input',()=>{const q=mapSearch.value.toLowerCase().trim();locations.forEach((loc,i)=>{const show=(loc.name+' '+loc.address).toLowerCase().includes(q);document.querySelectorAll(`[data-loc="${i}"]`).forEach(el=>el.classList.toggle('hidden',!show))})})}
}

// Invio dei moduli tramite Vercel Function + Brevo.
document.querySelectorAll('form[data-contact-form]').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-status');
    const originalText = button?.dataset.originalText || button?.textContent || 'Invia';

    if (!form.reportValidity()) return;
    if (button) {
      button.disabled = true;
      button.textContent = 'Invio in corso…';
    }
    if (status) {
      status.className = 'form-status is-loading';
      status.textContent = 'Stiamo inviando la tua richiesta…';
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'Invio non riuscito.');
      if (status) {
        status.className = 'form-status is-success';
        status.textContent = result.message || 'Grazie! La tua richiesta è stata inviata.';
      }
      form.reset();
    } catch (error) {
      if (status) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Si è verificato un errore. Riprova tra poco.';
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
});
