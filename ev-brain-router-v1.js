(function(){
'use strict';
const PRIMARY='ev-groq-api-key',BACKUP='ev-groq-api-key-2',URL='/openai/v1/chat/completions',VERSION='1-primary-backup';
function key(w,k){try{return w.localStorage.getItem(k)||''}catch(_){return''}}
function set(w,k,v){try{w.localStorage.setItem(k,v);return true}catch(_){return false}}
function install(){const f=document.getElementById('evDashboard');if(!f||!f.contentWindow||f.contentWindow.__evBrainRouter)return;const w=f.contentWindow;const original=w.fetch?.bind(w);if(!original)return;w.__evBrainRouter=true;w.__evBrainRouterVersion=VERSION;
  function makeInit(init,k){const h=new Headers(init?.headers||{});h.set('Authorization','Bearer '+k);return {...init,headers:h}}
  function needsFallback(r){return r.status===401||r.status===403||r.status===408||r.status===429||r.status>=500}
  async function fetcher(input,init){
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    if(!raw.includes(URL)||!init)return original(input,init);
    const p=key(w,PRIMARY);let b=key(w,BACKUP);
    if(!p)return original(input,init);
    let first;
    try{first=await original(input,makeInit(init,p));if(!needsFallback(first)){w.__evBrainLast='primary';return first}}
    catch(e){first=null}
    if(!b){
      try{b=w.prompt('E.V.\'s primary Groq connection failed. If you have a second Groq API key, paste it here to use as E.V.\'s backup. Leave blank to continue without one.')||'';if(b)set(w,BACKUP,b.trim())}catch(_){}
    }
    if(b){try{const second=await original(input,makeInit(init,b));if(second.ok||!first){w.__evBrainLast='backup';return second}w.__evBrainLast='backup-failed';return second}catch(_) {}}
    w.__evBrainLast='primary-failed';
    if(first)return first;
    return new Response(JSON.stringify({error:{message:'E.V. could not reach either Groq brain.'}}),{status:503,headers:{'Content-Type':'application/json'}});
  }
  w.fetch=fetcher;
  w.EVBrain={version:VERSION,status:()=>({primary:!!key(w,PRIMARY),backup:!!key(w,BACKUP),last:w.__evBrainLast||'none'}),setBackup:k=>set(w,BACKUP,String(k||'').trim()),clearBackup:()=>{try{w.localStorage.removeItem(BACKUP)}catch(_){}},connectBackup:()=>{const k=w.prompt('Paste E.V.\'s second Groq API key. It will be stored locally on this device.');if(k)return set(w,BACKUP,k.trim());return false}};
}
const boot=()=>{install();setTimeout(install,700);setTimeout(install,2000)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();