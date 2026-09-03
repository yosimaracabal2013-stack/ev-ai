/* E.V. chat repair v2: dashboard -> real inner engine bridge. */
(function(){
  'use strict';
  const dashboard=()=>document.getElementById('evDashboard');
  const engine=()=>dashboard()?.contentDocument?.getElementById('engine');
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  function setNativeValue(el,value){
    if(!el)return;
    const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
    if(setter)setter.call(el,value);else el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  async function directSend(text){
    const e=engine();
    const w=e?.contentWindow;
    const d=e?.contentDocument;
    if(!e||!w||!d)return false;
    if(typeof w.sendMessage==='function'){
      await w.sendMessage(text,null);
      return true;
    }
    const input=d.querySelector('#input');
    const send=d.querySelector('#send');
    if(!input||!send)return false;
    setNativeValue(input,text);send.click();return true;
  }
  function install(){
    const d=dashboard()?.contentDocument;
    if(!d)return setTimeout(install,300);
    const b=d.getElementById('send'),i=d.getElementById('commandInput');
    if(!b||!i)return setTimeout(install,300);
    if(b.__evDirectRepairV2)return;
    b.__evDirectRepairV2=true;
    b.addEventListener('click',function(ev){
      const text=clean(i.value);if(!text)return;
      ev.preventDefault();ev.stopImmediatePropagation();i.value='';
      directSend(text).catch(err=>console.error('E.V. direct repair failed',err));
    },true);
  }
  const ui=dashboard();
  ui?.addEventListener('load',()=>setTimeout(install,500));
  setTimeout(install,1200);
  window.EVChatRepair={directSend,install};
})();
