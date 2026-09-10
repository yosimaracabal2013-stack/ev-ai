/* E.V. Reminders v1 — local reminders + push-ready subscription plumbing.
   Local timers work while the web app is running. True closed-phone reminders require PUSH_ENDPOINT/VAPID backend configuration.
*/
(function(){
'use strict';
const frame=document.getElementById('evDashboard');if(!frame)return;
const STORAGE='ev-reminders-v1',VAPID_PUBLIC_KEY='';
const get=()=>frame.contentWindow;
function load(){try{return JSON.parse(get().localStorage.getItem(STORAGE)||'[]')}catch(_){return[]}}
function save(a){try{get().localStorage.setItem(STORAGE,JSON.stringify(a))}catch(_) {}}
function addMsg(t){try{get().add(t)}catch(_) {}}
function say(t){try{if(get().voiceOn&&typeof get().speak==='function')get().speak(t)}catch(_) {}}
function b64ToBytes(base64){const pad='='.repeat((4-base64.length%4)%4),s=(base64+pad).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(s);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function setupPush(){
 const w=get();if(!('serviceWorker' in w.navigator)||!('PushManager' in w)||!('Notification' in w))throw Error('This browser does not support the required push APIs here.');
 if(w.Notification.permission!=='granted'){const p=await w.Notification.requestPermission();if(p!=='granted')throw Error('Notification permission was not granted.');}
 const reg=await w.navigator.serviceWorker.register('./ev-sw.js');await reg.update();
 if(!VAPID_PUBLIC_KEY)throw Error('E.V. push is ready on this device, but the server key is not connected yet.');
 let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(VAPID_PUBLIC_KEY)});
 const endpoint=window.EV_PUSH_ENDPOINT||'';if(!endpoint)throw Error('The E.V. push server endpoint is not connected yet.');
 const r=await w.fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON()})});if(!r.ok)throw Error('The push server rejected the subscription.');return sub;
}
function parse(text){
 const t=String(text||'').trim(),low=t.toLowerCase();
 let m=low.match(/remind me in\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/);if(m){const n=Number(m[1]),unit=m[2],ms=/hour|hr/.test(unit)?n*3600000:/second|sec/.test(unit)?n*1000:n*60000;const idx=low.indexOf(m[0]);let task=t.slice(idx+m[0].length).replace(/^\s*(to|that)\s*/i,'').trim();if(task)return{task,when:Date.now()+ms}}
 m=low.match(/remind me\s+(?:at|around)\s+((?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm))/);if(m){let [h,mi]=m[1].replace(/\s/g,'').split(':');const ampm=h.slice(-2),hour=Number(h.slice(0,-2));mi=Number(mi||0);let hh=hour%12+(ampm==='pm'?12:0);const d=new Date();d.setHours(hh,mi,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);let task=t.slice(low.indexOf(m[0])+m[0].length).replace(/^\s*(to|that)\s*/i,'').trim();if(task)return{task,when:d.getTime()}}
 return null;
}
function schedule(rem){const a=load();const item={id:crypto.randomUUID?.()||String(Date.now()),task:rem.task,when:rem.when,done:false};a.push(item);save(a);const delay=Math.max(0,rem.when-Date.now());setTimeout(()=>fire(item.id),delay);return item}
function fire(id){const a=load(),i=a.findIndex(x=>x.id===id&&!x.done);if(i<0)return;const item=a[i];a[i].done=true;save(a);const body='Hey Yoshi — '+item.task;try{if(get().Notification?.permission==='granted')new get().Notification('E.V. // Reminder',{body,tag:'ev-reminder-'+id})}catch(_){}addMsg('Reminder: '+item.task);say('Hey Yoshi. Reminder: '+item.task)}
function restore(){for(const r of load())if(!r.done&&r.when>Date.now())setTimeout(()=>fire(r.id),Math.max(0,r.when-Date.now()))}
async function command(text){
 const t=String(text||'').trim(),low=t.toLowerCase();
 if(/\b(enable|turn on|activate|allow)\b.*\bnotifications?\b/.test(low)){try{await setupPush();addMsg('Phone notifications are connected for E.V. on this device.');say('Phone notifications are connected.');}catch(e){addMsg('Notification setup: '+e.message);say('I can set up the notification permission, but the background push server still needs to be connected.')}return true}
 if(/\b(reminders?|remind me)\b/.test(low)){const rem=parse(t);if(rem){const item=schedule(rem);const d=new Date(item.when);const when=d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});addMsg('Got it. I will remind you '+when+': '+item.task);say('Got it. I will remind you '+when+'.');}else if(/\b(list|show)\b/.test(low)){const pending=load().filter(x=>!x.done&&x.when>Date.now());addMsg(pending.length?pending.map((x,i)=>(i+1)+'. '+x.task+' — '+new Date(x.when).toLocaleString()).join('\n'):'You have no pending reminders.')}else addMsg('Try “remind me in 20 minutes to get ready” or “remind me at 10 PM to go to bed.”');return true}
 return false;
}
function hook(){const w=get();if(!w||w.__evReminderHook)return;w.__evReminderHook=true;const i=w.document.getElementById('input'),b=w.document.getElementById('sendBtn');if(!i)return;const inspect=()=>{const t=(i.value||'').trim();if(!t)return;command(t).then(ok=>{if(ok){i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))}})};b?.addEventListener('click',inspect,true);i.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey)setTimeout(inspect,0)},true);window.EVReminders={command,setupPush,list:load,schedule};restore()}
frame.addEventListener('load',()=>setTimeout(hook,250));setTimeout(hook,900);setTimeout(hook,2200);
})();
