/* E.V. Proactive v1
   Lets E.V. initiate brief, non-intrusive speech while the page is open.
   This is not consciousness: it reacts to timers, system events and inactivity.
*/
(function(){'use strict';
 const frame=document.getElementById('evDashboard');if(!frame)return;
 function attach(){try{const w=frame.contentWindow;if(!w||w.__evProactiveV1)return;w.__evProactiveV1=true;
  let lastActivity=Date.now(),lastCheck=0,lastEventCount=0,started=Date.now();
  const idleMs=5*60*1000,checkGap=15*60*1000;
  const activity=()=>{lastActivity=Date.now()};
  ['pointerdown','keydown','touchstart','input'].forEach(ev=>w.document.addEventListener(ev,activity,{passive:true}));
  function speak(t){try{if(w.voiceOn!==false&&typeof w.speak==='function')Promise.resolve(w.speak(t)).catch(()=>{});if(typeof w.add==='function')w.add(t)}catch(_) {}}
  function recentEvents(){try{const a=JSON.parse(w.localStorage.getItem('ev-system-events-v1')||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function check(){const now=Date.now();if(now-lastCheck<checkGap)return;const events=recentEvents();if(events.length>lastEventCount){const e=events[events.length-1]||{};const msg=String(e.message||e.error||e.type||'').trim();if(msg&&now-started>15000){speak('Yoshi, I noticed a system issue. I am checking it now.');lastCheck=now;lastEventCount=events.length;return}}lastEventCount=events.length;if(now-lastActivity>=idleMs&&document.visibilityState==='visible'){speak('Yoshi, you still there?');lastActivity=now;lastCheck=now}}
  setInterval(check,30000);setTimeout(check,30000);
  w.EVProactive={poke:t=>speak(String(t||'')),reset:activity};
 }catch(e){console.warn('E.V. proactive attach failed',e)}}
 frame.addEventListener('load',()=>setTimeout(attach,500));setTimeout(attach,1000);setTimeout(attach,2500);
})();
