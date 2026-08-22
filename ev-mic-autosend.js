/* E.V. mic: tap once -> speak -> final transcript auto-sends. */
(function(){
  'use strict';
  const old = document.getElementById('micBtn');
  const form = document.getElementById('composer');
  const input = document.getElementById('input');
  if(!old || !form || !input) return;

  // Replace the old mic button so its previous click handler cannot also fire.
  const micBtn = old.cloneNode(true);
  old.replaceWith(micBtn);

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRec){
    micBtn.disabled = true;
    micBtn.title = 'Voice input is not supported in this browser';
    return;
  }

  let recognizer = null;
  let listening = false;
  let finalText = '';
  let submitted = false;
  let autoStopTimer = null;

  function resize(){
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  function resetState(){
    listening = false;
    micBtn.classList.remove('listening');
    micBtn.textContent = '●';
    if(autoStopTimer){ clearTimeout(autoStopTimer); autoStopTimer = null; }
  }

  function autoSend(){
    if(submitted) return;
    const text = String(finalText || input.value || '').trim();
    if(!text) return;
    submitted = true;
    input.value = text;
    resize();
    // Let the recognition event finish before submitting. This prevents Safari
    // from losing the final words when requestSubmit fires immediately.
    setTimeout(()=>{
      try{ form.requestSubmit(); }
      catch(_){
        const send = document.getElementById('send');
        if(send) send.click();
      }
    }, 120);
  }

  function buildRecognizer(){
    recognizer = new SpeechRec();
    recognizer.lang = 'en-US';
    recognizer.interimResults = true;
    recognizer.continuous = false;

    recognizer.onstart = ()=>{
      listening = true;
      submitted = false;
      finalText = '';
      input.value = '';
      micBtn.classList.add('listening');
      micBtn.textContent = '◉';
    };

    recognizer.onresult = (e)=>{
      let interim = '';
      let done = '';
      for(let i=0;i<e.results.length;i++){
        const piece = e.results[i][0]?.transcript || '';
        if(e.results[i].isFinal) done += piece + ' ';
        else interim += piece;
      }
      if(done.trim()) finalText += done;
      input.value = (finalText + interim).trim();
      resize();

      if(done.trim()){
        // We have the final words. Stop immediately and send automatically.
        try{ recognizer.stop(); }catch(_){}
        autoSend();
      }else{
        // If Safari doesn't emit a final result, a short silence ends the turn.
        if(autoStopTimer) clearTimeout(autoStopTimer);
        autoStopTimer = setTimeout(()=>{
          try{ recognizer.stop(); }catch(_){}
        }, 1800);
      }
    };

    recognizer.onerror = (e)=>{
      if(e.error === 'not-allowed' || e.error === 'service-not-allowed'){
        if(typeof window.addRow === 'function') window.addRow('ev', "I can't access the microphone here. Check Safari's microphone permission for E.V.");
      }else if(e.error !== 'no-speech' && e.error !== 'aborted'){
        if(typeof window.addRow === 'function') window.addRow('ev', 'The mic had a hiccup. Tap it and try again.');
      }
      resetState();
    };

    recognizer.onend = ()=>{
      if(autoStopTimer){ clearTimeout(autoStopTimer); autoStopTimer = null; }
      const hadWords = String(finalText || input.value || '').trim();
      resetState();
      // If Safari ended from silence without an onresult-final event, still send.
      if(hadWords && !submitted) autoSend();
    };
  }

  buildRecognizer();

  micBtn.addEventListener('click', ()=>{
    if(listening){
      try{ recognizer.stop(); }catch(_){}
      return;
    }
    submitted = false;
    finalText = '';
    try{
      recognizer.start();
    }catch(_){
      // Recognition can throw if Safari thinks a session is already active.
      try{ recognizer.abort(); }catch(__){}
      setTimeout(()=>{ try{ recognizer.start(); }catch(__){} }, 150);
    }
  });
})();
