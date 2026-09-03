/* E.V. COMMAND COMPANION
   Additive UI/behavior layer. Keeps the existing command dashboard intact.
*/
(function(){
  'use strict';
  if(window.__EV_COMMAND_COMPANION__) return;
  window.__EV_COMMAND_COMPANION__=true;

  const PREF='ev-command-companion-v1';
  const PERM='ev-command-permissions-v1';
  const read=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(_){return d}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const prefs=Object.assign({proactive:true,speech:true},read(PREF,{}));
  const perms=Object.assign({accounts:false,web:false,media:false,reminders:false},read(PERM,{}));
  let speechUnlocked=false,z=300,lastActivity=Date.now();

  const css=document.createElement('style');
  css.textContent=`
  #evcc-bar{position:fixed;right:9px;top:calc(env(safe-area-inset-top) + 62px);z-index:220;display:flex;gap:6px}
  .evcc-btn{height:33px;padding:0 9px;border:1px solid #164b60;border-radius:7px;background:rgba(3,12,19,.94);color:#36d8ff;font:9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.4px}
  .evcc-btn.on{color:#52e6a0;border-color:#52e6a0}
  #evcc-toast{position:fixed;left:50%;bottom:88px;z-index:260;transform:translate(-50%,12px);opacity:0;pointer-events:none;background:rgba(3,12,19,.98);border:1px solid #164b60;color:#d8eef4;border-radius:8px;padding:9px 12px;font:10px ui-monospace,SFMono-Regular,Menlo,monospace;transition:.25s ease;max-width:calc(100vw - 26px);text-align:center}
  #evcc-toast.show{opacity:1;transform:translate(-50%,0)}
  .evcc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .evcc-card{border:1px solid #0d3041;border-radius:6px;padding:10px;background:rgba(4,20,28,.7);color:#d8eef4;font-size:10px;line-height:1.5}
  .evcc-card b{display:block;color:#36d8ff;font-size:9px;letter-spacing:1.5px;margin-bottom:5px}
  .evcc-action{width:100%;border:1px solid #19536a;background:#04131c;color:#36d8ff;border-radius:5px;padding:9px;font:9px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1px}
  .evcc-check{display:flex;justify-content:space-between;align-items:center;border:1px solid #0d3041;border-radius:6px;padding:9px;margin:7px 0;background:rgba(4,20,28,.65);font-size:10px}
  .evcc-link{display:block;color:#d8eef4;text-decoration:none;border:1px solid #0d3041;border-radius:6px;padding:9px;margin:7px 0;background:rgba(4,20,28,.65);font-size:10px}
  .evcc-note{font-size:9px;color:#628391;line-height:1.55}
  @media(max-width:700px){#evcc-bar{top:calc(env(safe-area-inset-top) + 58px);right:7px}.evcc-btn{height:31px;padding:0 8px}.evcc-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  function toast(t){let x=document.getElementById('evcc-toast');if(!x){x=document.createElement('div');x.id='evcc-toast';document.body.appendChild(x)}x.textContent=t;x.classList.add('show');clearTimeout(x._t);x._t=setTimeout(()=>x.classList.remove('show'),2500)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function memory(){return read('ev-core-memory-v1',{facts:[],preferences:[],projects:[],tasks:[]})}
  function archive(){return read('ev-conversation-archive-v1',[])}
  function agenda(){for(const k of ['ev-agenda-v1','ev-agenda','ev-advanced-agenda-v1','ev-advanced-reminders-v1']){const v=read(k,null);if(v)return v}return []}

  function win(title,body,x,y){
    const w=document.createElement('section');w.className='floatWindow';w.style.zIndex=++z;
    w.style.left=Math.max(8,Math.min(innerWidth-408,x??innerWidth/2-195))+'px';
    w.style.top=Math.max(82,Math.min(innerHeight-260,y??innerHeight*.17))+'px';
    w.innerHTML='<div class="winHead"><div class="winTitle">E.V. // '+esc(title)+'</div><button class="winClose">×</button></div><div class="winBody">'+body+'</div>';
    const h=w.querySelector('.winHead');let drag=false,sx=0,sy=0,ox=0,oy=0;
    const point=e=>e.touches?e.touches[0]:e;
    const down=e=>{const p=point(e);drag=true;sx=p.clientX;sy=p.clientY;ox=parseFloat(w.style.left);oy=parseFloat(w.style.top);w.style.zIndex=++z;e.preventDefault()};
    const move=e=>{if(!drag)return;const p=point(e);w.style.left=Math.max(4,Math.min(innerWidth-w.offsetWidth-4,ox+p.clientX-sx))+'px';w.style.top=Math.max(50,Math.min(innerHeight-w.offsetHeight-6,oy+p.clientY-sy))+'px';e.preventDefault()};
    const up=()=>drag=false;
    h.addEventListener('pointerdown',down);h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
    h.addEventListener('touchstart',down,{passive:false});h.addEventListener('touchmove',move,{passive:false});h.addEventListener('touchend',up);
    w.querySelector('.winClose').onclick=()=>{w.classList.add('closing');setTimeout(()=>w.remove(),220)};
    w.onpointerdown=()=>w.style.zIndex=++z;
    (document.getElementById('windowLayer')||document.body).appendChild(w);
    return w;
  }

  function memoryWin(){
    const m=memory();let h='<h4>LONG-TERM MEMORY</h4><p class="evcc-note">Local, user-controlled memory. E.V. does not invent entries.</p>';
    for(const k of ['facts','preferences','projects','tasks']){const a=Array.isArray(m[k])?m[k]:[];h+='<div class="evcc-card"><b>'+k.toUpperCase()+'</b>'+(a.length?'<ul>'+a.slice(-30).map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'<span class="evcc-note">No saved items.</span>')+'</div>'}win('MEMORY',h)
  }
  function historyWin(){const a=archive().slice().reverse();let h='<h4>CONVERSATION HISTORY</h4><p class="evcc-note">Past conversations saved by this browser.</p>';if(!a.length)h+='<p>No archived conversations found.</p>';for(const s of a.slice(0,20)){h+='<div class="evcc-card"><b>'+esc(s.title||'PAST CHAT')+'</b>';for(const m of (s.messages||[]).slice(-8))h+='<p><strong>'+esc(m.role||'')+':</strong> '+esc(m.content||'')+'</p>';h+='</div>'}win('CHAT HISTORY',h)}
  function agendaWin(){const a=agenda();const list=Array.isArray(a)?a:(a?.items||a?.tasks||a?.reminders||[]);let h='<h4>AGENDA</h4><p class="evcc-note">Saved agenda/reminder data, when present.</p>';h+=list.length?'<ul>'+list.map(v=>'<li>'+esc(typeof v==='string'?v:(v.title||v.text||JSON.stringify(v)))+'</li>').join('')+'</ul>':'<p>No agenda items found.</p>';win('AGENDA',h)}
  function searchWin(q){const u='https://www.google.com/search?q='+encodeURIComponent(q);win('WEB SEARCH','<h4>'+esc(q)+'</h4><a class="evcc-link" href="'+u+'" target="_blank" rel="noopener">OPEN GOOGLE SEARCH ↗</a><p class="evcc-note">Search sites often block iframe embedding, so the official result page opens in a new tab.</p>')}
  function youtubeWin(q){const u='https://www.youtube.com/results?search_query='+encodeURIComponent(q);win('YOUTUBE','<h4>'+esc(q)+'</h4><a class="evcc-link" href="'+u+'" target="_blank" rel="noopener">OPEN YOUTUBE RESULTS ↗</a>')}
  function spotifyWin(q){const u='https://open.spotify.com/search/'+encodeURIComponent(q);win('SPOTIFY','<h4>'+esc(q)+'</h4><a class="evcc-link" href="'+u+'" target="_blank" rel="noopener">OPEN SPOTIFY ↗</a>')}

  function connectionsWin(){
    const h='<h4>CONNECTIONS & PERMISSIONS</h4><p>Protected account actions stay behind an explicit permission gate. E.V. never needs your password.</p>'+['accounts|Account actions','web|Web access','media|YouTube / Spotify','reminders|Reminders'].map(v=>{const [k,l]=v.split('|');return '<label class="evcc-check"><span>'+l+'</span><input type="checkbox" data-perm="'+k+'" '+(perms[k]?'checked':'')+'></label>'}).join('')+'<button class="evcc-action" id="evcc-save">SAVE PERMISSIONS</button><a class="evcc-link" href="https://accounts.google.com/" target="_blank" rel="noopener">GOOGLE ACCOUNT ↗</a><a class="evcc-link" href="https://accounts.spotify.com/" target="_blank" rel="noopener">SPOTIFY ACCOUNT ↗</a><p class="evcc-note">Actual API connections require each provider’s OAuth client configuration. This layer never collects passwords.</p>';
    const w=win('CONNECTIONS',h);w.querySelector('#evcc-save').onclick=()=>{w.querySelectorAll('[data-perm]').forEach(i=>perms[i.dataset.perm]=i.checked);write(PERM,perms);toast('Permissions saved. Protected actions still require explicit approval.');}
  }
  function toolsWin(){
    const h='<h4>E.V. TOOLS</h4><div class="evcc-grid">'+
      '<button class="evcc-action" data-x="memory">MEMORY</button><button class="evcc-action" data-x="history">CHAT HISTORY</button><button class="evcc-action" data-x="agenda">AGENDA</button><button class="evcc-action" data-x="connections">CONNECTIONS</button><button class="evcc-action" data-x="search">WEB SEARCH</button><button class="evcc-action" data-x="youtube">YOUTUBE</button><button class="evcc-action" data-x="spotify">SPOTIFY</button><button class="evcc-action" data-x="proactive">PROACTIVE</button></div><p class="evcc-note">Windows slide in and can be dragged. External/account actions stay permission-gated.</p>';
    const w=win('TOOLS',h);w.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{const x=b.dataset.x;if(x==='memory')memoryWin();if(x==='history')historyWin();if(x==='agenda')agendaWin();if(x==='connections')connectionsWin();if(x==='search'){const q=prompt('Search for:');if(q)searchWin(q)}if(x==='youtube'){const q=prompt('YouTube search:');if(q)youtubeWin(q)}if(x==='spotify'){const q=prompt('Spotify search:');if(q)spotifyWin(q)}if(x==='proactive'){prefs.proactive=!prefs.proactive;write(PREF,prefs);document.getElementById('evcc-proactive').classList.toggle('on',prefs.proactive);toast(prefs.proactive?'Proactive mode ON':'Proactive mode OFF')}})
  }

  const bar=document.createElement('div');bar.id='evcc-bar';bar.innerHTML='<button class="evcc-btn" id="evcc-tools">TOOLS</button><button class="evcc-btn '+(prefs.proactive?'on':'')+'" id="evcc-proactive">PROACTIVE</button>';document.body.appendChild(bar);
  document.getElementById('evcc-tools').onclick=toolsWin;
  document.getElementById('evcc-proactive').onclick=()=>{prefs.proactive=!prefs.proactive;write(PREF,prefs);document.getElementById('evcc-proactive').classList.toggle('on',prefs.proactive);toast(prefs.proactive?'Proactive mode ON':'Proactive mode OFF');if(prefs.proactive)proactive('I’m here if you need me.')};

  ['pointerdown','touchstart','keydown'].forEach(e=>document.addEventListener(e,()=>{speechUnlocked=true;lastActivity=Date.now()},{once:true,passive:true}));
  ['pointerdown','touchstart','keydown'].forEach(e=>document.addEventListener(e,()=>lastActivity=Date.now(),{passive:true}));
  function speak(t){if(!prefs.speech||!speechUnlocked||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(t));u.rate=.98;u.pitch=1.02;speechSynthesis.speak(u)}catch(_) {}}
  function proactive(t){if(!prefs.proactive)return;const f=document.getElementById('feed');if(f){const d=document.createElement('div');d.className='msg';d.textContent=t;f.appendChild(d);while(f.children.length>5)f.firstElementChild.remove()}speak(t)}
  setTimeout(()=>proactive('E.V. is online. I’m here if you need anything.'),2300);
  setInterval(()=>{if(prefs.proactive&&Date.now()-lastActivity>15*60*1000){lastActivity=Date.now();proactive('Just checking in — I’m still here if you need anything.')}},30000);

  // Natural-language window commands. Normal chat continues to the existing engine.
  const input=document.getElementById('commandInput');
  if(input)input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const v=input.value.trim(),s=v.toLowerCase();if(/^(show|open|pull up).*(memory|memories)/.test(s))memoryWin();else if(/^(show|open|pull up).*(agenda|schedule|reminder)/.test(s))agendaWin();else if(/^(show|open|pull up).*(history|old chat|conversation)/.test(s))historyWin();else if(/^(search|google|look up)\b/.test(s))searchWin(v.replace(/^(search|google|look up)\s*/i,''));else if(/^(show|open|search).*(youtube|video)/.test(s))youtubeWin(v.replace(/.*?(youtube|video)/i,'').replace(/^\s*(for|about|of)\s*/i,'')||'E.V. AI assistant');else if(/^(show|open|search).*(spotify|song|playlist|music)/.test(s))spotifyWin(v.replace(/.*?(spotify|song|playlist|music)/i,'').replace(/^\s*(for|about|of)\s*/i,'')||'music');else if(/^(connect|sign in|permissions?)/.test(s))connectionsWin()});

  // If the engine is reachable, add a small behavior policy without replacing its existing brain.
  function patchEngine(){const frame=document.getElementById('engine');if(!frame)return;let d;try{d=frame.contentDocument}catch(_){return}if(!d||d.defaultView.__EVCC_POLICY__)return;try{const w=d.defaultView;w.__EVCC_POLICY__=true;const of=w.fetch.bind(w);w.fetch=async function(req,opts){try{const url=typeof req==='string'?req:(req&&req.url)||'';if(url.includes('api.groq.com/openai/v1/chat/completions')&&opts?.body){const b=JSON.parse(opts.body);if(Array.isArray(b.messages)&&b.messages[0]?.role==='system'){b.messages[0].content=String(b.messages[0].content||'')+'\\n\\nE.V. interaction policy: be warm, clear, context-aware, and honest about capabilities. Use available local memory/history when relevant. Ask for explicit permission immediately before protected account actions or other consequential external side effects. Never ask for or store passwords. Do not claim an action completed unless it actually completed. If the user is worried or distressed, respond supportively and encourage trusted human help when appropriate.';opts={...opts,body:JSON.stringify(b)}}}}catch(_){}return of(req,opts)}}catch(_) {}}
  const frame=document.getElementById('engine');if(frame)frame.addEventListener('load',patchEngine);setTimeout(patchEngine,1200);
})();
