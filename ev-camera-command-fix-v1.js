(function(){
'use strict';
const frame=()=>document.getElementById('evDashboard');
const getWin=()=>{const f=frame();return f&&f.contentWindow};
function clean(s){return String(s||'').replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim().replace(/^(hey\s+)?e\.?\s*v\.?\s*/i,'').trim().toLowerCase()}
function isOpenCamera(s){const q=clean(s);return /^(open|show|start|launch|turn on|enable) (the )?(live )?camera$/.test(q)||q==='camera'||q==='open live vision'||q==='open vision'}
function isCloseCamera(s){const q=clean(s);return /^(close|stop|turn off|disable) (the )?(live )?camera$/.test(q)}
function isFlipCamera(s){const q=clean(s);return /^(flip|switch|change) (the )?(camera|camera view|camera side|camera direction)$/.test(q)||q==='flip camera'}
function run(text){const w=getWin();if(!w)return false;if(isOpenCamera(text)){try{w.EVVision?.openCamera?.();return true}catch(e){try{w.add?.('I could not open the live vision camera: '+(e.message||'camera error')+'.')}catch(_){}return true}}if(isCloseCamera(text)){try{w.EVVision?.closeCamera?.();return true}catch(_){return true}}if(isFlipCamera(text)){try{const b=w.document.querySelector('.evFlipCamera');if(b){b.click();return true}w.add?.('The live camera is not open yet.');return true}catch(_){return true}}return false}
function hook(){const f=frame();if(!f)return;const w=f.contentWindow,d=f.contentDocument;if(!w||!d||w.__evCameraCommandFixV1)return;w.__evCameraCommandFixV1=true;
 d.addEventListener('click',function(e){const t=e.target;if(!t)return;const id=t.id||'';if(id!=='sendBtn')return;const input=d.getElementById('input');if(run(input?.value||'')){e.preventDefault();e.stopImmediatePropagation();if(input)input.value=''}},true);
 d.addEventListener('keydown',function(e){if(e.key!=='Enter')return;const t=e.target;if(!t||t.id!=='input')return;if(run(t.value||'')){e.preventDefault();e.stopImmediatePropagation();t.value=''}},true);
 const originalSend=w.sendMessage;if(typeof originalSend==='function'&&!originalSend.__evCameraCommandWrapped){const wrapped=function(text){if(run(text))return Promise.resolve();return originalSend.apply(this,arguments)};wrapped.__evCameraCommandWrapped=true;w.sendMessage=wrapped}
 const originalCommand=w.command;if(typeof originalCommand==='function'&&!originalCommand.__evCameraCommandWrapped){const wrappedCommand=function(text){if(run(text))return true;return originalCommand.apply(this,arguments)};wrappedCommand.__evCameraCommandWrapped=true;w.command=wrappedCommand}
}
frame()?.addEventListener('load',()=>{hook();setTimeout(hook,500);setTimeout(hook,1500)});hook();setTimeout(hook,500);setTimeout(hook,1500);
})();
