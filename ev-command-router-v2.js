(function(){
'use strict';
const frame=()=>document.getElementById('evDashboard');
const win=()=>{const f=frame();return f&&f.contentWindow};
function speak(w,t){try{w.speechSynthesis.cancel();const u=new w.SpeechSynthesisUtterance(t);u.rate=.98;u.pitch=1.04;w.speechSynthesis.speak(u)}catch(_) {}}
function reply(w,t){try{const d=w.document.createElement('div');d.className='msg';d.textContent=t;const f=w.document.getElementById('feed');if(f){f.appendChild(d);while(f.children.length>7)f.firstElementChild.remove();f.scrollTop=f.scrollHeight}}catch(_) {}}
function go(w,url,text){reply(w,text);speak(w,text);try{window.location.href=url;return true}catch(_){}try{w.parent.location.href=url;return true}catch(_){}return false}
function clean(s){return String(s||'').replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim().replace(/^(hey\s+)?e\.?\s*v\.?\s*/i,'').trim()}
function route(text,w){const q=clean(text);let m;
  m=q.match(/^(?:open|launch|start|go to|pull up)\s+youtube\s+(?:and\s+)?(?:search|find|look up)\s+(?:for\s+)?(.+)$/);if(m)return go(w,'https://www.youtube.com/results?search_query='+encodeURIComponent(m[1]),'Opening YouTube and searching for '+m[1]+'.');
  m=q.match(/^(?:search|find|look up)\s+(?:for\s+)?(.+?)\s+(?:on|in)\s+youtube$/);if(m)return go(w,'https://www.youtube.com/results?search_query='+encodeURIComponent(m[1]),'Opening YouTube and searching for '+m[1]+'.');
  m=q.match(/^(?:open|launch|start|go to|pull up)\s+youtube\s+(?:and\s+)?(?:play|watch|show)\s+(?:me\s+)?(.+)$/);if(m)return go(w,'https://www.youtube.com/results?search_query='+encodeURIComponent(m[1]),'Opening YouTube and looking for '+m[1]+'.');
  m=q.match(/^(?:play|watch|show)\s+(?:me\s+)?(.+?)\s+(?:on|in)\s+youtube$/);if(m)return go(w,'https://www.youtube.com/results?search_query='+encodeURIComponent(m[1]),'Opening YouTube and looking for '+m[1]+'.');
  if(/^(?:open|launch|start|go to|pull up)\s+youtube$/.test(q)||q==='youtube')return go(w,'https://www.youtube.com/','Opening YouTube.');
  m=q.match(/^(?:open|launch|start|go to|pull up)\s+google\s+(?:and\s+)?(?:search|find|look up)\s+(?:for\s+)?(.+)$/);if(m)return go(w,'https://www.google.com/search?q='+encodeURIComponent(m[1]),'Searching Google for '+m[1]+'.');
  m=q.match(/^(?:search|find|look up)\s+(?:for\s+)?(.+?)\s+(?:on|in)\s+google$/);if(m)return go(w,'https://www.google.com/search?q='+encodeURIComponent(m[1]),'Searching Google for '+m[1]+'.');
  m=q.match(/^google\s+(.+)$/);if(m)return go(w,'https://www.google.com/search?q='+encodeURIComponent(m[1]),'Searching Google for '+m[1]+'.');
  return false;
}
function hook(){const f=frame();if(!f)return;const w=f.contentWindow,d=f.contentDocument;if(!w||!d||w.__evCommandRouterV2)return;w.__evCommandRouterV2=true;const i=d.getElementById('input'),b=d.getElementById('sendBtn');if(!i)return;let busy=false;function run(e){if(busy)return;const t=(i.value||'').trim();if(!t)return;if(route(t,w)){busy=true;if(e){e.preventDefault();e.stopImmediatePropagation()}i.value='';w.setTimeout(()=>busy=false,800)}}if(b)b.addEventListener('click',run,true);i.addEventListener('keydown',e=>{if(e.key==='Enter')run(e)},true);const form=d.querySelector('form');if(form)form.addEventListener('submit',run,true)}
const boot=()=>{hook();setTimeout(hook,700);setTimeout(hook,1800)};frame()?.addEventListener('load',boot);boot();
})();
