/* E.V. add-on features — keeps the original interface untouched. */
(function(){
  'use strict';
  const LS = 'ev-feature-';
  const $ = id => document.getElementById(id);
  const save = (k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v));}catch(_){} };
  const load = (k,d)=>{try{const v=localStorage.getItem(LS+k);return v===null?d:JSON.parse(v);}catch(_){return d;}};
  const row = (role,text)=>{ try{return typeof addRow==='function' ? addRow(role,text) : null;}catch(_){return null;} };
  const say = text => { row('ev',text); try{ if(typeof speak==='function') speak(text); }catch(_){} };
  const now = ()=>new Date();

  let homeworkMode = !!load('homeworkMode',false);
  let homeworkTimer = null;
  let smartWebhook = load('smartWebhook','');
  let journalLast = load('journalLast','');
  let geo = load('geo',null);

  function featureContext(){
    return `\n\nE.V. FEATURE MODES:\n- Homework assistant mode: ${homeworkMode?'ON':'OFF'}. When ON, teach step-by-step, show the reasoning needed to learn, and offer a quick check question instead of only dumping an answer.\n- Voice/text shortcuts are enabled.\n- Smart-home webhook: ${smartWebhook?'configured':'not configured'}. Never claim a device changed unless the webhook call succeeded.\n- Context-aware reminders and weather checks are enabled when location permission is available.\n- Music mood controls are available when Spotify is connected.`;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function(input, init){
    try{
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if(url.includes('api.groq.com/openai/v1/chat/completions') && init && init.body){
        const body = JSON.parse(init.body);
        if(Array.isArray(body.messages) && body.messages[0]?.role==='system'){
          body.messages[0].content = String(body.messages[0].content||'') + featureContext();
          init = {...init, body:JSON.stringify(body)};
        }
      }
    }catch(_){}
    return originalFetch(input,init);
  };

  function setHomework(on){
    homeworkMode = !!on; save('homeworkMode',homeworkMode);
    say(homeworkMode ? 'Homework mode is on. I’ll teach it with you, not just hand you the answer.' : 'Homework mode is off. Back to normal E.V.');
  }

  function timerMessage(mins){
    clearTimeout(homeworkTimer);
    const end = Date.now()+mins*60000;
    homeworkTimer=setTimeout(()=>{
      homeworkTimer=null;
      say(`Homework timer done — ${mins} minutes. Take a quick break, Yosi.`);
      try{ if(navigator.vibrate) navigator.vibrate([200,100,200]); }catch(_){}
      try{ if(Notification.permission==='granted') new Notification('E.V. — timer done',{body:`Your ${mins}-minute homework timer is finished.`}); }catch(_){}
    },mins*60000);
    say(`Homework timer started for ${mins} minutes. I’ll let you know when it’s up.`);
  }

  function clearTimer(){ if(homeworkTimer){clearTimeout(homeworkTimer);homeworkTimer=null;} say('Homework timer stopped.'); }

  async function requestGeo(){
    if(geo) return geo;
    if(!navigator.geolocation) throw new Error('Location is not available in this browser.');
    return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>{
      geo={lat:p.coords.latitude,lon:p.coords.longitude}; save('geo',geo); resolve(geo);
    },()=>reject(new Error('I need location permission to check local weather.')), {enableHighAccuracy:false,maximumAge:3600000,timeout:10000}));
  }

  async function weatherAt(date){
    const g=await requestGeo();
    const u=new URL('https://api.open-meteo.com/v1/forecast');
    u.search=new URLSearchParams({latitude:g.lat,longitude:g.lon,hourly:'temperature_2m,precipitation_probability,weather_code',forecast_days:'2',temperature_unit:'fahrenheit',timezone:'auto'}).toString();
    const r=await originalFetch(u.toString());
    if(!r.ok) throw new Error('Weather service unavailable.');
    const d=await r.json();
    const target=date||now();
    let best=0, bestDiff=Infinity;
    (d.hourly?.time||[]).forEach((t,i)=>{const diff=Math.abs(new Date(t)-target);if(diff<bestDiff){bestDiff=diff;best=i;}});
    const code=d.hourly.weather_code?.[best];
    const temp=d.hourly.temperature_2m?.[best];
    const rain=d.hourly.precipitation_probability?.[best];
    return {temp,rain,desc:weatherCode(code),time:d.hourly.time?.[best]};
  }

  function weatherCode(c){
    if(c===0) return 'clear'; if([1,2,3].includes(c)) return 'partly cloudy';
    if([45,48].includes(c)) return 'foggy'; if([51,53,55,56,57].includes(c)) return 'drizzly';
    if([61,63,65,66,67,80,81,82].includes(c)) return 'rainy';
    if([71,73,75,77,85,86].includes(c)) return 'snowy';
    if([95,96,99].includes(c)) return 'stormy'; return 'mixed';
  }

  async function smartHome(action,device){
    if(!smartWebhook){
      const u=prompt('Paste your IFTTT/Webhook URL for E.V. smart-home commands:');
      if(!u) return;
      smartWebhook=u.trim(); save('smartWebhook',smartWebhook);
    }
    const r=await originalFetch(smartWebhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'EV',action,device,command:`${action} ${device}`,timestamp:new Date().toISOString()})});
    if(!r.ok) throw new Error(`Smart-home webhook returned ${r.status}.`);
    say(`Done — I sent the ${action} command for ${device}.`);
  }

  async function spotifyMood(mood){
    if(typeof spotifyApi!=='function') throw new Error('Spotify controls are not loaded yet.');
    const queries={lofi:'lofi beats focus',focus:'instrumental focus',chill:'chill indie',hype:'workout hype basketball',relax:'ambient relax',study:'study beats'};
    const q=queries[mood]||mood;
    const data=await spotifyApi('/search?'+new URLSearchParams({q,type:'track',limit:'5'}).toString());
    const tracks=(data.tracks?.items||[]).filter(t=>t.uri);
    if(!tracks.length) throw new Error(`I couldn't find a ${mood} set on Spotify.`);
    await spotifyApi('/me/player/play',{method:'PUT',body:JSON.stringify({uris:tracks.map(t=>t.uri)})});
    say(`Playing a ${mood} set on Spotify.`);
  }

  function challenge(){
    const list=['5-minute challenge: do 20 squats, then 20 seconds of rest, twice.','Brain break: name 10 NBA players whose first name starts with J.','Focus challenge: put your phone down for 5 minutes and finish one tiny homework step.','Quick reset: 10 push-ups, drink some water, then come back.','Song challenge: write 4 lines that fit the mood of whatever you are listening to.'];
    say(list[Math.floor(Math.random()*list.length)]);
  }

  function journalPrompt(force=false){
    const day=new Date().toISOString().slice(0,10);
    if(!force && journalLast===day) return;
    journalLast=day; save('journalLast',day);
    const prompts=['Journal check-in: what was the best thing that happened today?','Journal check-in: what is one thing on your mind that you want to get out of your head?','Journal check-in: what is one thing you want tomorrow-you to thank today-you for?','Journal check-in: what song matches your mood right now, and why?'];
    say(prompts[new Date().getDate()%prompts.length]);
  }

  function reminder(title,when){
    const date=new Date(when); if(Number.isNaN(date.getTime())) throw new Error('I could not understand that reminder time.');
    const outdoor=/outside|outdoor|basketball|park|walk|run|practice|game|field|yard|bike|jog|beach|hike/i.test(title);
    const item={id:Date.now().toString(36),title,when:date.toISOString(),weather:null,featureReminder:true};
    if(typeof agenda!=='undefined'){
      agenda.push({id:item.id,title:`Reminder: ${title}`,when:item.when,featureReminder:true,weather:null});
      if(typeof storageSet==='function') storageSet('ev-agenda',agenda);
      if(typeof renderAgenda==='function') renderAgenda();
    }
    setTimeout(async()=>{
      let weather='';
      if(outdoor){try{const w=await weatherAt(date);weather=` Weather around then: ${Math.round(w.temp)}°F, ${w.desc}, rain chance ${w.rain}%.`; }catch(_) {}}
      say(`Reminder: ${title}.${weather}`);
      try{if(Notification.permission==='granted')new Notification('E.V. reminder',{body:`${title}.${weather}`});}catch(_){}
    },Math.max(0,date.getTime()-Date.now()));
    say(`Got it — I’ll remind you at ${date.toLocaleString()}.${outdoor?' I’ll also check the weather for it.':''}`);
  }

  function parseDatePhrase(text){
    const mins=text.match(/(?:in|after)\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
    if(mins){const n=Number(mins[1]);const unit=mins[2].toLowerCase();return new Date(Date.now()+n*(unit.startsWith('hour')||unit.startsWith('hr')?3600000:60000));}
    const at=text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if(at){let h=Number(at[1]);const m=Number(at[2]||0);const ap=(at[3]||'').toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;const d=new Date();d.setHours(h,m,0,0);if(d<=Date.now())d.setDate(d.getDate()+1);return d;}
    return null;
  }

  async function command(text){
    const raw=text.trim(); const q=raw.toLowerCase().replace(/^ev[,:\s-]+/,'').trim();
    if(/^homework mode\s+on$/.test(q)){setHomework(true);return true;}
    if(/^homework mode\s+off$/.test(q)){setHomework(false);return true;}
    if(/^start homework timer(?:\s+(\d+))?/.test(q)){timerMessage(Number(q.match(/\d+/)?.[0]||25));return true;}
    if(/^stop homework timer/.test(q)){clearTimer();return true;}
    if(/^play (lo-?fi|focus|chill|hype|relax|study)(?: playlist| music)?$/.test(q)){try{await spotifyMood(q.match(/^play (lo-?fi|focus|chill|hype|relax|study)/)[1].replace('-',''));}catch(e){say(e.message);}return true;}
    if(/^take a break|^give me a challenge|^mini[- ]game/.test(q)){challenge();return true;}
    if(/^journal prompt|^daily journal/.test(q)){journalPrompt(true);return true;}
    if(/^set smart home webhook|^connect smart home/.test(q)){smartWebhook=prompt('Paste your IFTTT/Webhook URL:')||smartWebhook;save('smartWebhook',smartWebhook);say(smartWebhook?'Smart-home webhook saved.':'No webhook saved.');return true;}
    const sm=q.match(/^turn (on|off) (?:the )?(.+)$/i); if(sm){try{await smartHome(sm[1],sm[2].trim());}catch(e){say(e.message);}return true;}
    const rm=q.match(/^remind me (?:to )?(.+?)\s+(in\s+\d+\s*(?:minutes?|mins?|hours?|hrs?)|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if(rm){const d=parseDatePhrase(rm[2]); if(d) reminder(rm[1].trim(),d); else say('Tell me a time like “in 20 minutes” or “at 4 PM.”'); return true;}
    return false;
  }

  const form=$('composer'), input=$('input');
  if(form&&input){
    form.addEventListener('submit',async e=>{
      const text=input.value.trim();
      if(!text) return;
      const isCmd=/^(?:ev[,:\s-]+)?(?:homework mode|start homework timer|stop homework timer|play (?:lo-?fi|focus|chill|hype|relax|study)|take a break|give me a challenge|mini[- ]game|journal prompt|daily journal|set smart home webhook|connect smart home|turn (?:on|off)|remind me\b)/i.test(text);
      if(!isCmd) return;
      e.preventDefault(); e.stopImmediatePropagation();
      row('user',text); input.value=''; input.style.height='auto';
      try{await command(text);}catch(err){say(err.message||'That shortcut failed.');}
    },true);
  }

  document.addEventListener('click',()=>{try{if('Notification' in window && Notification.permission==='default') Notification.requestPermission();}catch(_){}},{once:true,capture:true});

  function eveningCheck(){const h=now().getHours();if(h>=19) journalPrompt(false);}
  setTimeout(eveningCheck,2500); setInterval(eveningCheck,30*60000);

  window.EVFeatures={homeworkMode:()=>homeworkMode,setHomework,timer:timerMessage,journal:journalPrompt,weather:weatherAt,smartHome,music:spotifyMood,challenge};
})();
