(function(){
'use strict';
const frame=document.getElementById('evDashboard');
if(!frame)return;
const PROJECTS='ev-core-projects-v2';
const getProjects=()=>{try{const x=JSON.parse(localStorage.getItem(PROJECTS)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}};
const putProjects=x=>{try{localStorage.setItem(PROJECTS,JSON.stringify(x))}catch(_) {}};
const norm=s=>String(s||'').replace(/\s+/g,' ').trim().replace(/^(?:hey\s+)?e\.?\s*v\.?[,:;!?-]?\s*/i,'').trim();
const isProjectIdea=s=>/^(?:i(?:'m| am)\s+)?(?:making|building|starting|working on)\s+(?:a\s+)?project\b/i.test(s)||/\b(?:project idea|design idea|brainstorm)\b/i.test(s);
function bridge(){const w=frame.contentWindow;if(!w||w.__evCoreBridgeV1)return;w.__evCoreBridgeV1=true;
 // Give the actual core a clearer safe-project instruction without replacing its existing system rules.
 if(typeof w.systemPrompt==='function'){const old=w.systemPrompt;w.systemPrompt=function(){let base='';try{base=old.call(this)}catch(_){}return base+'\n\nPROJECT ASSISTANT RULE: Treat ordinary project ideas, brainstorming, research, coding, creative work, 3D modeling, home projects, and other harmless requests as allowed and help normally. Do not refuse merely because the user mentions a fictional object or a general build idea. Be honest about what tools actually executed. Keep existing safety rules for genuinely dangerous requests.'}}
 // Patch the core sender at the window boundary so project intent is preserved and saved.
 if(typeof w.sendMessage==='function'){const oldSend=w.sendMessage;w.sendMessage=function(raw){const text=String(raw||'');if(isProjectIdea(text)){try{localStorage.setItem('ev-last-project-idea',text)}catch(_){} }return oldSend.apply(this,arguments)}}
 // UI cleanup: tool panels use the same readable theme as the core.
 try{const st=w.document.createElement('style');st.id='ev-core-theme-bridge';st.textContent='.toolkit,.tools,.tool-card,.toolbox,.winBody,.winBody *{color:var(--text,#d8eef4)!important}.toolkit h1,.toolkit h2,.toolkit h3,.toolkit h4,.tools h1,.tools h2,.tools h3,.tools h4,.tool-card b,.toolbox b{color:var(--cyan,#36d8ff)!important}.toolkit small,.tools small,.tool-card small,.toolbox small,.mini{color:var(--dim,#6f8995)!important}';w.document.head.appendChild(st)}catch(_){}
 // Expose one central project API for other E.V. modules.
 w.EVCoreBridge={
  saveProject:function(name,data){const n=String(name||'Untitled Project').trim();const all=getProjects();let p=all.find(x=>x.name.toLowerCase()===n.toLowerCase());if(!p){p={id:'p_'+Date.now().toString(36),name:n,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),data:data||{},history:[]};all.push(p)}else{p.updatedAt=new Date().toISOString();if(data)p.data=data}putProjects(all);return p},
  findProject:function(name){return getProjects().find(x=>x.name.toLowerCase()===String(name||'').trim().toLowerCase())||null},
  listProjects:function(){return getProjects()}
 };
}
frame.addEventListener('load',()=>{bridge();setTimeout(bridge,300);setTimeout(bridge,1200)});bridge();
})();
