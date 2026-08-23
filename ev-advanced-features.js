/* E.V. advanced features — local notes, context reminders, browser voice, and a safe-ish timed JS worker. */
(function(){
  'use strict';
  const PREFIX='ev-advanced-';
  const $=id=>document.getElementById(id);
  const load=(k,d)=>{try{const v=localStorage.getItem(PREFIX+k);return v===null?d:JSON.parse(v)}catch(_){return d}};
  const save=(k,v)=>{try{localStorage.setItem(PREFIX+k,JSON.stringify(v))}catch(_){} };
  const row=(role,text)=>{try{return typeof addRow==='function'?addRow(role,text):null}catch(_){return null}};
  const say=text=>{row('ev',text);try{if(typeof speak==='function')speak(text)}catch(_){} };

  let notes=load('notes',[]);
  let reminders=load('reminders',[]);
  let pendingReminder=null;

  function clean(s){return String(s||'').trim().replace(/\s+/g,' ')}
  function saveAll(){save('notes',notes);save('reminders',reminders)}

  function noteAdd(title,body){
    const n={id:Date.now().toString(36),title:clean(title)||'Untitled note',body:clean(body),created:new Date().toISOString()};
    notes.unshift(n); notes=notes.slice(0,100); saveAll();
    say(`Saved a note: ${n.title}. I’ll keep it here locally on this device.`);
  }
  function noteSearch(q){
    q=clean(q).toLowerCase();
    const hits=notes.filter(n=>(n.title+' '+n.body).toLowerCase().includes(q)).slice(0,5);
    if(!hits.length){say(`I couldn't find a saved note matching “${q}.”`);return}
    say(hits.map((n,i)=>`${i+1}. ${n.title}${n.body?` — ${n.body}`:''}`).join('\n'));
  }
  function noteList(){
    if(!notes.length){say('Your local note store is empty. Say “E.V., note: …” to save one.');return}
    say(notes.slice(0,10).map((n,i)=>`${i+1}. ${n.title}${n.body?` — ${n.body}`:''}`).join('\n'));
  }
  function noteClear(){notes=[];saveAll();say('Local notes cleared from this device.')}

  function parseWhen(text){
    const now=new Date();
    let m=text.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)\b/i);
    if(m){const n=Number(m[1]);const u=m[2].toLowerCase();const mult=u.startsWith('day')?86400000:u.startsWith('hour')||u.startsWith('hr')?3600000:60000;return new Date(Date.now()+n*mult)}
    m=text.match(/\b(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
    if(m){const names=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];let d=new Date();let target=names.indexOf(m[1].toLowerCase());let delta=(target-d.getDay()+7)%7;if(delta===0)delta=7;d.setDate(d.getDate()+delta);let h=Number(m[2]||9),min=Number(m[3]||0),ap=(m[4]||'').toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;d.setHours(h,min,0,0);return d}
    m=text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if(m){let h=Number(m[1]),min=Number(m[2]||0),ap=m[3].toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;let d=new Date();d.setHours(h,min,0,0);if(d<=Date.now())d.setDate(d.getDate()+1);return d}
    return null;
  }
  function scheduleReminder(title,when,source='manual'){
    const d=when instanceof Date?when:new Date(when); if(Number.isNaN(d.getTime()))throw new Error('I could not understand that reminder time.');
    const r={id:Date.now().toString(36),title:clean(title),when:d.toISOString(),source}; reminders.push(r); saveAll();
    const delay=Math.max(0,d.getTime()-Date.now());
    setTimeout(()=>{
      say(`Reminder: ${r.title}.`);
      try{if('Notification' in window && Notification.permission==='granted')new Notification('E.V. reminder',{body:r.title})}catch(_){}
    },delay);
    say(`Reminder set for ${d.toLocaleString()}: ${r.title}`);
  }
  function listReminders(){
    const future=reminders.filter(r=>new Date(r.when)>new Date()).sort((a,b)=>new Date(a.when)-new Date(b.when)).slice(0,10);
    if(!future.length){say('You have no upcoming local reminders.');return}
    say(future.map((r,i)=>`${i+1}. ${new Date(r.when).toLocaleString()} — ${r.title}`).join('\n'));
  }

  function deadlineCandidate(text){
    const t=clean(text);
    if(!/(deadline|due|due date|submit|submission|finish|science fair|project|test|exam|appointment)/i.test(t))return null;
    const when=parseWhen(t); if(!when)return null;
    const title=t.replace(/^.*?(deadline|due|submit|submission|finish|project|test|exam|appointment)\s*[:\-]?\s*/i,'').slice(0,100)||t.slice(0,100);
    return {title,when};
  }
  function maybeSuggestReminder(text){
    const c=deadlineCandidate(text); if(!c)return;
    pendingReminder=c;
    say(`I noticed a possible deadline: “${c.title}” around ${c.when.toLocaleString()}. Should I set a reminder? Say “yes, set it” or “no.”`);
  }

  function speakText(text){
    if(!('speechSynthesis' in window)){say('Your browser does not provide speech synthesis.');return}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean(text));u.rate=.95;u.pitch=1.02;
    const voices=speechSynthesis.getVoices(); const preferred=voices.find(v=>/Samantha|Karen|Moira|Daniel|English/i.test(v.name)); if(preferred)u.voice=preferred;
    speechSynthesis.speak(u); say('Voice mode is reading that now.');
  }

  function runJS(code){
    code=String(code||'').trim(); if(!code){say('Give me JavaScript after !run.');return}
    const workerCode=`self.onmessage=async e=>{try{const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;const fn=new AsyncFunction('"use strict";','return ('+e.data+'\n)');const v=await fn();self.postMessage({ok:true,value:v===undefined?'undefined':String(v)})}catch(err){self.postMessage({ok:false,error:String(err&&err.message||err)})}};`;
    const blob=new Blob([workerCode],{type:'application/javascript'}),url=URL.createObjectURL(blob),w=new Worker(url);let done=false;
    const finish=(msg)=>{if(done)return;done=true;try{w.terminate()}catch(_){}URL.revokeObjectURL(url);say(msg)};
    w.onmessage=e=>e.data.ok?finish(`Sandbox result: ${e.data.value}`):finish(`Sandbox error: ${e.data.error}`);
    w.onerror=e=>finish(`Sandbox error: ${e.message||'worker error'}`);
    w.postMessage(code);setTimeout(()=>finish('Sandbox stopped after 3 seconds to prevent a runaway script.'),3000);
  }

  async function command(text){
    const raw=clean(text),q=raw.replace(/^ev[,:\s-]+/i,'').trim();
    let m=q.match(/^note(?:\s+this)?\s*[:\-]\s*(.+)$/i);if(m){const parts=m[1].split(/\s+--\s+/,2);noteAdd(parts[0],parts[1]||'');return true}
    m=q.match(/^save (?:a )?note\s*[:\-]\s*(.+)$/i);if(m){noteAdd(m[1],'');return true}
    m=q.match(/^(?:find|search|what(?:'s| is)) (?:in )?(?:my )?notes?\s*(?:for\s+)?(.+)$/i);if(m){noteSearch(m[1]);return true}
    if(/^list (?:my )?notes?$/i.test(q)){noteList();return true}
    if(/^clear (?:my )?notes?$/i.test(q)){noteClear();return true}
    m=q.match(/^remind me (?:to\s+)?(.+?)\s+(in\s+\d+\s*(?:minutes?|mins?|hours?|hrs?|days?)|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+[^ ]+)?|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))$/i);if(m){const d=parseWhen(m[2]);if(d)scheduleReminder(m[1],d);else say('Tell me a time like “in 30 minutes” or “next Thursday at 4 PM.”');return true}
    if(/^list (?:my )?reminders?$/i.test(q)){listReminders();return true}
    if(/^(?:yes|yes,? set it|set it)$/i.test(q)&&pendingReminder){const p=pendingReminder;pendingReminder=null;scheduleReminder(p.title,p.when,'context');return true}
    if(/^(?:no|no thanks|don't set it)$/i.test(q)&&pendingReminder){pendingReminder=null;say('Okay — I won’t set that reminder.');return true}
    if(/^voice(?: mode)?\s+(?:on|start|read)\s*[:\-]?\s*(.*)$/i.test(q)){const m2=q.match(/^voice(?: mode)?\s+(?:on|start|read)\s*[:\-]?\s*(.*)$/i);speakText(m2[1]||'Voice mode is ready.');return true}
    if(/^read(?: this| that)?(?:\s*[:\-]\s*)(.+)$/i.test(q)){speakText(q.match(/^read(?: this| that)?(?:\s*[:\-]\s*)(.+)$/i)[1]);return true}
    if(/^!run\s+/.test(q)){runJS(q.slice(5));return true}
    return false;
  }

  const form=$('composer'),input=$('input');
  if(form&&input){
    form.addEventListener('submit',async e=>{
      const text=input.value.trim();if(!text)return;
      if(/^!run\s+/i.test(text)||/^(?:ev[,:\s-]+)?(?:note|save (?:a )?note|find .*notes?|search .*notes?|list .*notes?|clear .*notes?|remind me\b|list .*reminders?|yes,? set it|set it|no thanks|don't set it|voice(?: mode)?\s+(?:on|start|read)|read(?: this| that)?\s*:)/i.test(text)){
        e.preventDefault();e.stopImmediatePropagation();row('user',text);input.value='';input.style.height='auto';try{await command(text)}catch(err){say(err.message||'That command failed.')}return;
      }
      // Non-command messages continue through E.V.'s normal brain; also watch for obvious deadlines.
      setTimeout(()=>maybeSuggestReminder(text),250);
    },true);
  }

  // Restore reminder timers after a page reload.
  reminders.forEach(r=>{const d=new Date(r.when);if(d>new Date())setTimeout(()=>{say(`Reminder: ${r.title}.`);try{if('Notification'in window&&Notification.permission==='granted')new Notification('E.V. reminder',{body:r.title})}catch(_){}},Math.max(0,d-Date.now()))});

  window.EVAdvanced={notes:()=>notes,reminders:()=>reminders,noteAdd,noteSearch,scheduleReminder,runJS,speakText};
})();
