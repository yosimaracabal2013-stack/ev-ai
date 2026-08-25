/* E.V. Brand New Day utility + active-assistant layer.
   Character qualities are inspired by the film; dialogue/voice are not copied.
*/
(function(){
'use strict';
const w=window,doc=document;
const say=t=>{try{if(typeof w.addRow==='function')w.addRow('ev',t);if(typeof w.speak==='function')w.speak(t)}catch(_) {}};
const openSearch=q=>{const u='https://www.google.com/search?q='+encodeURIComponent(q);try{if(w.open(u,'_blank','noopener,noreferrer'))return}catch(_){};const a=doc.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open web research';a.style.cssText='display:block;margin:8px 0;padding:10px 14px;border-radius:12px;background:#20252d;color:#fff;text-decoration:none;width:max-content';try{const r=typeof w.addRow==='function'?w.addRow('ev',''):null;if(r&&r.appendChild)r.appendChild(a)}catch(_) {}};
const officialSpider='https://www.sonypictures.com/movies/spidermanbrandnewday';
const baseFetch=w.fetch.bind(w);
w.fetch=async function(url,options={}){try{const target=typeof url==='string'?url:(url&&url.url)||'';if(target.includes('api.groq.com/openai/v1/chat/completions')&&options&&typeof options.body==='string'){const p=JSON.parse(options.body);if(Array.isArray(p.messages)){const i=p.messages.findIndex(m=>m.role==='system');if(i>=0){p.messages[i].content=String(p.messages[i].content||'')+'\n\nE.V. ACTIVE ASSISTANT PROFILE:\nOperate as a calm, observant mission-support AI. Prioritize useful actions over generic conversation. Give concise status updates, notice inconsistencies, analyze visible evidence, research current information when needed, and route visual requests to the visual engine. Be warm but restrained. Never claim fictional sensors or capabilities that the webpage does not actually have. Never pretend an external action succeeded when it did not.';options={...options,body:JSON.stringify(p)}}}}catch(_){}return baseFetch(url,options)};
function clean(t){return String(t||'').trim().replace(/^e\.?v\.?[,:\s-]*/i,'').trim().replace(/\s+/g,' ').toLowerCase()}
function openOfficial(url,label){try{w.open(url,'_blank','noopener,noreferrer')}catch(_){};say('Opening '+label+'.')}
async function command(text){const q=clean(text);if(!q)return false;
if(/^jarvis mode$|^activate jarvis mode$|^switch to jarvis mode$/.test(q)){say('Mission-support mode active. Calm, efficient, and ready.');return true}
if(/^ev mode$|^e\.v\. mode$|^movie ev mode$/.test(q)){say('E.V. mode active. I’m here.');return true}
if(/^command center$|^utility mode$/.test(q)){say('Command center online. Research, visual analysis, organization, and supported tools are available.');return true}
if(/^what can you do$|^what are your capabilities$|^capabilities$/.test(q)){say('I can research current information, analyze attached images, bring up supported holographic visuals, organize information, help with technical work, use supported utilities, and keep track of available memory and project context.');return true}
if(/^bring up spider\s*-?\s*man$|^show me spider\s*-?\s*man$|^bring up spiderman$|^show me spiderman$/.test(q)){if(w.EVVisual?.open){say('Bringing up the Spider-Man visual feed.');w.EVVisual.open('spider');return true}openOfficial(officialSpider,'the official Spider-Man: Brand New Day page');return true}
if(/^bring up iron\s*man$|^show me iron\s*man$/.test(q)){if(w.EVVisual?.open){say('Bringing up the Iron Man visual feed.');w.EVVisual.open('iron');return true}say('I’ll research Iron Man visual references.');openSearch('Iron Man official Marvel visual reference');return true}
if(/^official spider\s*-?\s*man$|^official brand new day$|^brand new day official$/.test(q)){openOfficial(officialSpider,'the official Spider-Man: Brand New Day page');return true}
if(/^spider\s*-?\s*man trailer$|^brand new day trailer$/.test(q)){openOfficial(officialSpider,'the official Spider-Man: Brand New Day page with trailers');return true}
let m=q.match(/^(?:research|look up|investigate|find information on|search the web|search online)(?: for)?\s+(.+)$/i);if(m){say('I’ll research '+m[1]+'.');openSearch(m[1]);return true}
m=q.match(/^who is\s+(.+)$/i);if(m){say('I’ll look that up.');openSearch(m[1]);return true}
m=q.match(/^scan\s+(.+)$/i);if(m){say('I’ll check public web information for '+m[1]+'.');openSearch(m[1]);return true}
if(/^analyze (?:this )?image$|^look at (?:this )?image$/.test(q)){say('I’ll analyze the image you attached.');return false}
if(/^diagnostics$|^run diagnostics$|^system diagnostics$/.test(q)){say('Diagnostics: E.V. core loaded. Personality layer loaded. Visual engine loaded. Web-research commands loaded. External services are checked only when a request actually uses them.');return true}
if(/^status$|^system status$/.test(q)){say('E.V. core is online. I’m ready for chat, research, visual requests, and supported tools.');return true}
if(/^quiet mode$|^be quiet$/.test(q)){try{if(w.speechSynthesis)w.speechSynthesis.cancel()}catch(_){};say('Quiet mode enabled. Text only until you ask for voice.');try{w.localStorage.setItem('ev-quiet-mode','1')}catch(_){};return true}
if(/^voice mode$|^talk to me$|^speak to me$/.test(q)){try{w.localStorage.removeItem('ev-quiet-mode')}catch(_){};say('Voice mode enabled.');return true}
return false}
const form=doc.getElementById('composer'),input=doc.getElementById('input');
if(form&&input&&!form.dataset.evMovieLayer){form.dataset.evMovieLayer='1';form.addEventListener('submit',async e=>{const t=input.value.trim();if(!/^e\.?v\.?[,:\s-]+/i.test(t))return;try{if(await command(t)){e.preventDefault();e.stopImmediatePropagation();input.value='';input.style.height='auto'}}catch(_){}},true)}
w.EVMovie={command,search:openSearch,officialSpider};
})();
