/* E.V. app actions — safe browser/app launcher, isolated from core brain. */
(function(){
  'use strict';
  const form=document.getElementById('composer'), input=document.getElementById('input');
  if(!form||!input) return;
  const say=t=>{try{if(typeof addRow==='function')addRow('ev',t);if(typeof speak==='function')speak(t)}catch(_) {}};
  const apps={
    youtube:{label:'YouTube',url:'https://www.youtube.com/'},
    spotify:{label:'Spotify',url:'https://open.spotify.com/'},
    google:{label:'Google',url:'https://www.google.com/'},
    maps:{label:'Google Maps',url:'https://www.google.com/maps/'},
    github:{label:'GitHub',url:'https://github.com/'},
    gmail:{label:'Gmail',url:'https://mail.google.com/'},
    messages:{label:'Messages',url:'sms:'},
    phone:{label:'Phone',url:'tel:'}
  };
  function showLink(app){
    const item=apps[app]; if(!item)return false;
    let opened=false;
    try{opened=!!window.open(item.url,'_blank','noopener,noreferrer')}catch(_){}
    if(opened)return true;
    const row=typeof addRow==='function'?addRow('ev',''):null;
    if(row&&row.appendChild){
      const a=document.createElement('a');
      a.href=item.url; a.target='_blank'; a.rel='noopener noreferrer';
      a.textContent=`Tap here to open ${item.label}`;
      a.style.cssText='display:block;margin:8px 0;padding:10px 14px;border-radius:12px;background:#10231a;color:#c3ffe3;border:1px solid rgba(57,233,145,.35);text-decoration:none;width:max-content';
      row.appendChild(a);
    }
    return true;
  }
  function command(text){
    const q=String(text||'').trim().replace(/^e\.?v\.?[,:\s-]*/i,'').trim().toLowerCase();
    const m=q.match(/^(?:open|launch|start|go to)\s+(youtube|spotify|google maps|maps|google|github|gmail|messages|phone)$/i);
    if(!m)return false;
    const key=m[1]==='google maps'||m[1]==='maps'?'maps':m[1];
    const item=apps[key];
    say(`Opening ${item.label}.`);
    showLink(key);
    return true;
  }
  form.addEventListener('submit',e=>{
    const text=input.value.trim();
    if(!/^(?:e\.?v\.?[,:\s-]+)?(?:open|launch|start|go to)\s+(?:youtube|spotify|google maps|maps|google|github|gmail|messages|phone)$/i.test(text))return;
    e.preventDefault();e.stopImmediatePropagation();input.value='';input.style.height='auto';
    try{command(text)}catch(_){say('I could not open that app from Safari. I left an open link for you instead.');}
  },true);
  window.EVAppActions={open:showLink,command};
})();
