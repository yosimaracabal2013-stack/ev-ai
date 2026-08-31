/* E.V. chat repair: keep the brain intact and bypass the broken outer bridge. */
(function(){'use strict';
const dashboard=()=>document.getElementById('ui')?.contentDocument;
const engine=()=>dashboard()?.getElementById('engine');
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
function setNativeValue(el,value){
  if(!el)return;
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
  if(setter)setter.call(el,value);else el.value=value;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}
function directSend(text){
  const e=engine();
  const d=e?.contentDocument;
  if(!d)return false;
  const input=d.querySelector('#input');
  const send=d.querySelector('#send');
  if(!input||!send)return false;
  setNativeValue(input,text);
  send.click();
  return true;
}
function install(){
  const d=dashboard();
  if(!d)return setTimeout(install,300);
  const b=d.getElementById('send');
  const i=d.getElementById('commandInput');
  if(!b||!i)return setTimeout(install,300);
  if(b.__evDirectRepair)return;
  b.__evDirectRepair=true;
  b.addEventListener('click',function(ev){
    const text=clean(i.value);
    if(!text)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    i.value='';
    const ok=directSend(text);
    if(!ok){
      const feed=d.getElementById('feed');
      if(feed){const row=d.createElement('div');row.className='msg';row.textContent='E.V. brain connection is not ready yet.';feed.appendChild(row);}
    }
  },true);
}
const ui=document.getElementById('ui');
ui?.addEventListener('load',()=>setTimeout(install,500));
setTimeout(install,1200);
window.EVChatRepair={directSend,install};
})();
