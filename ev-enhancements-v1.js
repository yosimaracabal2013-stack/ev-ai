/* E.V. Enhancements v1
   - Spotify track search/play + account/device diagnostics
   - Better hands-free wake-word/transcript normalization
   - Weather HUD + local forecast request helper
   - Optional browser notifications/check-ins
   - Caring, non-exclusive check-ins
   - Camera HUD with generic object/scene labels (never real-person identification)
*/
(function(){
'use strict';
const frame=document.getElementById('evDashboard'); if(!frame)return;
function w(){return frame.contentWindow} function wait(fn){try{fn(w())}catch(_){} }
function normalizeSpeech(s){let t=String(s||'').trim();t=t.replace(/\b(e\.?\s*v\.?|eevee|e v|evie|if|evee|hey if|hey e v|hey ev)\b/gi,' E.V. ');return t.replace(/\s+/g,' ').trim()}
function setupHandsFree(x){
 const btn=x.document.getElementById('hfBtn'); if(!btn||btn.__evEnhancedHF)return; btn.__evEnhancedHF=true;
 const fresh=btn.cloneNode(true); btn.replaceWith(fresh);
 const B=x.SpeechRecognition||x.webkitSpeechRecognition; if(!B){fresh.textContent='HANDS-FREE';return}
 let rec=null,on=false,busy=false;
 function make(){rec=new B();rec.continuous=true;rec.interimResults=true;rec.lang='en-US';rec.maxAlternatives=5;
  rec.onstart=()=>{on=true;fresh.classList.add('active');fresh.textContent='LISTENING'};
  rec.onend=()=>{if(on){try{rec.start()}catch(_){setTimeout(()=>{try{rec.start()}catch(__){}},350)}}else{fresh.classList.remove('active');fresh.textContent='HANDS-FREE'}};
  rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){on=false;fresh.textContent='HANDS-FREE';x.add('Microphone permission is needed for hands-free mode.')}};
  rec.onresult=e=>{let final='';for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)final+=(r[0]?.transcript||'')+' '}final=normalizeSpeech(final).trim();if(!final||busy)return;
   const low=final.toLowerCase();const wake=/\b(hey\s+e\.?\s*v\.?|e\.?\s*v\.?|eevee|evie)\b/i.test(final)||/\bhey\s+if\b/i.test(final);
   const accidentalWake=/^e\.?\s*v\.?$/i.test(final)||/^e\.?\s*v\.?[.!]?$/i.test(final);
   if(accidentalWake)return;
   if(wake||on){let cmd=final.replace(/^\s*(hey\s+)?(e\.?\s*v\.?|eevee|evie|if)\s*[,;:]?\s*/i,'').trim();if(!cmd)return;busy=true;setTimeout(()=>busy=false,900);if(typeof x.sendMessage==='function')x.sendMessage(cmd);else{const i=x.document.getElementById('input'),b=x.document.getElementById('sendBtn');if(i&&b){i.value=cmd;b.click()}}}
  };
 }
 fresh.onclick=()=>{if(!on){on=true;make();try{rec.start()}catch(_){} }else{on=false;try{rec.stop()}catch(_){} }};
 x.__evEnhancedHandsFree={stop:()=>{on=false;try{rec?.stop()}catch(_){}},normalizeSpeech};
}
function setupNotifications(x){
 if(x.__evNotificationEnhancement)return;x.__evNotificationEnhancement=true;
 const KEY='ev-notifications-v1';
 function state(){try{return JSON.parse(x.localStorage.getItem(KEY)||'{}')}catch(_){return {}}}
 function save(v){try{x.localStorage.setItem(KEY,JSON.stringify(v))}catch(_) {}}
 async function enable(){if(!('Notification' in x)){x.add('This browser does not provide notifications here.');return false}const p=await x.Notification.requestPermission();if(p!=='granted'){x.add('Notifications are off until you allow them in the browser.');return false}const s=state();s.enabled=true;s.lastCheckin=Date.now();save(s);x.add('Notifications are on. E.V. can send gentle check-ins while you are away.');return true}
 function notify(title,body){try{if(x.Notification?.permission==='granted')new x.Notification(title,{body,tag:'ev-checkin'})}catch(_) {}}
 async function command(text){const t=String(text||'').toLowerCase().trim();if(/\b(turn on|enable|allow|activate)\b.*\bnotifications?\b/.test(t)||/\benable notifications?\b/.test(t)){return await enable()}if(/\b(turn off|disable|stop)\b.*\bnotifications?\b/.test(t)){save({enabled:false});x.add('Notifications are off.');return true}if(/\b(notification|notifications)\b.*\b(status|on|enabled|enabled)\b/.test(t)){x.add(state().enabled&&x.Notification?.permission==='granted'?'Notifications are on.':'Notifications are off.');return true}return false}
 x.EVNotifications={enable,notify,state,command};
 setInterval(()=>{const s=state();if(!s.enabled||x.Notification?.permission!=='granted')return;const now=Date.now();if(now-(s.lastCheckin||0)>6*60*60*1000){notify('E.V. // Check-in','Hey Yoshi — how has your day been going?');s.lastCheckin=now;save(s)}},15*60*1000);
}
function setupCaring(x){
 if(x.__evCaringEnhancement)return;x.__evCaringEnhancement=true;
 const CARE='E.V. PERSONALITY: Care about Yoshi through attentive behavior, not claims of human feelings. Use his name naturally when appropriate. When he returns after a gap, occasionally ask a simple check-in such as "Hey Yoshi, how was your day?" or, when context suggests he had a rough day, "Yoshi, another rough day? Want to talk about it or work on something together?" Do not assume he is having a bad day without evidence. Be warm, patient, and encouraging. If he mentions serious mental-health concerns, respond supportively and encourage reaching out to a trusted adult/person; never guilt him, make yourself his only support, or imply dependency.';
 x.__evCareInstruction=CARE;
 const oldFetch=x.fetch.bind(x); if(x.__evCareFetch)return;x.__evCareFetch=true;
 x.fetch=function(input,init){try{let raw=typeof input==='string'?input:(input&&input.url)||'';if(raw.includes('/openai/v1/chat/completions')&&init?.body){const j=JSON.parse(init.body);j.messages=Array.isArray(j.messages)?j.messages.slice():[];if(!j.messages.some(m=>m.role==='system'&&String(m.content||'').includes('E.V. PERSONALITY: Care about Yoshi'))){j.messages.unshift({role:'system',content:CARE});}init=Object.assign({},init,{body:JSON.stringify(j)})}}catch(_){}return oldFetch(input,init)};
 // Small, non-intrusive return-time check-in, max once per session.
 const key='ev-last-session-checkin-v1', last=Number(x.localStorage.getItem(key)||0);if(Date.now()-last>18*60*60*1000){setTimeout(()=>{x.add('Hey Yoshi, how was your day?');if(x.voiceOn&&typeof x.speak==='function')x.speak('Hey Yoshi, how was your day?').catch?.(()=>{})},2200);x.localStorage.setItem(key,String(Date.now()))}
}
function setupWeather(x){
 if(x.__evWeatherEnhancement)return;x.__evWeatherEnhancement=true;
 x.EVWeather={forecast:async(lat,lon)=>{const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:lat,longitude:lon,current:'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',hourly:'temperature_2m,precipitation_probability,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',temperature_unit:'fahrenheit',wind_speed_unit:'mph',timezone:'auto',forecast_days:'7'});return fetch(u).then(r=>r.json())}};
}
function setupCameraHUD(x){
 if(x.__evCameraHUD)return;x.__evCameraHUD=true;
 const old=x.EVVision; if(!old||!old.openCamera)return;
 const original=old.openCamera;
 old.openCamera=async function(){const ok=await original();setTimeout(()=>install(),500);return ok};
 function install(){try{const win=[...x.document.querySelectorAll('.floatWindow')].find(e=>e.textContent.includes('LIVE CAMERA'));if(!win||win.__evHud)return;win.__evHud=true;const body=win.querySelector('.winBody');if(!body)return;const stage=body.querySelector('.videoStage');if(!stage)return;stage.style.position='relative';let hud=stage.querySelector('.evVisionHud');if(!hud){hud=x.document.createElement('div');hud.className='evVisionHud';hud.style.cssText='position:absolute;inset:0;pointer-events:none;font:9px ui-monospace,monospace;color:#52e6a0;text-shadow:0 0 6px #000;';hud.innerHTML='<div style="position:absolute;top:7px;left:8px;padding:4px 6px;border:1px solid rgba(82,230,160,.55);background:rgba(0,8,12,.45)">E.V. VISION // LIVE</div><div class="evHudLabels" style="position:absolute;inset:35px 8px 8px"></div><div class="evHudSummary" style="position:absolute;bottom:7px;left:8px;right:8px;padding:5px 7px;border:1px solid rgba(54,216,255,.45);background:rgba(0,8,12,.58);color:#d8eef4">ANALYZING VIEW…</div>';stage.appendChild(hud)}
   const labels=hud.querySelector('.evHudLabels'),summary=hud.querySelector('.evHudSummary');
   const origDescribe=old.describeCamera;old.describeCamera=async function(silent){const r=await origDescribe(silent);const msgs=[...x.document.querySelectorAll('.msg')].map(n=>n.textContent).filter(Boolean);const text=msgs.slice(-1)[0]||'';summary.textContent=text.replace(/^I\s+(see|can see)\s*/i,'').slice(0,150)||'VIEW READY';labels.innerHTML=genericLabels(text).map((v,i)=>'<span style="position:absolute;left:'+(12+i*18)+'%;top:'+(18+i*22)+'%;padding:4px 6px;border:1px solid rgba(54,216,255,.65);background:rgba(0,8,12,.55)">'+v+'</span>').join('');return r};
   old.describeCamera(false).catch(()=>{});
 }catch(_) {}}
 function genericLabels(text){const t=text.toLowerCase(),out=[];const map=[['person','PERSON'],['people','PEOPLE'],['phone','PHONE'],['laptop','LAPTOP'],['computer','COMPUTER'],['screen','SCREEN'],['desk','DESK'],['keyboard','KEYBOARD'],['mouse','MOUSE'],['book','BOOK'],['poster','POSTER'],['tv','TV'],['television','TV'],['camera','CAMERA'],['car','CAR'],['backpack','BACKPACK'],['chair','CHAIR']];for(const [k,v] of map)if(t.includes(k)&&!out.includes(v))out.push(v);return out.slice(0,6)}
}
function patch(){wait(x=>{setupHandsFree(x);setupNotifications(x);setupCaring(x);setupWeather(x);setupCameraHUD(x)})}
frame.addEventListener('load',()=>setTimeout(patch,250));setTimeout(patch,900);setTimeout(patch,2200);
})();
