(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');
  if(!frame)return;
  function repair(){
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      if(!doc.getElementById('evUiRepairV1')){
        const style=doc.createElement('style');
        style.id='evUiRepairV1';
        style.textContent=`
          /* E.V. UI repair: native <button> styling was making tool tiles white. */
          button.winLink{
            appearance:none!important;
            -webkit-appearance:none!important;
            display:block!important;
            width:100%!important;
            min-height:58px!important;
            border:1px solid var(--line)!important;
            border-radius:7px!important;
            padding:9px!important;
            margin:0!important;
            background:rgba(4,20,28,.72)!important;
            color:var(--text)!important;
            font:inherit!important;
            font-size:8px!important;
            line-height:1.45!important;
            text-align:left!important;
            cursor:pointer!important;
            box-shadow:none!important;
          }
          button.winLink:hover,button.winLink:focus-visible{
            border-color:var(--cyan)!important;
            color:var(--text)!important;
            outline:none!important;
          }
          button.winLink:active{transform:translateY(1px)}
          @media(max-width:700px){
            .floatWindow{width:min(390px,calc(100vw - 14px))!important;max-width:calc(100vw - 14px)!important;}
            .winBody{padding:10px!important;}
            .grid2{gap:6px!important;}
          }
        `;
        doc.head.appendChild(style);
      }
      // Repair any stale native button styles immediately.
      doc.querySelectorAll('button.winLink').forEach(function(b){
        b.style.background='rgba(4,20,28,.72)';
        b.style.color='var(--text)';
        b.style.webkitAppearance='none';
        b.style.appearance='none';
      });
    }catch(e){console.warn('E.V. UI repair could not attach',e)}
  }
  frame.addEventListener('load',repair);
  setTimeout(repair,50);
  setTimeout(repair,500);
})();
