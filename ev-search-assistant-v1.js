(function(){
  'use strict';
  const frame=document.getElementById('evDashboard');if(!frame)return;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  function patch(){try{const w=frame.contentWindow;if(!w||w.__evSearchAssistantV1)return;w.__evSearchAssistantV1=true;
    function add(t){try{w.add(t)}catch(_){}
    }
    function link(title,url){try{const box=w.openWin?.('WEB SEARCH', '<h4>'+title+'</h4><a class="winLink" href="'+url.replace(/&/g,'&amp;')+'" target="_blank" rel="noopener">OPEN RESULTS</a><p class="mini">E.V. opened this search from your request. Check the result before buying or traveling.</p>');return !!box}catch(_){return false}}
    function searchCommand(text){
      let s=clean(text).replace(/^hey\s+/i,'').replace(/^e\.?\s*v\.?,?\s*/i,'');
      let m=s.match(/^(?:search|look\s+up|google|find)\s+(?:for\s+)?(.+)$/i);
      if(m){const q=clean(m[1]);if(!q)return false;add('Searching the web for “'+q+'”…');link('SEARCH // '+q,'https://www.google.com/search?q='+encodeURIComponent(q));return true}
      m=s.match(/^(?:where\s+can\s+i\s+buy|where\s+do\s+i\s+buy|find\s+(?:a|the)?\s*stores?\s+(?:that\s+sell|for)|find\s+materials\s+for)\s+(.+)$/i);
      if(m){const q=clean(m[1]);add('I’ll find places to buy '+q+' near you.');link('NEARBY STORES // '+q,'https://www.google.com/maps/search/'+encodeURIComponent(q+' near me'));link('SHOPPING // '+q,'https://www.google.com/search?tbm=shop&q='+encodeURIComponent(q));return true}
      if(/\b(materials|supplies|hardware|lumber|wood|screws|paint|tools)\b/i.test(s)&&/\b(buy|purchase|store|stores|near me|nearest)\b/i.test(s)){const q=clean(s);add('Got it. I’ll look for nearby places and shopping results for '+q+'.');link('NEARBY MATERIALS','https://www.google.com/maps/search/'+encodeURIComponent(q+' near me'));link('SHOPPING RESULTS','https://www.google.com/search?tbm=shop&q='+encodeURIComponent(q));return true}
      return false;
    }
    const oldSend=w.sendMessage;if(typeof oldSend==='function')w.sendMessage=async function(text){if(searchCommand(text))return Promise.resolve();return oldSend.call(w,text)};
    // Reduce false refusals for ordinary requests without weakening safety rules.
    const oldFetch=w.fetch.bind(w);w.fetch=function(input,init){try{const url=typeof input==='string'?input:(input&&input.url)||'';if(url.includes('api.groq.com/openai/v1/chat/completions')&&init?.body){const body=JSON.parse(init.body);if(Array.isArray(body.messages)){const extra={role:'system',content:'E.V. RESPONSE STYLE: Treat ordinary, age-appropriate requests as ordinary. Do not invent danger or accuse the user of intending harm. Only apply safety restrictions when the actual request falls into a restricted category. For normal DIY, school, coding, shopping, repair, cooking, travel, and everyday questions, answer directly and helpfully.'};body.messages.splice(1,0,extra);init={...init,body:JSON.stringify(body)}}} }catch(_){}return oldFetch(input,init)};
    w.EVSearch={search:searchCommand};
  }catch(e){console.warn('search assistant attach failed',e)}}
  frame.addEventListener('load',patch);setTimeout(patch,300);setTimeout(patch,1200);setTimeout(patch,2500);
})();
