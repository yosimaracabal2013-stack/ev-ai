/* E.V. Spotify Connect v1
   Browser-only Spotify OAuth (PKCE). No Spotify password or client secret is stored.
*/
(function(){
  'use strict';

  const CLIENT_ID = 'PASTE_SPOTIFY_CLIENT_ID_HERE';
  const REDIRECT_URI = 'https://yosimaracabal2013-stack.github.io/ev-ai/';
  const SCOPES = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-playback-state',
    'user-modify-playback-state'
  ].join(' ');
  const TOKEN_KEY='ev-spotify-token-v1';
  const REFRESH_KEY='ev-spotify-refresh-v1';
  const VERIFIER_KEY='ev-spotify-verifier-v1';
  const STATE_KEY='ev-spotify-state-v1';

  const frame=()=>document.getElementById('evDashboard');
  const win=()=>{const f=frame();return f&&f.contentWindow};
  const input=()=>{const w=win();return w&&w.document.getElementById('input')};
  const send=()=>{const w=win();return w&&w.document.getElementById('sendBtn')};

  function reply(text){
    try{
      const i=input(), b=send();
      if(i&&b){ i.value=text; i.dispatchEvent(new Event('input',{bubbles:true})); b.click(); return; }
    }catch(_){ }
  }

  function hasConfig(){return CLIENT_ID && !CLIENT_ID.includes('PASTE_SPOTIFY_CLIENT_ID_HERE')}
  function token(){return localStorage.getItem(TOKEN_KEY)||''}
  function saveToken(t){if(t&&t.access_token){localStorage.setItem(TOKEN_KEY,t.access_token); if(t.expires_in)localStorage.setItem('ev-spotify-exp-v1',String(Date.now()+t.expires_in*1000));} if(t&&t.refresh_token)localStorage.setItem(REFRESH_KEY,t.refresh_token)}

  function b64url(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  function randomString(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a)}
  async function challenge(v){const d=new TextEncoder().encode(v);const h=await crypto.subtle.digest('SHA-256',d);return b64url(new Uint8Array(h))}

  async function connect(){
    if(!hasConfig()){
      reply('I’m ready to connect Spotify, but my Spotify Client ID still needs to be added. You do not need to give me your Spotify password or Client Secret.');
      return;
    }
    const verifier=randomString(64), ch=await challenge(verifier), state=randomString(24);
    localStorage.setItem(VERIFIER_KEY,verifier); localStorage.setItem(STATE_KEY,state);
    const u=new URL('https://accounts.spotify.com/authorize');
    u.search=new URLSearchParams({response_type:'code',client_id:CLIENT_ID,scope:SCOPES,redirect_uri:REDIRECT_URI,state,code_challenge_method:'S256',code_challenge:ch}).toString();
    location.href=u.toString();
  }

  async function exchange(code,state){
    if(state!==localStorage.getItem(STATE_KEY))throw new Error('Spotify authorization state did not match.');
    const verifier=localStorage.getItem(VERIFIER_KEY)||'';
    const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,grant_type:'authorization_code',code,redirect_uri:REDIRECT_URI,code_verifier:verifier})});
    const j=await r.json(); if(!r.ok)throw new Error(j.error_description||j.error||'Spotify token exchange failed.');
    saveToken(j); localStorage.removeItem(VERIFIER_KEY); localStorage.removeItem(STATE_KEY); return j;
  }

  async function refresh(){
    const rt=localStorage.getItem(REFRESH_KEY); if(!rt)return false;
    const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,grant_type:'refresh_token',refresh_token:rt})});
    const j=await r.json(); if(!r.ok)return false; saveToken(j); return true;
  }

  async function api(path,opts={}){
    let t=token(); if(!t)throw new Error('NOT_CONNECTED');
    const headers=Object.assign({'Authorization':'Bearer '+t},opts.headers||{});
    let r=await fetch('https://api.spotify.com/v1'+path,Object.assign({},opts,{headers}));
    if(r.status===401 && await refresh()){
      t=token(); headers.Authorization='Bearer '+t; r=await fetch('https://api.spotify.com/v1'+path,Object.assign({},opts,{headers}));
    }
    if(r.status===204)return null;
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error?.message||('Spotify request failed ('+r.status+')'));
    return j;
  }

  async function playlists(){
    const out=[]; let url='/me/playlists?limit=50';
    while(url){
      const j=await api(url); (j.items||[]).forEach(p=>out.push(p));
      url=j.next?new URL(j.next).pathname+new URL(j.next).search:null;
    }
    return out;
  }

  function normalize(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function chooseBest(ps){
    if(!ps.length)return null;
    const ranked=ps.slice().sort((a,b)=>{
      const an=normalize(a.name),bn=normalize(b.name);
      const as=/best|favorite|favourite|main|go to|top/.test(an)?1:0;
      const bs=/best|favorite|favourite|main|go to|top/.test(bn)?1:0;
      return (bs-as)||(Number(b.items?.total||b.tracks?.total||0)-Number(a.items?.total||a.tracks?.total||0));
    });
    return ranked[0];
  }

  async function playPlaylist(p){
    await api('/me/player/play',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({context_uri:p.uri})});
    return p;
  }

  async function handle(text){
    const s=normalize(text); if(!s)return false;
    if(/^(connect|link|sign in|login|log in).*(spotify)$/.test(s)||s==='connect spotify'||s==='link spotify'){
      await connect(); return true;
    }
    if(!/spotify/.test(s))return false;
    if(/(disconnect|sign out|log out|logout)/.test(s)){
      localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(REFRESH_KEY);reply('Spotify is disconnected from E.V.');return true;
    }
    if(!token()){
      reply('Spotify is not connected yet. Say “E.V., connect Spotify” and I’ll take you through Spotify’s sign-in and permission screen.'); return true;
    }
    try{
      const ps=await playlists();
      if(/best playlist|favorite playlist|favourite playlist/.test(s)){
        const p=chooseBest(ps); if(!p){reply('I couldn’t find any playlists on your Spotify account.');return true;}
        try{await playPlaylist(p);reply('Playing your best-match playlist, “'+p.name+'”.');}
        catch(e){reply('I found “'+p.name+'”, but Spotify would not start playback. Make sure Spotify is open on an active device and that your account supports playback control.');}
        return true;
      }
      const m=s.match(/(?:play|open).*(?:playlist)\s+(.+)$/);
      if(m){
        const q=normalize(m[1]); const p=ps.find(x=>normalize(x.name)===q)||ps.find(x=>normalize(x.name).includes(q)||q.includes(normalize(x.name)));
        if(!p){reply('I couldn’t find a Spotify playlist matching “'+m[1]+'”.');return true;}
        try{await playPlaylist(p);reply('Playing “'+p.name+'”.');}
        catch(e){reply('I found “'+p.name+'”, but Spotify would not start playback. Make sure Spotify is open on an active device and that your account supports playback control.');}
        return true;
      }
      if(/(my playlists|show.*playlists|list.*playlists)/.test(s)){
        reply(ps.length?'I found '+ps.length+' Spotify playlists. Tell me the playlist name, or say “play my best playlist”.':'I couldn’t find any playlists on your Spotify account.');return true;
      }
    }catch(e){
      if(e.message==='NOT_CONNECTED')reply('Spotify is not connected yet. Say “E.V., connect Spotify” to connect it.');
      else reply('Spotify gave me an error: '+e.message);
    }
    return true;
  }

  async function callback(){
    if(!hasConfig())return;
    const u=new URL(location.href), code=u.searchParams.get('code'), state=u.searchParams.get('state'), err=u.searchParams.get('error');
    if(err){history.replaceState({},'',REDIRECT_URI);reply('Spotify sign-in was cancelled.');return}
    if(!code)return;
    try{await exchange(code,state);history.replaceState({},'',REDIRECT_URI);reply('Spotify is connected. I can now access your authorized playlists and control playback where Spotify allows it.');}
    catch(e){history.replaceState({},'',REDIRECT_URI);reply('Spotify connection failed: '+e.message)}
  }

  function hook(){
    const f=frame(); if(!f)return;
    const w=f.contentWindow;
    const i=input(); const b=send(); if(!i)return;
    let last='';
    function inspect(){const t=(i.value||'').trim();if(!t||t===last)return;last=t;if(/spotify/i.test(t))handle(t).then(ok=>{if(ok){i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))}}).catch(()=>{});}
    i.addEventListener('change',inspect);i.addEventListener('blur',inspect);
    i.addEventListener('keydown',e=>{if(e.key==='Enter')setTimeout(inspect,0)});
    if(b)b.addEventListener('click',()=>setTimeout(inspect,0));
    window.EVSpotify={connect,handle,playlists,token:()=>!!token()};
  }

  callback();
  const f=frame(); if(f)f.addEventListener('load',()=>setTimeout(hook,250));
  setTimeout(hook,1000);
})();
