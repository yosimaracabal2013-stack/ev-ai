/* E.V. command actions v2 — additive, no secrets. */
(function(){
  'use strict';
  if(window.__EV_ACTIONS_V2__) return;
  window.__EV_ACTIONS_V2__=true;

  const $=s=>document.querySelector(s);
  const input=$('#commandInput'), send=$('#send'), feed=$('#feed'), layer=$('#windowLayer');
  if(!input||!send||!feed||!layer) return;

  const say=(text,user=false)=>{
    if(typeof window.add==='function') window.add(text,user);
    else { const d=document.createElement('div'); d.className='msg'+(user?' user':''); d.textContent=text; feed.appendChild(d); }
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n))}

  function makeWindow(title,html){
    const w=document.createElement('section');
    w.className='floatWindow ev-action-window';
    w.style.zIndex=999;
    const width=Math.min(innerWidth-18,390), height=Math.min(innerHeight*.66,560);
    w.style.width=width+'px';
    w.style.maxHeight=height+'px';
    w.style.left=clamp((innerWidth-width)/2,9,Math.max(9,innerWidth-width-9))+'px';
    w.style.top=clamp(innerHeight*.16,70,Math.max(70,innerHeight-height-12))+'px';
    w.innerHTML='<div class="winHead"><div class="winTitle">E.V. // '+esc(title)+'</div><button class="winClose" type="button">×</button></div><div class="winBody">'+html+'</div>';
    layer.appendChild(w);

    const head=w.querySelector('.winHead'); let drag=false,sx=0,sy=0,ox=0,oy=0;
    const p=e=>e.touches?e.touches[0]:e;
    const down=e=>{const q=p(e);drag=true;sx=q.clientX;sy=q.clientY;ox=w.offsetLeft;oy=w.offsetTop;w.style.zIndex=++makeWindow.z;e.preventDefault()};
    const move=e=>{if(!drag)return;const q=p(e);w.style.left=clamp(ox+q.clientX-sx,4,innerWidth-w.offsetWidth-4)+'px';w.style.top=clamp(oy+q.clientY-sy,52,innerHeight-w.offsetHeight-4)+'px';e.preventDefault()};
    const up=()=>drag=false;
    head.addEventListener('pointerdown',down); head.addEventListener('pointermove',move); head.addEventListener('pointerup',up); head.addEventListener('pointercancel',up);
    head.addEventListener('touchstart',down,{passive:false}); head.addEventListener('touchmove',move,{passive:false}); head.addEventListener('touchend',up);
    w.querySelector('.winClose').onclick=()=>{w.classList.add('closing');setTimeout(()=>w.remove(),230)};
    w.addEventListener('pointerdown',()=>w.style.zIndex=++makeWindow.z);
    return w;
  }
  makeWindow.z=1000;

  function spotify(query){
    const q=String(query||'').trim();
    const web='https://open.spotify.com/search/'+encodeURIComponent(q||'');
    const deep='spotify:search:'+encodeURIComponent(q||'');
    const title=q?'SPOTIFY · '+q:'SPOTIFY';
    const h='<h4>'+esc(title)+'</h4><p>Spotify can be opened without leaving E.V. Use the button below. If the Spotify app is installed, iPhone may hand the search to it.</p><button class="winAction" id="evSpotifyOpen">OPEN IN SPOTIFY APP</button><a class="evcc-link" href="'+web+'" target="_blank" rel="noopener">OPEN SPOTIFY WEB SEARCH ↗</a><p class="mini">Direct automatic playback requires Spotify authorization; E.V. will not pretend a song is playing unless Spotify actually confirms it.</p>';
    const w=makeWindow(title,h);
    w.querySelector('#evSpotifyOpen').onclick=()=>{location.href=deep;setTimeout(()=>{try{location.href=web}catch(_){}} ,900)};
    return w;
  }

  function visual(query){
    const q=String(query||'Spider-Man').trim()||'Spider-Man';
    const google='https://www.google.com/search?q='+encodeURIComponent(q);
    const yt='https://www.youtube.com/results?search_query='+encodeURIComponent(q);
    const wiki='https://en.wikipedia.org/wiki/'+encodeURIComponent(q.replace(/\s+/g,'_'));
    const h='<h4>'+esc(q)+'</h4><div class="evcc-grid"><div class="evcc-card"><b>WEB</b>Quick search for information, images and references.</div><div class="evcc-card"><b>VIDEO</b>Find related videos without replacing E.V.’s main screen.</div></div><a class="evcc-link" href="'+google+'" target="_blank" rel="noopener">SEARCH WEB ↗</a><a class="evcc-link" href="'+yt+'" target="_blank" rel="noopener">SEARCH YOUTUBE ↗</a><a class="evcc-link" href="'+wiki+'" target="_blank" rel="noopener">OPEN WIKIPEDIA ↗</a><p class="mini">The panel stays on top of E.V. and can be dragged around. External sites may block being embedded directly, so E.V. uses a small action window instead of pretending an unavailable page is embedded.</p>';
    return makeWindow('VISUAL · '+q,h);
  }

  function actionFor(text){
    const s=text.trim(); const l=s.toLowerCase();
    if(/^(open|launch|start)\s+spotify\b/.test(l)) return spotify('');
    const pm=l.match(/^(?:play|open|find|search)\s+(?:this\s+)?(?:song|music|track)?\s*(?:on\s+spotify\s*)?(.*)$/i);
    if(pm && /spotify|play|song|music|track/.test(l) && pm[1].trim()) return spotify(pm[1].trim());
    if(/\bspotify\b/.test(l) && /\b(play|open|find|search)\b/.test(l)) return spotify(s.replace(/.*?spotify\s*/i,'').trim());
    if(/\b(spider-man|spiderman)\b/.test(l) && /\b(show|open|pull up|bring up|what do you have|tell me|search|find|look up)\b/.test(l)) return visual(s.replace(/.*?(spider-?man)/i,'$1').trim());
    if(/^(show|open|pull up|bring up|search|find|look up)\b/.test(l)) return visual(s.replace(/^(show|open|pull up|bring up|search|find|look up)\s*/i,'').replace(/^(information|info|stuff|things)\s+(on|about)\s+/i,'').trim());
    return null;
  }

  function handle(e){
    if(e.type==='keydown' && e.key!=='Enter') return;
    const text=input.value.trim(); if(!text) return;
    const panel=actionFor(text); if(!panel) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    say(text,true); input.value='';
    if(typeof window.coreLabel!=='undefined' && window.coreLabel) window.coreLabel.textContent='EXECUTING';
    say(text.toLowerCase().includes('spotify')?'Opening Spotify…':'Bringing that up in a window…');
    setTimeout(()=>{if(typeof window.coreLabel!=='undefined' && window.coreLabel)window.coreLabel.textContent='STANDING BY'},700);
  }
  input.addEventListener('keydown',handle,true);
  send.addEventListener('click',handle,true);

  // Add a tiny, unobtrusive resize grip to every action window.
  const css=document.createElement('style'); css.textContent=`
    .ev-action-window{min-width:220px;min-height:160px;resize:both;overflow:hidden}
    .ev-action-window .winBody{height:calc(100% - 38px)}
    .ev-action-window .winAction,.ev-action-window .evcc-link{display:block;width:100%;box-sizing:border-box;text-align:center;margin-top:8px;text-decoration:none;cursor:pointer}
    .ev-action-window .evcc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .ev-action-window .evcc-card{border:1px solid #0d3041;border-radius:6px;padding:10px;background:rgba(4,20,28,.7);font-size:10px;line-height:1.5}
    .ev-action-window .evcc-card b{display:block;color:#36d8ff;font-size:9px;letter-spacing:1.5px;margin-bottom:5px}
    .ev-action-window .mini{font-size:8px;color:#628391;line-height:1.55}
    @media(max-width:700px){.ev-action-window{width:calc(100vw - 18px)!important;max-width:calc(100vw - 18px)!important;resize:both}.ev-action-window .evcc-grid{grid-template-columns:1fr}}
  `; document.head.appendChild(css);
})();
