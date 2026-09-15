(function(){'use strict';
const KEY='ev-github-awareness-v1';
const state={repo:'yosimaracabal2013-stack/ev-ai',branch:'main',lastCheck:null,status:'unknown'};
function load(){try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(_){} }
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){} }
function say(t){try{const f=document.getElementById('evDashboard');const w=f?.contentWindow;if(w?.add)w.add(t);if(w?.voiceOn&&w?.speak)w.speak(t)}catch(_){} }
async function check(){try{const r=await fetch('https://api.github.com/repos/'+state.repo+'/commits/'+state.branch,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error('GitHub returned '+r.status);const d=await r.json();state.lastCheck=d.commit?.sha||null;state.status='ok';state.lastMessage=d.commit?.message||'';state.lastDate=d.commit?.author?.date||null;save();return d}catch(e){state.status='error';state.error=String(e.message||e);save();return null}}
function route(text){const q=String(text||'').replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim().replace(/^(hey\s+)?e\.?\s*v\.?\s*/i,'').trim().toLowerCase();
 if(/^(check|look at|inspect) (your|the) (github|github code|code|updates)$/.test(q)||/^check github$/.test(q)){check().then(d=>{if(d)say('I checked my GitHub. My latest commit is '+(d.commit?.message||'an update')+'.');else say('I couldn’t reach my GitHub repository right now.')});return true}
 if(/^(what changed|what was updated|what did you update)$/.test(q)){check().then(d=>{if(d)say('My latest GitHub update was: '+(d.commit?.message||'an update')+'.');else say('I couldn’t check the repository right now.')});return true}
 if(/^github status$/.test(q)){check().then(d=>say(d?'GitHub is reachable and I can see the repository history.':'I can’t reach GitHub right now.'));return true}
 return false;
}
function patch(){const f=document.getElementById('evDashboard');const w=f?.contentWindow;if(!w||w.__evGitHubAwareness)return;w.__evGitHubAwareness=true;const old=w.sendMessage;if(typeof old==='function')w.sendMessage=function(t){if(route(t))return Promise.resolve();return old.call(w,t)};w.EVGithub={check,route,state};check();}
load();const f=document.getElementById('evDashboard');f?.addEventListener('load',()=>{patch();setTimeout(patch,500);setTimeout(patch,1500)});setTimeout(patch,800);
})();
