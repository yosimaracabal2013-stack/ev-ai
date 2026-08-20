/* E.V. Jarvis layer — text commands only. No microphone, wake-word, or voice-control changes. */
(function(){
  'use strict';
  const w = window;

  function say(text){
    try{
      if(typeof w.addRow === 'function') w.addRow('ev', text);
    }catch(_){ }
  }

  function clean(text){
    return String(text || '').trim().replace(/^e\.?v\.?[,:\s-]+/i,'').trim().toLowerCase();
  }

  function openTab(name){
    const tab = Array.from(document.querySelectorAll('.tab')).find(b => String(b.dataset.tab || '').toLowerCase() === name);
    if(tab){ tab.click(); return true; }
    return false;
  }

  function agendaText(){
    try{
      const items = Array.isArray(w.agenda) ? w.agenda : [];
      if(!items.length) return 'Your agenda is clear right now.';
      return 'Here is what is on your agenda: ' + items.slice(0,8).map((x,i)=>{
        const title = x.title || '(untitled)';
        const when = x.when ? new Date(x.when).toLocaleString() : 'time not set';
        return `${i+1}. ${title} — ${when}`;
      }).join(' | ');
    }catch(_){ return 'I could not read the agenda right now.'; }
  }

  function memoryText(){
    try{
      const items = Array.isArray(w.memory) ? w.memory : [];
      if(!items.length) return 'I do not have any saved memories to show right now.';
      return 'I remember: ' + items.slice(-8).map(x => typeof x === 'string' ? x : (x.fact || x.text || JSON.stringify(x))).join(' | ');
    }catch(_){ return 'I could not read memory right now.'; }
  }

  async function weather(){
    if(!navigator.geolocation){ say('I cannot get your location from this browser.'); return; }
    say('Checking the weather now.');
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const u = new URL('https://api.open-meteo.com/v1/forecast');
        u.search = new URLSearchParams({latitude:pos.coords.latitude,longitude:pos.coords.longitude,current:'temperature_2m,weather_code,wind_speed_10m',temperature_unit:'fahrenheit',wind_speed_unit:'mph',timezone:'auto'}).toString();
        const r = await fetch(u.toString());
        if(!r.ok) throw new Error('weather service error');
        const d = await r.json();
        const c = d.current || {};
        const labels = {0:'clear',1:'mostly clear',2:'partly cloudy',3:'overcast',45:'foggy',48:'foggy',51:'drizzly',53:'drizzly',55:'drizzly',61:'rainy',63:'rainy',65:'rainy',71:'snowy',73:'snowy',75:'snowy',80:'showery',81:'showery',82:'showery',95:'stormy',96:'stormy',99:'stormy'};
        say(`Right now it is ${Math.round(c.temperature_2m)}°F and ${labels[c.weather_code] || 'mixed'}, with winds around ${Math.round(c.wind_speed_10m || 0)} mph.`);
      }catch(_){ say('I could not reach the weather service right now.'); }
    }, ()=>say('I need location permission to check your local weather.'), {maximumAge:300000, timeout:10000});
  }

  let timerId = null;
  function timer(minutes){
    const mins = Math.max(1, Number(minutes || 0));
    if(!Number.isFinite(mins)){ say('Tell me a timer length, like 25 minutes.'); return; }
    clearTimeout(timerId);
    say(`Timer started for ${mins} minute${mins===1?'':'s'}.`);
    timerId = setTimeout(()=>{
      timerId = null;
      say(`Your ${mins}-minute timer is done.`);
      try{ if(navigator.vibrate) navigator.vibrate([180,100,180]); }catch(_){ }
    }, mins * 60000);
  }

  function handle(text){
    const q = clean(text);
    if(!q) return false;
    if(/^wake up$|^wake up ev$/.test(q)){ say('I am awake and ready. What do you need?'); return true; }
    if(/^status$|^system status$|^how are you$/.test(q)){
      const model = document.getElementById('statModel')?.textContent || 'unknown';
      const agenda = document.getElementById('statAgenda')?.textContent || '0';
      const memory = document.getElementById('statMemory')?.textContent || '0';
      const link = document.getElementById('linkStatus')?.textContent || 'unknown';
      say(`Systems check: core ${model}, ${agenda} agenda items, ${memory} memories, ${link.toLowerCase()}.`);
      return true;
    }
    if(/^what time is it$|^what time is it right now$|^time$/.test(q)){ say(`It is ${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}.`); return true; }
    if(/^what'?s on the agenda$|^what is on the agenda$|^show my agenda$/.test(q)){ say(agendaText()); return true; }
    if(/^what do you remember$|^show memory$|^what do you have in memory$/.test(q)){ say(memoryText()); return true; }
    if(/^open agenda$|^go to agenda$/.test(q)){ openTab('agenda'); say('Agenda open.'); return true; }
    if(/^open memory$|^go to memory$/.test(q)){ openTab('memory'); say('Memory open.'); return true; }
    if(/^open links$|^go to links$|^open connections$/.test(q)){ openTab('connections'); say('Links open.'); return true; }
    if(/^open chat$|^go to chat$/.test(q)){ openTab('chat'); say('Chat open.'); return true; }
    if(/^weather$|^what'?s the weather$|^what is the weather$|^how'?s the weather$/.test(q)){ weather(); return true; }
    const tm = q.match(/^(?:start|set) (?:a )?timer(?: for)?\s*(\d+)\s*(minutes?|mins?|hours?|hrs?)?$/);
    if(tm){ let mins=Number(tm[1]); if((tm[2]||'').toLowerCase().startsWith('hour') || (tm[2]||'').toLowerCase().startsWith('hr')) mins*=60; timer(mins); return true; }
    if(/^stop timer$|^cancel timer$/.test(q)){ clearTimeout(timerId); timerId=null; say('Timer stopped.'); return true; }
    if(/^take a break$|^give me a challenge$/.test(q)){
      const choices=['Take five minutes, stretch, drink some water, then come back.','Quick challenge: 20 squats, 20 seconds rest, then repeat once.','Five-minute focus challenge: put the phone down and finish one small task.'];
      say(choices[Math.floor(Math.random()*choices.length)]); return true;
    }
    if(/^clear chat$/.test(q)){ const b=document.getElementById('resetBtn'); if(b) b.click(); return true; }
    return false;
  }

  function install(){
    const form=document.getElementById('composer');
    const input=document.getElementById('input');
    if(!form || !input || form.dataset.evJarvisInstalled) return;
    form.dataset.evJarvisInstalled='1';
    form.addEventListener('submit', e=>{
      const text=input.value.trim();
      if(!text) return;
      if(!/^(?:e\.?v\.?[,:\s-]+|wake up ev\b)/i.test(text)) return;
      if(handle(text)){
        e.preventDefault();
        e.stopImmediatePropagation();
        input.value='';
        input.style.height='auto';
      }
    }, true);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  setTimeout(install,500);
  setTimeout(install,1500);
})();
