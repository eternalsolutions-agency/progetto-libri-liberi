/* Progetto Libri Liberi — sistema icone SVG globale */
(function(){
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/icons.css';css.dataset.pllIcons='1';
  if(!document.querySelector('link[data-pll-icons]')) document.head.appendChild(css);

  const icons={
    '👤':'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/></svg>',
    '📍':'<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    '📚':'<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z"/></svg>',
    '📖':'<svg viewBox="0 0 24 24"><path d="M3 5c3.8-1 6.8-.4 9 2v13c-2.2-2.4-5.2-3-9-2V5Z"/><path d="M21 5c-3.8-1-6.8-.4-9 2v13c2.2-2.4 5.2-3 9-2V5Z"/></svg>',
    '🏡':'<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-6h6v6"/></svg>',
    '🤝':'<svg viewBox="0 0 24 24"><path d="m8 12 3-3c1-1 2.4-1 3.4 0l1.6 1.6"/><path d="m3 9 4-4 4 3M21 9l-4-4-3 3M7 13l5 5c1 1 2.3 1 3.2.1L20 13M4 12l3 3"/></svg>',
    '❤️':'<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    '📰':'<svg viewBox="0 0 24 24"><path d="M4 3h14v18H4z"/><path d="M18 7h2a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2h-1M7 7h8M7 11h8M7 15h4"/></svg>',
    '📅':'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/></svg>',
    '🎓':'<svg viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c3 3 9 3 12 0v-4.5M22 9v6"/></svg>',
    '📱':'<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/></svg>',
    '💳':'<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 9h20M6 15h4"/></svg>',
    '🖼️':'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 16-5-5L5 21"/></svg>',
    '📷':'<svg viewBox="0 0 24 24"><path d="M4 7h4l2-3h4l2 3h4v13H4V7Z"/><circle cx="12" cy="13" r="4"/></svg>',
    '✉️':'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    '📧':'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    '☎️':'<svg viewBox="0 0 24 24"><path d="M6.6 2.8 10 7l-2 2.4c1.4 3 3.7 5.3 6.7 6.7l2.3-2 4.2 3.4c.3.3.4.8.2 1.2-.8 1.8-2.4 2.8-4.3 2.5C9.7 20.1 3.9 14.3 2.8 6.9c-.3-1.9.7-3.5 2.5-4.3.4-.2.9-.1 1.3.2Z"/></svg>',
    '💬':'<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.5-4A8 8 0 1 1 21 12Z"/></svg>',
    '⭐':'<svg viewBox="0 0 24 24"><path d="m12 2.5 3 6 6.5 1-4.7 4.6 1.1 6.4-5.9-3.1-5.9 3.1 1.1-6.4-4.7-4.6 6.5-1 3-6Z"/></svg>',
    '🎁':'<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M2 9h20V5H2v4ZM12 5c-1-4-6-4-6-1 0 2 3 1 6 1Zm0 0c1-4 6-4 6-1 0 2-3 1-6 1Z"/></svg>',
    '🌱':'<svg viewBox="0 0 24 24"><path d="M12 21v-9M12 13C7 13 4 10 4 5c5 0 8 3 8 8ZM12 16c5 0 8-3 8-8-5 0-8 3-8 8Z"/></svg>',
    '🌍':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z"/></svg>',
    '🔒':'<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
    '⚙️':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.1-2.1-1.9.9-1.7-.7L10.5 2h-3l-.7 2.3-1.7.7-1.9-.9-2.1 2.1.9 1.9-.7 1.7-2.3.7v3l2.3.7.7 1.7-.9 1.9 2.1 2.1 1.9-.9 1.7.7.7 2.3h3l.7-2.3 1.7-.7 1.9.9 2.1-2.1-.9-1.9.7-1.7 2.3-.7Z" transform="translate(2.5 0) scale(.8)"/></svg>'
  };

  function iconSpan(svg){return '<span class="ui-icon small pll-inline-icon" aria-hidden="true">'+svg+'</span>';}
  function upgrade(root){
    const walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parent=node.parentElement;if(!parent||parent.closest('script,style,svg,textarea,input,select,option'))return;
      let text=node.nodeValue,hit=false;
      Object.keys(icons).forEach(key=>{if(text.includes(key)){text=text.split(key).join(iconSpan(icons[key]));hit=true;}});
      if(hit){const wrap=document.createElement('span');wrap.className='pll-iconified';wrap.innerHTML=text;node.replaceWith(...wrap.childNodes);}
    });
  }
  function run(){upgrade(document.body);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)upgrade(n)}))).observe(document.documentElement,{childList:true,subtree:true});
})();
