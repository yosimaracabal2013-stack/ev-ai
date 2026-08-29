/* E.V. memory/history/time/weather upgrade v1 */
(function(){
  'use strict';
  const d=document;
  const KEY='ev-conversation-archive-v1';
  const SESSION_KEY='ev-current-session-v1';
  const $=s=>d.querySelector(s);
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const say=t=>{try{if(typeof addRow==='function')addRow('ev',t);if(typeof speak==='function')speak(t)}catch(_) {}};
  const esc=s=>String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return []}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}};
  const sessionId=()=>localStorage.getItem(SESSION_KEY)||'';
  const newId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  let sid=sessionId()||newId();
  localStorage.setItem(SESSION_KEY,sid);

  function domMessages(){
    const log=$('#log'); if(!log)return [];
    return [...log.querySelectorAll(':scope > .row')].map(r=>{
      const role=r.classList.contains('user')?'user':'assistant';
      const b=r.querySelector('.bubble');
      return {role,content:clean(b?.textContent||''),at:new Date().toISOString()};
    }).filter(m=>m.content && !/^processing\.\.\.$/i.test(m.content));
  }
  function saveSession(){
    const messages=domMessages();
    if(!messages.length)return;
    const all=read();
    const now=new Date().toISOString();
    const first=messages[0]?.content||'E.V. conversation';
    let s=all.find(x=>x.id===sid);
    if(!s){s={id:sid,createdAt:now,updatedAt:now,title:first.slice(0,72),messages:[]};all.unshift(s)}
    s.updatedAt=now;s.messages=messages;
    if(!s.title || s.title==='E.V. conversation')s.title=first.slice(0,72);
    write(all.slice(0,100));
    renderHistory();
  }
  function archiveCurrent(){saveSession();}
  function startNewSession(){
    saveSession(); sid=newId();localStorage.setItem(SESSION_KEY,sid);setTimeout(()=>{renderHistory()},50);
  }
  function loadSession(id){
    const s=read().find(x=>x.id===id); if(!s)return;
    const log=$('#log'); if(!log)return;
    log.innerHTML='';
    s.messages.forEach(m=>{try{addRow(m.role==='user'?'user':'ev',m.content)}catch(_) {}});
    sid=s.id;localStorage.setItem(SESSION_KEY,sid);
    renderHistory();
    try{document.querySelector('.tab[data-tab="chat"]')?.click()}catch(_){}
    say('Conversation restored. I have the messages from that E.V. session back on screen.');
  }
  function formatDate(iso){try{return new Date(iso).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}catch(_){return iso}}
  function renderHistory(){
    const list=$('#evHistoryList'); if(!list)return;
    const all=read();
    list.innerHTML='';
    if(!all.length){list.innerHTML='<div class="evh-empty">No archived conversations yet.</div>';return}
    all.forEach((s,i)=>{
      const b=d.createElement('button');b.type='button';b.className='evh-item';
      b.innerHTML='<span class="evh-title">'+esc(s.title||('Conversation '+(i+1)))+'</span><span class="evh-date">'+esc(formatDate(s.updatedAt))+' · '+s.messages.length+' messages</span>';
      b.onclick=()=>loadSession(s.id);list.appendChild(b);
    });
  }
  function injectHistory(){
    if($('#evHistoryTab')){renderHistory();return}
    const tabs=$('.tabs');if(!tabs)return;
    const tab=d.createElement('button');tab.id='evHistoryTab';tab.className='tab';tab.dataset.tab='history';tab.textContent='History';
    tabs.appendChild(tab);
    const panel=d.createElement('div');panel.className='panel';panel.id='evHistoryPanel';
    panel.innerHTML='<div class="evh-head"><div>CONVERSATION ARCHIVE</div><button id="evhNew">NEW CHAT</button></div><div class="evh-note">E.V. keeps your E.V. conversations in this browser so you can bring an old one back later.</div><div id="evHistoryList"></div>';
    $('#panels')?.appendChild(panel);
    const style=d.createElement('style');style.id='evHistoryStyle';style.textContent=`#evHistoryPanel{padding:14px 20px;gap:10px;overflow-y:auto}#evHistoryPanel .evh-head{display:flex;justify-content:space-between;align-items:center;color:#9ee8c5;font-size:10px;letter-spacing:2px}#evhNew{background:none;border:1px solid rgba(158,232,197,.25);color:#9ee8c5;border-radius:7px;padding:7px 10px;font:9px ui-monospace;letter-spacing:1px}#evHistoryPanel .evh-note{font-size:10px;line-height:1.5;color:#789487;border-bottom:1px solid rgba(160,232,197,.12);padding-bottom:10px}.evh-item{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;text-align:left;background:rgba(13,25,20,.65);border:1px solid rgba(158,232,197,.12);border-left:2px solid rgba(158,232,197,.35);color:#edf8f2;border-radius:7px;padding:10px 12px;margin-bottom:7px;font:11px ui-monospace}.evh-item:active{transform:scale(.99)}.evh-title{white-space:normal}.evh-date{color:#789487;font-size:9px}.evh-empty{color:#789487;font-size:11px;padding:12px 0}`;d.head.appendChild(style);
    tab.onclick=()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');panel.classList.add('active');renderHistory()};
    $('#evhNew').onclick=()=>{archiveCurrent();startNewSession();try{document.querySelector('.tab[data-tab="chat"]')?.click()}catch(_) {}};
    renderHistory();
  }

  async function geo(){
    if(!navigator.geolocation)throw new Error('Location is not available in this browser.');
    return await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),()=>reject(new Error('I need your location permission for local weather.')), {enableHighAccuracy:false,maximumAge:300000,timeout:10000}));
  }
  function wdesc(c){if(c===0)return'clear';if([1,2,3].includes(c))return'partly cloudy';if([45,48].includes(c))return'foggy';if([51,53,55,56,57].includes(c))return'drizzle';if([61,63,65,66,67,80,81,82].includes(c))return'rain';if([71,73,75,77,85,86].includes(c))return'snow';if([95,96,99].includes(c))return'thunderstorms';return'mixed'}
  async function weather(lat,lon,label){
    const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:lat,longitude:lon,current:'temperature_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',temperature_unit:'fahrenheit',wind_speed_unit:'mph',timezone:'auto',forecast_days:'3'}).toString();
    const r=await fetch(u);if(!r.ok)throw new Error('The weather service is unavailable right now.');const x=await r.json();
    const c=x.current||{};const dly=x.daily||{};
    return {label:label||'your location',temp:c.temperature_2m,feels:c.apparent_temperature,desc:wdesc(c.weather_code),rain:c.precipitation,rainChance:dly.precipitation_probability_max?.[0],wind:c.wind_speed_10m,hi:dly.temperature_2m_max?.[0],lo:dly.temperature_2m_min?.[0],today:dly.time?.[0]};
  }
  async function weatherCommand(q){
    let place=q.replace(/^weather(?: in)?\s*/i,'').trim();
    if(!place || /^(here|my location|outside)$/i.test(place)){
      const g=await geo();return weather(g.lat,g.lon,'your current location');
    }
    const gr=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:place,count:'1',language:'en',format:'json'}));
    if(!gr.ok)throw new Error('I could not search that location.');const gd=await gr.json();const p=gd.results?.[0];if(!p)throw new Error(`I couldn't find ${place}.`);return weather(p.latitude,p.longitude,[p.name,p.admin1,p.country].filter(Boolean).join(', '));
  }
  function sayTime(){
    const now=new Date(),tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    say(`It is ${now.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'})} on ${now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}. Your device timezone is ${tz}.`);
  }
  async function command(raw){
    const q=clean(raw).replace(/^e\.?v\.?[,:\s-]*/i,'').trim();const s=q.toLowerCase();
    if(/^(what('?s| is) )?the time\??$|^what time is it\??$|^time\??$/.test(s)){sayTime();return true}
    if(/^what('?s| is) (the )?(date|day)\??$|^what day is it\??$|^date\??$/.test(s)){const n=new Date();say(`Today is ${n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}.`);return true}
    if(/^weather( in .+| here| outside| for me)?\??$/i.test(q)){try{const w=await weatherCommand(q);say(`Right now in ${w.label}: ${Math.round(w.temp)}°F, feels like ${Math.round(w.feels)}°, ${w.desc}. Wind ${Math.round(w.wind)} mph. Today: high ${Math.round(w.hi)}°, low ${Math.round(w.lo)}°, rain chance ${Math.round(w.rainChance??0)}%.`)}catch(e){say(e.message)}return true}
    if(/^(show|open|bring up) (my )?(conversation )?(history|past chats|old chats)|^(conversation|chat) history$/i.test(q)){injectHistory();document.querySelector('#evHistoryTab')?.click();return true}
    if(/^save (this )?conversation$/i.test(q)){saveSession();say('Conversation archived.');return true}
    if(/^new (chat|conversation)$/i.test(q)){archiveCurrent();startNewSession();document.querySelector('.tab[data-tab="chat"]')?.click();say('New conversation started. The previous one is archived.');return true}
    if(/^search (my )?(conversation|chat) history for (.+)$/i.test(q)){const term=q.match(/^search (?:my )?(?:conversation|chat) history for (.+)$/i)[1].toLowerCase();const hits=[];read().forEach(s=>s.messages.forEach(m=>{if(m.content.toLowerCase().includes(term))hits.push({s,m})}));if(!hits.length)say(`I couldn't find “${term}” in the archived E.V. conversations.`);else{say(`I found ${hits.length} matching message${hits.length===1?'':'s'} in your archive.`);hits.slice(0,8).forEach(h=>say(`[${formatDate(h.s.updatedAt)}] ${h.m.role==='user'?'You':'E.V.'}: ${h.m.content}`))}return true}
    return false;
  }

  injectHistory();
  const log=$('#log');
  if(log){let timer=0;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(saveSession,500)});obs.observe(log,{childList:true,subtree:true});}
  const reset=$('#resetBtn');if(reset)reset.addEventListener('click',()=>{archiveCurrent();startNewSession()},true);

  const oldForm=$('#composer');const input=$('#input');
  if(oldForm&&input){oldForm.addEventListener('submit',async e=>{const text=clean(input.value);if(!text)return;if(/^(?:e\.?v\.?[,:\s-]*)?(?:what('?s| is) (?:the )?(?:time|date|day)|what time is it|time|date|weather|show .*history|conversation history|save .*conversation|new (?:chat|conversation)|search .*history)/i.test(text)){e.preventDefault();e.stopImmediatePropagation();try{await command(text)}catch(err){say(err.message||'That command failed.')}return}},true)}
  window.EVHistory={save:saveSession,archive:archiveCurrent,newConversation:startNewSession,load:loadSession,search:t=>read().filter(s=>JSON.stringify(s).toLowerCase().includes(String(t).toLowerCase())),weather:weatherCommand,time:sayTime};
})();
