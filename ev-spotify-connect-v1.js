/* E.V. Spotify Connect v3
   Browser-only Spotify OAuth (PKCE).
   Adds direct voice/text playback commands such as:
   - "E.V., play something chill"
   - "E.V., play my best playlist"
   - "E.V., play my workout playlist"
*/
(function(){
  'use strict';

  const DEFAULT_CLIENT_ID='';
  const CLIENT_ID_KEY='ev-spotify-client-id-v1';
  const REDIRECT_URI='https://yosimaracabal2013-stack.github.io/ev-ai/';
  const CREATE_APP_URL='https://developer.spotify.com/dashboard/create';
  const SCOPES=['playlist-read-private','playlist-read-collaborative','user-read-playback-state','user-modify-playback-state'].join(' ');
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
      const i=input(),b=send();
      if(i&&b){i.value=text;i.dispatchEvent(new Event('input',{bubbles:true}));b.click();return true;}
    }catch(_){ }
    return false;
  }

  function getClientId(){return (localStorage.getItem(CLIENT_ID_KEY)||DEFAULT_CLIENT_ID).trim()}
  function hasConfig(){const id=getClientId();return !!id&&!id.includes('PASTE_SPOTIFY_CLIENT_ID_HERE')}
  function token(){return localStorage.getItem(TOKEN_KEY)||''}
  function saveToken(t){
    if(t&&t.access_token){localStorage.setItem(TOKEN_KEY,t.access_token);if(t.expires_in)localStorage.setItem('ev-spotify-exp-v1',String(Date.now()+t.expires_in*1000));}
    if(t&&t.refresh_token)localStorage.setItem(REFRESH_KEY,t.refresh_token);
  }

  function b64url(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  function randomString(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a)}
  async function challenge(v){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return b64url(new Uint8Array(h))}

  function openCreateApp(){try{window.open(CREATE_APP_URL,'_blank','noopener,noreferrer')}catch(_){location.href=CREATE_APP_URL}}

  async function connect(){
    let clientId=getClientId();
    if(!clientId){
      reply('Your E.V. Spotify setup is ready. I just need the Spotify Client ID. I’ll open Spotify’s Create App page first.');
      openCreateApp();
      setTimeout(()=>{try{const entered=window.prompt('Paste your Spotify Client ID here. This is NOT your Spotify password or Client Secret.');if(entered&&entered.trim()){localStorage.setItem(CLIENT_ID_KEY,entered.trim());reply('Spotify Client ID saved. Say “E.V., connect Spotify” again and I’ll start the Spotify sign-in.')}}catch(_){ }},600);
      return;
    }
    const verifier=randomString(64),ch=await challenge(verifier),state=randomString(24);
    localStorage.setItem(VERIFIER_KEY,verifier);localStorage.setItem(STATE_KEY,state);
    const u=new URL('https://accounts.spotify.com/authorize');
    u.search=new URLSearchParams({response_type:'code',client_id:clientId,scope:SCOPES,redirect_uri:REDIRECT_URI,state,code_challenge_method:'S256',code_challenge:ch}).toString();
    location.href=u.toString();
  }

  async function exchange(code,state){
    const clientId=getClientId();
    if(!clientId)throw new Error('Spotify Client ID is not set.');
    if(state!==localStorage.getItem(STATE_KEY))throw new Error('Spotify authorization state did not match.');
    const verifier=localStorage.getItem(VERIFIER_KEY)||'';
    const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,grant_type:'authorization_code',code,redirect_uri:REDIRECT_URI,code_verifier:verifier})});
    const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||'Spotify token exchange failed.');
    saveToken(j);localStorage.removeItem(VERIFIER_KEY);localStorage.removeItem(STATE_KEY);return j;
  }

  async function refresh(){
    const rt=localStorage.getItem(REFRESH_KEY);if(!rt)return false;
    const clientId=getClientId();if(!clientId)return false;
    const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,grant_type:'refresh_token',refresh_token:rt})});
    const j=await r.json().catch(()=>({}));if(!r.ok)return false;saveToken(j);return true;
  }

  async function api(path,opts={}){
    let t=token();if(!t)throw new Error('NOT_CONNECTED');
    const headers=Object.assign({'Authorization':'Bearer '+t},opts.headers||{});
    let r=await fetch('https://api.spotify.com/v1'+path,Object.assign({},opts,{headers}));
    if(r.status===401&&await refresh()){t=token();headers.Authorization='Bearer '+t;r=await fetch('https://api.spotify.com/v1'+path,Object.assign({},opts,{headers}));}
    if(r.status===204)return null;
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error?.message||('Spotify request failed ('+r.status+')'));
    return j;
  }

  async function playlists(){
    const out=[];let url='/me/playlists?limit=50';
    while(url){const j=await api(url);(j.items||[]).forEach(p=>out.push(p));url=j.next?new URL(j.next).pathname+new URL(j.next).search:null;}
    return out;
  }

  function normalize(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function chooseBest(ps){
    if(!ps.length)return null;
    return ps.slice().sort((a,b)=>{
      const an=normalize(a.name),bn=normalize(b.name);
      const as=/best|favorite|favourite|main|go to|top/.test(an)?1:0;
      const bs=/best|favorite|favourite|main|go to|top/.test(bn)?1:0;
      return(bs-as)||(Number(b.items?.total||b.tracks?.total||0)-Number(a.items?.total||a.tracks?.total||0));
    })[0];
  }

  function chooseMatchingPlaylist(ps,q){
    const n=normalize(q);
    if(!n)return chooseBest(ps);
    return ps.find(p=>normalize(p.name)===n)||ps.find(p=>normalize(p.name).includes(n)||n.includes(normalize(p.name)));
  }

  async function playUri(uri){
    await api('/me/player/play',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({context_uri:uri})});
  }
  async function playTrack(uri){
    await api('/me/player/play',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({uris:[uri]})});
  }

  function openSpotifyUri(uri){if(!uri)return;try{location.href=uri}catch(_){ }}

  function isSpotifyIntent(s){
    return /\b(play|put on|start)\b/.test(s)&&(/\b(chill|relax|relaxing|calm|lofi|music|song|songs|playlist|my|something)\b/.test(s)||/\b(spotify)\b/.test(s));
  }

  async function playSomethingChill(){
    const j=await api('/search?q='+encodeURIComponent('chill')+'&type=track&limit=10');
    const tracks=(j.tracks&&j.tracks.items)||[];
    if(!tracks.length)throw new Error('I could not find a chill track.');
    const track=tracks[Math.floor(Math.random()*Math.min(tracks.length,5))];
    try{await playTrack(track.uri);reply('Playing something chill: “'+track.name+'” by '+(track.artists?.[0]?.name||'Spotify')+'.');}
    catch(e){openSpotifyUri(track.uri);reply('I found something chill, but Spotify would not start playback from E.V. I opened the track in Spotify instead.');}
  }

  async function handle(text){
    const s=normalize(text);if(!s)return false;
    if(/^(connect|link|sign in|login|log in).*spotify$/.test(s)||s==='connect spotify'||s==='link spotify'){
      await connect();return true;
    }
    if(/(disconnect|sign out|log out|logout).*spotify/.test(s)){
      localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(REFRESH_KEY);reply('Spotify is disconnected from E.V.');return true;
    }
    const wantsPlayback=isSpotifyIntent(s)||/\b(best playlist|favorite playlist|favourite playlist|my playlists|show.*playlists|list.*playlists)\b/.test(s);
    if(!wantsPlayback)return false;
    if(!token()){await connect();return true;}

    try{
      if(/\b(chill|relax|relaxing|calm|lofi)\b/.test(s)&&!/playlist/.test(s)&&/\b(play|put on|start)\b/.test(s)){
        await playSomethingChill();return true;
      }

      const ps=await playlists();
      if(/best playlist|favorite playlist|favourite playlist/.test(s)){
        const p=chooseBest(ps);if(!p){reply('I couldn’t find any playlists on your Spotify account.');return true;}
        try{await playUri(p.uri);reply('Playing your best-match playlist, “'+p.name+'”.');}
        catch(e){reply('I found “'+p.name+'”, but Spotify would not start playback. I’ll open that playlist in Spotify instead.');openSpotifyUri(p.uri);}
        return true;
      }

      const m=s.match(/(?:play|open|put on|start).*(?:playlist)\s+(.+)$/);
      if(m){
        const p=chooseMatchingPlaylist(ps,m[1]);
        if(!p){reply('I couldn’t find a Spotify playlist matching “'+m[1]+'”.');return true;}
        try{await playUri(p.uri);reply('Playing “'+p.name+'”.');}
        catch(e){reply('I found “'+p.name+'”, but Spotify would not start playback. I’ll open that playlist in Spotify instead.');openSpotifyUri(p.uri);}
        return true;
      }

      if(/(my playlists|show.*playlists|list.*playlists)/.test(s)){
        reply(ps.length?'I found '+ps.length+' Spotify playlists. Tell me the playlist name, or say “play my best playlist”.':'I couldn’t find any playlists on your Spotify account.');return true;
      }

      if(/\b(play|put on|start)\b/.test(s)){
        const q=s.replace(/\b(e v|ev)\b/g,'').replace(/\b(play|put on|start)\b/g,'').replace(/\bon spotify\b/g,'').trim();
        if(q){
          const results=await api('/search?q='+encodeURIComponent(q)+'&type=track&limit=5');
          const tracks=(results.tracks&&results.tracks.items)||[];
          if(tracks.length){
            const t=tracks[0];
            try{await playTrack(t.uri);reply('Playing “'+t.name+'” by '+(t.artists?.[0]?.name||'Spotify')+'.');}
            catch(e){openSpotifyUri(t.uri);reply('I found “'+t.name+'”, but Spotify would not start playback from E.V. I opened it in Spotify instead.');}
            return true;
          }
        }
      }
    }catch(e){
      if(e.message==='NOT_CONNECTED'){await connect();}
      else if(/premium|restricted|not allowed|active device|No active device/i.test(e.message)){
        reply('Spotify is connected, but it would not let E.V. start playback on an active device. I can still open the music in Spotify for you.');
      }else reply('Spotify gave me an error: '+e.message);
    }
    return true;
  }

  async function callback(){
    if(!hasConfig())return;
    const u=new URL(location.href),code=u.searchParams.get('code'),state=u.searchParams.get('state'),err=u.searchParams.get('error');
    if(err){history.replaceState({},'',REDIRECT_URI);reply('Spotify sign-in was cancelled.');return;}
    if(!code)return;
    try{await exchange(code,state);history.replaceState({},'',REDIRECT_URI);reply('Spotify is connected. E.V. can now access your authorized playlists and control playback where Spotify allows it.');}
    catch(e){history.replaceState({},'',REDIRECT_URI);reply('Spotify connection failed: '+e.message)}
  }

  function hook(){
    const f=frame();if(!f)return;
    const i=input();const b=send();if(!i)return;
    let last='';let busy=false;
    async function inspect(){
      const t=(i.value||'').trim();
      if(!t||t===last||busy)return;
      last=t;
      if(!(/spotify/i.test(t)||isSpotifyIntent(normalize(t))||/\b(best playlist|favorite playlist|favourite playlist)\b/i.test(t)))return;
      busy=true;
      const ok=await handle(t).catch(()=>false);
      busy=false;
      if(ok){i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));}
    }
    i.addEventListener('input',()=>setTimeout(inspect,60));
    i.addEventListener('change',inspect);i.addEventListener('blur',inspect);
    i.addEventListener('keydown',e=>{if(e.key==='Enter')setTimeout(inspect,0)});
    if(b)b.addEventListener('click',()=>setTimeout(inspect,0));
    window.EVSpotify={connect,handle,playlists,token:()=>!!token(),setClientId:id=>{if(id)localStorage.setItem(CLIENT_ID_KEY,String(id).trim())}};
  }

  callback();
  const f=frame();if(f)f.addEventListener('load',()=>setTimeout(hook,250));
  setTimeout(hook,1000);
})();
