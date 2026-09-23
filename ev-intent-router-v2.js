/* E.V. Intent Router v2: route clear, low-risk UI intents to existing tools. */
(function(){'use strict';const frame=document.getElementById('evDashboard');if(!frame)return;function attach(){try{const w=frame.contentWindow;if(!w||w.__evIntentRouterV2||!w.EVCommandCenter)return;w.__evIntentRouterV2=true;const cc=w.EVCommandCenter;const routes=[
[/\b(open|bring up|show|launch|display)\b.*\b(tools?|toolkit|command center)\b/i,()=>cc.openTools()],
[/\b(open|bring up|show|launch|display)\b.*\b(voice lab|voice settings|voice engine)\b/i,()=>cc.openVoice()],
[/\b(open|bring up|show|launch|check|display)\b.*\b(system health|health panel|system status|diagnostics)\b/i,()=>cc.openSystem()],
[/\b(open|bring up|show|check|display)\b.*\b(github|my repo|repository)\b/i,()=>cc.openGitHub()],
[/\b(open|show|start|launch)\b.*\b(calculator|calc)\b/i,()=>{cc.openTools();setTimeout(()=>w.document.querySelector('[data-cc="calc"]')?.click(),180)}],
[/\b(open|show|start|launch)\b.*\b(timer|countdown)\b/i,()=>{cc.openTools();setTimeout(()=>w.document.querySelector('[data-cc="timer"]')?.click(),180)}],
[/\b(open|show|start|launch)\b.*\bstopwatch\b/i,()=>{cc.openTools();setTimeout(()=>w.document.querySelector('[data-cc="stopwatch"]')?.click(),180)}],
[/\b(open|show|start|launch)\b.*\b(unit converter|convert units)\b/i,()=>{cc.openTools();setTimeout(()=>w.document.querySelector('[data-cc="units"]')?.click(),180)}],
[/\b(open|show|start|launch)\b.*\b(world clock|world time)\b/i,()=>{cc.openTools();setTimeout(()=>w.document.querySelector('[data-cc="clock"]')?.click(),180)}],
[/\b(take|make|create|open)\s+(?:some\s+)?notes?\b/i,()=>cc.command('take notes')],
[/\b(open|show|start|launch)\b.*\b(live vision|camera|vision)\b/i,()=>{if(w.EVVision?.openCamera)w.EVVision.openCamera();else cc.command('open camera')}],
[/\b(show|open|view)\b.*\b(memory|memories)\b/i,()=>cc.command('memory')],
[/\b(show|open|view)\b.*\b(chat history|conversation history|past chats)\b/i,()=>cc.command('history')],
[/\b(show|open|view)\b.*\b(projects|my projects)\b/i,()=>cc.command('projects')]
];const old=w.sendMessage;if(typeof old!=='function')return;w.sendMessage=function(){let text='';try{text=typeof arguments[0]==='string'&&arguments[0].trim()?arguments[0]:String(w.document.getElementById('input')?.value||'')}catch(_){}const q=text.trim().replace(/^(?:hey\s+)?e\.?\s*v\.?(?:\s*[,:-])?\s*/i,'');for(const [re,run]of routes){if(re.test(q)){try{const result=run();if(result&&typeof result.then==='function')result.catch(e=>console.warn('E.V. route failed',e));if(typeof w.add==='function')w.add('Opening that now.');return true}catch(e){console.warn('E.V. route failed',e);break}}}return old.apply(this,arguments)}}catch(e){console.warn('E.V. intent router v2 attach failed',e)}}frame.addEventListener('load',()=>setTimeout(attach,400));[800,1700,3200,5200].forEach(t=>setTimeout(attach,t))})();
