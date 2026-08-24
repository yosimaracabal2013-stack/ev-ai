/* E.V. app actions + holographic visual memory. */
(function(){
  'use strict';
  const form=document.getElementById('composer'), input=document.getElementById('input');
  if(!form||!input) return;
  const say=t=>{try{if(typeof addRow==='function')addRow('ev',t);if(typeof speak==='function')speak(t)}catch(_) {}};
  const apps={youtube:{label:'YouTube',url:'https://www.youtube.com/'},spotify:{label:'Spotify',url:'https://open.spotify.com/'},google:{label:'Google',url:'https://www.google.com/'},maps:{label:'Google Maps',url:'https://www.google.com/maps/'},github:{label:'GitHub',url:'https://github.com/'},gmail:{label:'Gmail',url:'https://mail.google.com/'},messages:{label:'Messages',url:'sms:'},phone:{label:'Phone',url:'tel:'}};
  const MEMKEY='ev-visual-memory-v2';
  const mem=()=>{try{return JSON.parse(localStorage.getItem(MEMKEY)||'{}')}catch(_){return {}}};
  const put=m=>{try{localStorage.setItem(MEMKEY,JSON.stringify(m))}catch(_) {}};
  function showLink(app){const item=apps[app];if(!item)return false;let opened=false;try{opened=!!window.open(item.url,'_blank','noopener,noreferrer')}catch(_){}if(opened)return true;const row=typeof addRow==='function'?addRow('ev',''):null;if(row&&row.appendChild){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`Tap here to open ${item.label}`;a.style.cssText='display:block;margin:8px 0;padding:10px 14px;border-radius:12px;background:#10231a;color:#c3ffe3;border:1px solid rgba(57,233,145,.35);text-decoration:none;width:max-content';row.appendChild(a)}return true}

  function ensureStyle(){
    if(document.getElementById('ev-visual-holo-style'))return;
    const s=document.createElement('style');s.id='ev-visual-holo-style';
    s.textContent=`
#evVisual{position:fixed;inset:0;z-index:9999;display:none;overflow:hidden;background:radial-gradient(circle at 50% 45%,rgba(65,255,214,.13),transparent 38%),rgba(2,7,6,.60);backdrop-filter:blur(5px);color:#e5fff7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
#evVisual.open{display:block}
#evVisual:before{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(158,232,197,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(158,232,197,.035) 1px,transparent 1px);background-size:34px 34px}
#evVisual .vh{position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 20px 12px;border-bottom:1px solid rgba(158,232,197,.16)}
#evVisual .vt{letter-spacing:3px;font-size:11px;color:#bfffe8;text-transform:uppercase;text-shadow:0 0 12px rgba(80,255,220,.55)}
#evVisual .vc,#evVisual .save{border:1px solid rgba(158,232,197,.35);background:rgba(5,20,15,.28);color:#c3ffe3;border-radius:8px;padding:8px 12px;font:inherit;font-size:9px;letter-spacing:1px;cursor:pointer}
#evVisual .search{position:relative;z-index:20;display:flex;gap:8px;padding:12px 20px 4px}
#evVisual .search input{flex:1;min-width:0;background:rgba(3,15,11,.35);color:#edf8f2;border:1px solid rgba(158,232,197,.22);border-radius:9px;padding:10px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace}
#evVisual .search button{background:transparent;color:#9ee8c5;border:1px solid rgba(158,232,197,.3);border-radius:9px;padding:0 13px;font:9px ui-monospace;letter-spacing:1px}
#evVisual .feed{position:relative;height:calc(100% - 101px);min-height:350px;overflow:hidden;perspective:1200px;background:radial-gradient(ellipse at 50% 52%,rgba(53,255,210,.11),transparent 55%)}
#evVisual .feed:before,#evVisual .feed:after{content:'';position:absolute;left:8%;right:8%;top:25%;bottom:18%;border:1px solid rgba(80,255,220,.12);border-radius:50%;transform:rotateX(68deg);pointer-events:none;box-shadow:0 0 45px rgba(50,255,210,.06)}
#evVisual .feed:after{left:20%;right:20%;top:33%;bottom:27%;border-color:rgba(180,255,240,.08);transform:rotateX(68deg) rotateZ(10deg)}
#evVisual .hud{position:absolute;z-index:15;left:20px;right:20px;top:14px;display:flex;justify-content:space-between;color:#8fddbd;font-size:8px;letter-spacing:2px;text-transform:uppercase;pointer-events:none}
#evVisual .pulse{animation:evVisualPulse 1.8s infinite ease-in-out}
#evVisual .rail{height:100%;display:flex;align-items:center;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:50px 17vw 72px;-webkit-overflow-scrolling:touch;touch-action:pan-x}
#evVisual .rail::-webkit-scrollbar{display:none}
#evVisual .card{position:relative;flex:0 0 66vw;max-width:430px;height:min(56vh,410px);min-height:260px;scroll-snap-align:center;border:1px solid rgba(112,255,226,.38);border-radius:18px;background:transparent;overflow:visible;transform:scale(.78) rotateY(15deg);opacity:.20;filter:saturate(.7) brightness(.7);transition:transform .35s ease,opacity .35s ease,filter .35s ease,box-shadow .35s ease;box-shadow:0 0 35px rgba(50,255,210,.04)}
#evVisual .card.active{transform:scale(1) rotateY(0);opacity:1;filter:none;z-index:4;box-shadow:0 0 25px rgba(70,255,220,.35),0 0 95px rgba(50,255,210,.14),inset 0 0 35px rgba(60,255,220,.05);background:rgba(30,110,90,.025);animation:evVisualFloat 4s ease-in-out infinite}
#evVisual .card.prev{transform:scale(.82) rotateY(16deg) translateX(8px);opacity:.25}
#evVisual .card.next{transform:scale(.82) rotateY(-16deg) translateX(-8px);opacity:.25}
#evVisual .card img{position:relative;z-index:1;width:100%;height:100%;object-fit:cover;border-radius:16px;display:block;background:transparent;opacity:.42;mix-blend-mode:screen;filter:grayscale(1) sepia(.2) hue-rotate(115deg) saturate(5) brightness(1.35) contrast(1.18);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.4) 5%,rgba(0,0,0,.94) 20%,rgba(0,0,0,.88) 80%,rgba(0,0,0,.22) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.4) 5%,rgba(0,0,0,.94) 20%,rgba(0,0,0,.88) 80%,rgba(0,0,0,.22) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);mask-composite:intersect}
#evVisual .card.active img{opacity:.48}
#evVisual .card:before{content:'';position:absolute;z-index:5;inset:-8px;border:1px solid rgba(126,255,231,.70);border-radius:20px;pointer-events:none;box-shadow:0 0 9px rgba(73,255,219,.65),0 0 28px rgba(73,255,219,.30),0 0 70px rgba(73,255,219,.10),inset 0 0 24px rgba(73,255,219,.08);animation:evVisualEdge 2.2s ease-in-out infinite}
#evVisual .card:after{content:'';position:absolute;z-index:4;inset:-2px;border-radius:19px;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(205,255,246,.20) 0,rgba(205,255,246,.20) 1px,transparent 1px,transparent 5px),linear-gradient(90deg,transparent 0%,rgba(100,255,225,.03) 42%,rgba(200,255,246,.18) 50%,rgba(100,255,225,.03) 58%,transparent 100%),linear-gradient(to bottom,transparent 0%,rgba(80,255,215,.04) 45%,rgba(190,255,244,.14) 50%,rgba(80,255,215,.04) 55%,transparent 100%);mix-blend-mode:screen;opacity:.72;animation:evVisualScan 2.5s linear infinite,evVisualFlicker 4.2s steps(9,end) infinite}
#evVisual .cap{position:absolute;z-index:7;left:5%;right:5%;bottom:8px;padding:20px 10px 7px;text-align:center;color:#d9fff5;font-size:8px;letter-spacing:1px;text-shadow:0 0 8px rgba(78,255,220,.95),0 0 22px rgba(78,255,220,.35);background:linear-gradient(transparent,rgba(0,25,19,.25),transparent)}
#evVisual .corners{position:absolute;z-index:8;inset:7px;border:1px solid rgba(150,255,236,.30);border-radius:12px;pointer-events:none;box-shadow:inset 0 0 22px rgba(70,255,220,.06)}
#evVisual .arrow{position:absolute;z-index:20;top:50%;transform:translateY(-50%);width:40px;height:66px;border:1px solid rgba(158,232,197,.35);border-radius:10px;background:rgba(3,15,11,.30);color:#c3ffe3;font-size:28px;box-shadow:0 0 18px rgba(50,255,210,.08)}
#evVisual .left{left:8px}.right{right:8px}
#evVisual .dots{position:absolute;z-index:20;bottom:25px;left:0;right:0;text-align:center;color:#9ee8c5;font-size:9px;letter-spacing:3px;text-shadow:0 0 8px rgba(78,255,220,.6)}
#evVisual .meta{position:absolute;z-index:20;bottom:9px;left:0;right:0;text-align:center;color:#5e9b7f;font-size:8px;letter-spacing:2px}
#evVisual .actions{position:absolute;z-index:20;right:20px;bottom:40px;display:flex;gap:8px}
@keyframes evVisualScan{0%{background-position:0 -35px,0 0,0 -40px}100%{background-position:0 55px,0 0,0 40px}}
@keyframes evVisualFlicker{0%,100%{opacity:.70}48%{opacity:.76}50%{opacity:.46}52%{opacity:.78}76%{opacity:.63}}
@keyframes evVisualEdge{0%,100%{opacity:.66;filter:brightness(1)}50%{opacity:.94;filter:brightness(1.3)}}
@keyframes evVisualFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
@keyframes evVisualPulse{50%{opacity:.42}}
@media(max-width:700px){#evVisual .vh{padding:13px 14px 10px}#evVisual .vt{font-size:9px;letter-spacing:2.5px}#evVisual .search{padding:9px 14px 3px}#evVisual .feed{height:calc(100% - 88px)}#evVisual .rail{padding-left:17vw;padding-right:17vw;gap:10px}#evVisual .card{flex-basis:66vw;height:48vh;min-height:250px}#evVisual .arrow{width:34px;height:58px}#evVisual .left{left:4px}.right{right:4px}#evVisual .hud{left:14px;right:14px;top:10px}.actions{right:14px!important;bottom:39px!important}}
`;
    document.head.appendChild(s);

    const box=document.createElement('section');box.id='evVisual';
    box.innerHTML='<div class="vh"><div class="vt">E.V. // HOLOGRAPHIC VISUAL MEMORY</div><button class="vc" type="button">CLOSE</button></div><div class="search"><input id="evVisualQuery" placeholder="Search visuals — e.g. Spider-Man suit"><button id="evVisualSearch" type="button">SEARCH</button></div><div class="feed"><div class="hud"><span class="pulse">● VISUAL FEED ONLINE</span><span id="evVisualCount">0 / 0</span></div><button class="arrow left" id="evVisualPrev" type="button">‹</button><div class="rail"></div><button class="arrow right" id="evVisualNext" type="button">›</button><div class="dots" id="evVisualDots">○ ○ ○</div><div class="meta" id="evVisualMeta">SWIPE LEFT / RIGHT TO SELECT</div><div class="actions"><button class="save" type="button" id="evSaveVisual">SAVE THIS DISPLAY</button></div></div>';
    document.body.appendChild(box);
    box.querySelector('.vc').onclick=()=>box.classList.remove('open');
    box.querySelector('#evVisualSearch').onclick=()=>visualSearch(box.querySelector('#evVisualQuery').value);
    box.querySelector('#evVisualQuery').onkeydown=e=>{if(e.key==='Enter')visualSearch(e.currentTarget.value)};
    box.querySelector('#evVisualPrev').onclick=()=>move(-1);
    box.querySelector('#evVisualNext').onclick=()=>move(1);
    box.querySelector('#evSaveVisual').onclick=()=>saveCurrent();
  }

  let current=[],currentQuery='',idx=0;
  function cards(){return [...document.querySelectorAll('#evVisual .rail .card')]}
  function update(){const c=cards();c.forEach((x,i)=>{x.classList.toggle('active',i===idx);x.classList.toggle('prev',i===idx-1);x.classList.toggle('next',i===idx+1)});const n=document.getElementById('evVisualCount'),d=document.getElementById('evVisualDots'),m=document.getElementById('evVisualMeta');if(n)n.textContent=c.length?`${idx+1} / ${c.length}`:'0 / 0';if(d)d.textContent=c.map((_,i)=>i===idx?'●':'○').join(' ');if(m)m.textContent=c.length?'SELECT '+String(idx+1).padStart(2,'0')+' / '+String(c.length).padStart(2,'0')+' · SWIPE LEFT / RIGHT':'NO VISUALS'}
  function activate(n){const c=cards();if(!c.length)return;idx=(n+c.length)%c.length;c[idx].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});update()}
  function move(d){activate(idx+d)}
  function saveCurrent(){if(!current.length)return;const m=mem();m[currentQuery]=current;put(m);say(`Saved this holographic display as ${currentQuery}.`)}
  function render(query,items,fromMemory){ensureStyle();current=items||[];currentQuery=query;idx=0;const box=document.getElementById('evVisual'),rail=box.querySelector('.rail');rail.innerHTML='';current.forEach((x,i)=>{const c=document.createElement('button');c.type='button';c.className='card';const img=document.createElement('img');img.loading='lazy';img.src=x.url;img.alt=x.title||query;img.onerror=()=>c.remove();const cap=document.createElement('div');cap.className='cap';cap.textContent=x.title||query;const corners=document.createElement('div');corners.className='corners';c.append(img,cap,corners);c.onclick=()=>activate(i);rail.appendChild(c)});box.querySelector('.vt').textContent=`E.V. // HOLOGRAPHIC VISUAL MEMORY · ${query}`+(fromMemory?' · SAVED':'');box.querySelector('#evVisualQuery').value=query;box.classList.add('open');requestAnimationFrame(()=>activate(0))}
  async function visualSearch(query){const q=String(query||'').replace(/\s+/g,' ').trim();if(!q)return false;ensureStyle();const m=mem();if(m[q]&&m[q].length){render(q,m[q],true);say(`I found the saved holographic display for ${q}.`);return true}say(`I'll bring up ${q} in the visual feed.`);try{const url='https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='+encodeURIComponent(q)+'&gsrnamespace=6&gsrlimit=18&prop=imageinfo&iiprop=url|mime&iiurlwidth=900&format=json&origin=*';const r=await fetch(url);if(!r.ok)throw new Error('image search failed');const j=await r.json();const pages=j.query&&j.query.pages?Object.values(j.query.pages):[];const items=pages.map(p=>{const ii=p.imageinfo&&p.imageinfo[0];return ii&&ii.thumburl?{url:ii.thumburl,title:(p.title||'').replace(/^File:/,'')}:null}).filter(Boolean);if(!items.length){say(`I couldn't find images for ${q}.`);return true}m[q]=items;put(m);render(q,items,false);return true}catch(e){console.warn('E.V. visual search',e);say(`I couldn't reach the image library right now. I can try ${q} again.`);return true}}
  function command(text){const raw=String(text||'').trim();const q=raw.replace(/^e\.?v\.?[,:\s-]*/i,'').trim();const low=q.toLowerCase();const visual=low.match(/^(?:bring up|show|display|pull up|find|look up)\s+(?:pictures?\s+of\s+|photos?\s+of\s+|images?\s+of\s+)?(.+?)(?:\s+again)?$/i);if(visual){visualSearch(visual[1].trim());return true}const save=low.match(/^save\s+(?:these|this|that)(?:\s+images?|\s+photos?|\s+display)?$/i);if(save&&current.length){saveCurrent();return true}const m=q.match(/^(?:open|launch|start|go to)\s+(youtube|spotify|google maps|maps|google|github|gmail|messages|phone)$/i);if(!m)return false;const key=m[1]==='google maps'||m[1]==='maps'?'maps':m[1];const item=apps[key];say(`Opening ${item.label}.`);showLink(key);return true}
  form.addEventListener('submit',e=>{const text=input.value.trim();const isVisual=/^(?:e\.?v\.?[,:\s-]+)?(?:bring up|show|display|pull up|find|look up)\s+/i.test(text)||/^(?:e\.?v\.?[,:\s-]+)?save\s+(?:these|this|that)/i.test(text);const isApp=/^(?:e\.?v\.?[,:\s-]+)?(?:open|launch|start|go to)\s+(?:youtube|spotify|google maps|maps|google|github|gmail|messages|phone)$/i.test(text);if(!isVisual&&!isApp)return;e.preventDefault();e.stopImmediatePropagation();input.value='';input.style.height='auto';try{command(text)}catch(_){say('I could not complete that request.')}},true);
  window.EVAppActions={open:showLink,command,visualSearch,saveVisual:saveCurrent};
})();