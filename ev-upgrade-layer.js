/* E.V. CORE UPGRADE LAYER v1
   Structured local memory, continuity, observation and safe action-awareness.
*/
(function(){
'use strict';
const KEY='ev-core-memory-v1', originalFetch=window.fetch.bind(window);
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{"facts":[],"preferences":[],"projects":[],"tasks":[]}')}catch(_){return {facts:[],preferences:[],projects:[],tasks:[]}}};
const write=x=>{try{localStorage.setItem(KEY,JSON.stringify(x))}catch(_){} };
let mem=read();
function clean(s){return String(s||'').replace(/\s+/g,' ').trim().slice(0,500)}
function add(bucket,text){text=clean(text);if(!text)return;mem[bucket]=mem[bucket]||[];if(!mem[bucket].some(x=>x.toLowerCase()===text.toLowerCase()))mem[bucket].push(text);mem[bucket]=mem[bucket].slice(-80);write(mem)}
function context(){const out=[];for(const [label,b] of [['KNOWN FACTS','facts'],['PREFERENCES','preferences'],['PROJECTS','projects'],['CURRENT TASKS','tasks']])if(mem[b]?.length)out.push(label+':\n- '+mem[b].slice(-20).join('\n- '));return out.length?'\n\nE.V. CONTINUITY MEMORY (user-provided/local only):\n'+out.join('\n'):''}
const DIRECTIVE=`\n\nE.V. CORE UPGRADE DIRECTIVE:\n- Think before answering. Prefer the smallest useful answer that moves the user's goal forward.\n- Maintain conversational continuity and resolve references such as "that", "it", "her", and "the project" from available context.\n- Observe before acting: use visible UI, screenshots, errors, and recent actions as evidence.\n- Be proactive when the next step is obvious, but do not take irreversible actions without confirmation.\n- Troubleshoot the root cause before changing unrelated code; verify changes when tools allow verification.\n- Never claim a file was changed, a site was deployed, a voice was loaded, or a device was controlled unless it actually happened.\n- Treat local memory as user-controlled notes, not hidden facts. Never invent memories.\n- Do not constantly announce capabilities. E.V. should feel present and conversational.\n`;
window.fetch=async function(input,init){try{const url=typeof input==='string'?input:(input&&input.url)||'';if(url.includes('api.groq.com/openai/v1/chat/completions')&&init?.body){const body=JSON.parse(init.body);if(Array.isArray(body.messages)&&body.messages[0]?.role==='system'){body.messages[0].content=String(body.messages[0].content||'')+DIRECTIVE+context();init={...init,body:JSON.stringify(body)}}}}catch(_){}return originalFetch(input,init)};
function say(t){try{if(typeof addRow==='function')addRow('ev',t);if(typeof speak==='function')speak(t)}catch(_){} }
function command(text){const q=clean(text);let m=q.match(/^remember(?: that)?\s+(.+)$/i);if(m){add('facts',m[1]);say('I saved that to my E.V. memory.');return true}
m=q.match(/^remember my (.+?) is\s+(.+)$/i);if(m){add('preferences',m[1]+': '+m[2]);say('Noted. I’ll keep that as a preference.');return true}
m=q.match(/^remember (?:this )?project(?: is|:)\s*(.+)$/i);if(m){add('projects',m[1]);say('I saved the project context.');return true}
m=q.match(/^remember (?:that )?i(?:\'m| am) working on\s+(.+)$/i);if(m){add('tasks',m[1]);say('I saved what you’re working on.');return true}
m=q.match(/^forget\s+(.+)$/i);if(m){const n=clean(m[1]).toLowerCase();for(const b of ['facts','preferences','projects','tasks'])mem[b]=(mem[b]||[]).filter(x=>!x.toLowerCase().includes(n));write(mem);say('Removed the matching memory.');return true}
if(/^what do you remember(?: about me)?\??$/i.test(q)){const all=[...mem.facts,...mem.preferences,...mem.projects,...mem.tasks];say(all.length?'I have these saved notes: '+all.slice(-12).join('; '):'I don’t have any saved notes yet.');return true}
if(/^clear (?:all )?memory$/i.test(q)){mem={facts:[],preferences:[],projects:[],tasks:[]};write(mem);say('Local E.V. memory cleared.');return true}return false}
const form=document.getElementById('composer'),input=document.getElementById('input');
if(form&&input)form.addEventListener('submit',e=>{const text=input.value.trim();if(!text)return;if(!/^(?:ev[,:\s-]+)?(?:remember|forget|what do you remember|clear (?:all )?memory)/i.test(text))return;e.preventDefault();e.stopImmediatePropagation();addRow('user',text);input.value='';command(text)},true);
window.EVCore={memory:()=>read(),remember:(x,b='facts')=>add(b,x),clear:()=>{mem={facts:[],preferences:[],projects:[],tasks:[]};write(mem)}};
})();
