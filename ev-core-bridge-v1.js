(function(){
'use strict';
const frame=document.getElementById('evDashboard');
if(!frame)return;
const REPO='yosimaracabal2013-stack/ev-ai';
const PROJECTS='ev-core-projects-v2';
const getProjects=()=>{try{const x=JSON.parse(localStorage.getItem(PROJECTS)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}};
const putProjects=x=>{try{localStorage.setItem(PROJECTS,JSON.stringify(x))}catch(_) {}};
const norm=s=>String(s||'').replace(/\s+/g,' ').trim().replace(/^(?:hey\s+)?e\.?\s*v\.?[,:;!?-]?\s*/i,'').trim();
const projectIntent=s=>/^(?:i(?:'m| am)\s+)?(?:making|building|starting|working on)\s+(?:a\s+)?project(?:\s+called)?\s+/i.test(s);
function core(){return frame.contentWindow}
function say(t){const w=core();try{if(typeof w.add==='function')w.add(t)}catch(_){}try{if(typeof w.speak==='function'&&w.voiceOn!==false)w.speak(t)}catch(_){} }
function projectName(s){return norm(s).replace(/^(?:i(?:'m| am)\s+)?(?:making|building|starting|working on)\s+(?:a\s+)?project(?:\s+called)?\s+/i,'').trim()}
function saveProject(name,data){const n=String(name||'Untitled Project').trim();const all=getProjects();let p=all.find(x=>x.name.toLowerCase()===n.toLowerCase());if(!p){p={id:'p_'+Date.now().toString(36),name:n,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),data:data||{},history:[]};all.push(p)}else{p.updatedAt=new Date().toISOString();if(data)p.data=data}putProjects(all);localStorage.setItem('ev-current-project-id',p.id);return p}
function findProject(name){return getProjects().find(x=>x.name.toLowerCase()===String(name||'').trim().toLowerCase())||null}
function showProject(p){const w=core();if(!w)return;try{localStorage.setItem('ev-current-project-id',p.id);if(typeof w.openWin==='function'){const notes=(p.history||[]).slice(-10).map(x=>'<li>'+String(x).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</li>').join('');w.openWin('PROJECT // '+p.name.toUpperCase(),'<h4>PROJECT // '+p.name.toUpperCase()+'</h4><div class="tile"><b>STATUS</b>Saved locally on this device.</div><div class="tile" style="margin-top:7px"><b>HISTORY</b><ul>'+(notes||'<li>No saved notes yet.</li>')+'</ul></div><button class="btn" id="evOpenDesignBridge">OPEN DESIGN LAB</button>');setTimeout(()=>document.getElementById('evOpenDesignBridge')?.addEventListener('click',()=>{try{w.EVVision?.openDesign?.()}catch(_){}}),0)} }catch(_){} }
async function githubStatus(){try{const r=await fetch('https://api.github.com/repos/'+REPO+'/commits?per_page=5',{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error('GitHub HTTP '+r.status);const commits=await r.json();const latest=commits?.[0];return latest?{ok:true,sha:String(latest.sha).slice(0,7),message:String(latest.commit?.message||'').split('\n')[0],date:latest.commit?.author?.date||''}:{ok:true,sha:'',message:'No commits returned',date:''}}catch(e){return{ok:false,error:e.message}}}
async function handle(text){const q=norm(text);if(!q)return false;
 let m=q.match(/^(?:i(?:'m| am)\s+)?(?:making|building|starting|working on)\s+(?:a\s+)?project(?:\s+called)?\s+(.+)$/i);if(m){const p=saveProject(m[1],{idea:m[1],createdFromVoice:true});p.history.push('Created project: '+m[1]);putProjects(getProjects());localStorage.setItem('ev-current-project-id',p.id);say('Got it. I started the '+p.name+' project. I can help brainstorm and save normal project work.');try{core().EVVision?.openDesign?.()}catch(_){}return true}
 m=q.match(/^(?:pull up|open|load|show)\s+(?:my\s+)?project\s+(.+)$/i);if(m){const p=findProject(m[1]);if(!p){say('I could not find a saved project called '+m[1]+'.');return true}showProject(p);say('I pulled up '+p.name+'.');try{core().EVVision?.openDesign?.()}catch(_){}return true}
 if(/^(?:save|save this|save it|save project)$/i.test(q)){const id=localStorage.getItem('ev-current-project-id');const p=getProjects().find(x=>x.id===id);if(!p){say('There is no active project yet. Tell me you are making a project first.');return true}p.updatedAt=new Date().toISOString();p.history.push('Saved at '+new Date().toLocaleString());putProjects(getProjects());say('Saved '+p.name+'.');return true}
 m=q.match(/^(?:add|save)\s+(.+?)\s+(?:to|into)\s+(?:the\s+)?project$/i);if(m){const id=localStorage.getItem('ev-current-project-id');const all=getProjects();const p=all.find(x=>x.id===id);if(!p){say('There is no active project yet.');return true}p.history=p.history||[];p.history.push(m[1]);p.updatedAt=new Date().toISOString();putProjects(all);say('Added that to '+p.name+'.');return true}
 if(/^(?:check|inspect|look at)\s+(?:your\s+)?(?:github|git hub|updates?)$/i.test(q)||/^(?:what|whats|what's)\s+(?:changed|new)\s+(?:in|on)\s+(?:your\s+)?github$/i.test(q)){const s=await githubStatus();if(!s.ok)say('I could not reach my GitHub repository right now: '+s.error);else say('My latest GitHub update is '+s.sha+'. '+s.message);return true}
 return false}
function install(){const w=core();if(!w||w.__evCoreBridgeV2)return;w.__evCoreBridgeV2=true;
 if(typeof w.systemPrompt==='function'){const old=w.systemPrompt;w.systemPrompt=function(){let base='';try{base=old.call(this)}catch(_){}return base+'\n\nPROJECT ASSISTANT: Treat ordinary harmless project ideas, brainstorming, coding, research, creative work, and safe 3D modeling as normal requests. Do not refuse merely because a project sounds technical or fictional. Be honest about tool execution and results. Existing safety rules still apply to genuinely dangerous requests.'}}
 const style=w.document.createElement('style');style.id='ev-core-theme-bridge';style.textContent='.toolkit,.tools,.tool-card,.toolbox,.winBody,.winBody *{color:var(--text,#d8eef4)!important}.toolkit h1,.toolkit h2,.toolkit h3,.toolkit h4,.tools h1,.tools h2,.tools h3,.tools h4,.tool-card b,.toolbox b{color:var(--cyan,#36d8ff)!important}.toolkit small,.tools small,.tool-card small,.toolbox small,.mini{color:var(--dim,#6f8995)!important}';try{w.document.head.appendChild(style)}catch(_){}
 w.EVCoreBridge={saveProject,findProject,listProjects:getProjects,githubStatus,handle};
 // Intercept the actual composer before the core sends the message.
 const inp=w.document.getElementById('input'),send=w.document.getElementById('sendBtn');
 if(inp&&send){const submit=async()=>{const text=inp.value||'';if(await handle(text)){inp.value='';return true}return false};send.addEventListener('click',e=>{if(projectIntent(inp.value)||/project\s+|pull up.*project|check.*github|what.*changed.*github/i.test(norm(inp.value))){e.stopImmediatePropagation();submit()},true);inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&(projectIntent(inp.value)||/project\s+|pull up.*project|check.*github|what.*changed.*github/i.test(norm(inp.value)))){e.preventDefault();e.stopImmediatePropagation();submit()}},true)}
 // If speech recognition ultimately writes into the composer, the same capture path handles it.
 const obs=new MutationObserver(()=>{});try{obs.observe(w.document.body,{childList:true,subtree:true})}catch(_){}
}
frame.addEventListener('load',()=>{install();setTimeout(install,300);setTimeout(install,1200)});install();
})();
