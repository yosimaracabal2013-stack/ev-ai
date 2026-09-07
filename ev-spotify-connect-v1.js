/* E.V. Spotify Connect v5
   Browser-only Spotify OAuth (PKCE).
   Account connection + playlist selection + device-aware playback + clearer diagnostics.
*/
(function(){
'use strict';
const CLIENT_ID_KEY='ev-spotify-client-id-v1',REDIRECT_URI='https://yosimaracabal2013-stack.github.io/ev-ai/',CREATE_APP_URL='https://developer.spotify.com/dashboard/create',SCOPES=['playlist-read-private','playlist-read-collaborative','user-read-playback-state','user-modify-playback-state'].join(' '),TOKEN_KEY='ev-spotify-token-v1',REFRESH_KEY='ev-spotify-refresh-v1',VERIFIER_KEY='ev-spotify-verifier-v1',STATE_KEY='ev-spotify-state-v1',EXP_KEY='ev-spotify-exp-v1';
const frame=()=>document.getElementById('evDashboard'),win=()=>{const f=frame();return f&&f.contentWindow},input=()=>{const w=win();return w&&w.document.getElementById('input')},send=()=>{const w=win();return w&&w.document.getElementById('sendBtn')};
function reply(text){const msg=String(text||'');try{const i=input(),b=send();if(i&&b){i.value=msg;i.dispatchEvent(new Event('input',{bubbles:true}));b.click();return true}}catch(_){}setTimeout(()=>{try{const i=input(),b=send();if(i&&b){i.value=msg;i.dispatchEvent(new Event('input',{bubbles:true}));b.click()}}catch(_){}} ,700);return false}
const clientId=()=>localStorage.getItem(CLIENT_ID_KEY)||'',token=()=>localStorage.getItem(TOKEN_KEY)||'';
function saveToken(t){if(t?.access_token){localStorage.setItem(TOKEN_KEY,t.access_token);if(t.expires_in)localStorage.setItem(EXP_KEY,String(Date.now()+t.expires_in*1000))}if(t?.refresh_token)localStorage.setItem(REFRESH_KEY,t.refresh_token)}
function b64url(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function randomString(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a)}
async function challenge(v){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))))}
function openCreate(){try{window.open(CREATE_APP_URL,'_blank','noopener,noreferrer')}catch(_){location.href=CREATE_APP_URL}}
async function connect(){
 let id=clientId().trim();
 if(!id){reply('I need your Spotify Client ID first. I opened Spotify app setup. After you create the app, paste only the Client ID here. Never paste your Spotify password or Client Secret.');openCreate();setTimeout(()=>{const x=window.prompt('Paste your Spotify Client ID here. Never paste your Spotify password or Client Secret.');if(x?.trim()){localStorage.setItem(CLIENT_ID_KEY,x.trim());reply('Client ID saved. Say “E.V., connect Spotify” again and I’ll start Spotify sign-in.')}},600);return}
 const verifier=randomString(64),state=randomString(24),ch=await challenge(verifier);
 localStorage.setItem(VERIFIER_KEY,verifier);localStorage.setItem(STATE_KEY,state);
 const u=new URL('https://accounts.spotify.com/authorize');
 u.search=new URLSearchParams({response_type:'code',client_id:id,scope:SCOPES,redirect_uri:REDIRECT_URI,state,code_challenge_method:'S256',code_challenge:ch}).toString();
 reply('Opening Spotify sign-in now.');location.href=u.toString();
}
async function exchange(code,state){
 const id=clientId();if(!id)throw Error('Spotify Client ID is not set.');
 if(state!==localStorage.getItem(STATE_KEY))throw Error('Spotify authorization state did not match.');
 const verifier=localStorage.getItem(VERIFIER_KEY)||'';if(!verifier)throw Error('Spotify sign-in session expired. Please connect again.');
 const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:id,grant_type:'authorization_code',code,redirect_uri:REDIRECT_URI,code_verifier:verifier})});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error_description||j.error||'Spotify token exchange failed.');
 saveToken(j);localStorage.removeItem(VERIFIER_KEY);localStorage.removeItem(STATE_KEY);return j;
}
async function refresh(){const rt=localStorage.getItem(REFRESH_KEY),id=clientId();if(!rt||!id)return false;const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:id,grant_type:'refresh_token',refresh_token:rt})});const j=await r.json().catch(()=>({}));if(!r.ok)return false;saveToken(j);return true}
async function api(path,opts={}){
 let t=token();if(!t)throw Error('NOT_CONNECTED');
 let h=Object.assign({'Authorization':'Bearer '+t},opts.headers||{}),r=await fetch('https://api.spotify.com/v1'+path,Object.assign({},opts,{headers:h}));
 if(r.status===401&&await refresh()){t=token();h.Authorization='Bearer '+t;r=await fetch('https://api.spotify.com/v1'+path,Object.assign({},opts,{headers:h}))}
 if(r.status===204)return null;
 const j=await r.json().catch(()=>({}));
 if(!r.ok){const e=Error(j.error?.message||('Spotify request failed ('+r.status+')'));e.status=r.status;e.payload=j;throw e}
 return j;
}
async function playlists(){
 const out=[];let offset=0;
 while(true){
   const j=await api('/me/playlists?limit=50&offset='+offset);
   const items=j.items||[];out.push(...items);
   if(!j.next||!items.length||out.length>500)break;
   offset+=items.length;
 }
 return out;
}
async function devices(){return (await api('/me/player/devices')).devices||[]}
async function bestDevice(){
 try{const ds=await devices();return ds.find(d=>d.is_active&&!d.is_restricted)||ds.find(d=>!d.is_restricted)||null}catch(_){return null}
}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function best(ps){if(!ps.length)return null;return ps.slice().sort((a,b)=>{const score=p=>{const n=norm(p.name);return (/best|favorite|favourite|main|top|go to/.test(n)?100:0)+Number(p.items?.total||p.tracks?.total||0)};return score(b)-score(a)})[0]}
function match(ps,q){const n=norm(q);return ps.find(p=>norm(p.name)===n)||ps.find(p=>norm(p.name).includes(n)||n.includes(norm(p.name)))}
async function playContext(uri){const d=await bestDevice();const body={context_uri:uri};if(d?.id)body.device_id=d.id;await api('/me/player/play',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
async function playTrack(uri){const d=await bestDevice();const body={uris:[uri]};if(d?.id)body.device_id=d.id;await api('/me/player/play',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
function openUri(uri){try{location.href=uri}catch(_) {}}
function isIntent(s){return/\b(play|put on|start|open|search|find)\b/.test(s)&&(/\b(spotify|playlist|playlists|chill|relax|calm|lofi|music|song|songs|my|something)\b/.test(s))}
async function chill(){const j=await api('/search?q='+encodeURIComponent('chill')+'&type=track&limit=10'),ts=j.tracks?.items||[];if(!ts.length)throw Error('I could not find a chill track.');const t=ts[Math.floor(Math.random()*Math.min(ts.length,5))];try{await playTrack(t.uri);reply('Playing something chill: '+t.name+' by '+(t.artists?.[0]?.name||'Spotify')+'.')}catch(e){openUri(t.uri);reply('I found something chill, but Spotify would not start playback from E.V. I opened the track instead. '+friendlyError(e))}}
function friendlyError(e){const m=String(e?.message||e||'');if(/premium/i.test(m))return'Spotify playback control requires Premium.';if(/active device|No active device|device/i.test(m))return'Open Spotify on one of your devices first so it has an active player.';if(e?.status===403)return'Spotify denied playback control for this account or device.';return m}
async function handle(text){
 const s=norm(text);if(!s)return false;
 if(/^(connect|link|sign in|login|log in).*spotify$/.test(s)||s==='connect spotify'||s==='link spotify'){await connect();return true}
 if(/(disconnect|sign out|log out|logout).*spotify/.test(s)){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(REFRESH_KEY);localStorage.removeItem(EXP_KEY);reply('Spotify is disconnected from E.V.');return true}
 if(/^open spotify$/.test(s)){try{location.href='https://open.spotify.com/'}catch(_){}return true}
 const wants=isIntent(s)||/\b(best playlist|favorite playlist|favourite playlist|one of my playlists|my playlists|show.*playlists|list.*playlists)\b/.test(s);if(!wants)return false;
 if(!token()){await connect();return true}
 try{
  if(/\b(chill|relax|relaxing|calm|lofi)\b/.test(s)&&!/(playlist|playlists)/.test(s)&&/\b(play|put on|start)\b/.test(s)){await chill();return true}
  const ps=await playlists();
  if(/best playlist|favorite playlist|favourite playlist|one of my playlists/.test(s)){
   const p=best(ps);if(!p){reply('I connected to Spotify, but I could not find any playlists on this account.');return true}
   try{await playContext(p.uri);reply('Playing your best-match playlist, '+p.name+'.')}catch(e){reply('I found '+p.name+', but Spotify would not start playback. '+friendlyError(e)+' I can still open that playlist.');openUri(p.uri)}return true
  }
  const m=s.match(/(?:play|open|put on|start).*?(?:playlist)\s+(.+)$/);
  if(m){const p=match(ps,m[1]);if(!p){reply('I could not find a Spotify playlist matching '+m[1]+'.');return true}try{await playContext(p.uri);reply('Playing '+p.name+'.')}catch(e){reply('I found '+p.name+', but Spotify would not start playback. '+friendlyError(e)+' I can still open that playlist.');openUri(p.uri)}return true}
  if(/(my playlists|show.*playlists|list.*playlists)/.test(s)){reply(ps.length?'I found '+ps.length+' Spotify playlists. Tell me the playlist name, or say “play my best playlist”.':'I could not find any playlists on this Spotify account.');return true}
  if(/\b(play|put on|start)\b/.test(s)){const q=s.replace(/\b(e v|ev)\b/g,'').replace(/\b(play|put on|start)\b/g,'').replace(/\bon spotify\b/g,'').trim();if(q){const j=await api('/search?q='+encodeURIComponent(q)+'&type=track&limit=5'),ts=j.tracks?.items||[];if(ts.length){try{await playTrack(ts[0].uri);reply('Playing '+ts[0].name+' by '+(ts[0].artists?.[0]?.name||'Spotify')+'.')}catch(e){openUri(ts[0].uri);reply('I found '+ts[0].name+', but Spotify would not start playback from E.V. '+friendlyError(e))}return true}}}
 }catch(e){
  if(e.message==='NOT_CONNECTED')await connect();
  else if(e.status===401){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(REFRESH_KEY);reply('Spotify authorization expired. Say “E.V., connect Spotify” and I’ll reconnect it.');}
  else if(/premium|restricted|not allowed|active device|No active device/i.test(String(e.message)))reply('Spotify is connected, but it will not let E.V. start playback right now. '+friendlyError(e));
  else reply('Spotify gave E.V. this error: '+friendlyError(e));
 }
 return true;
}
async function callback(){
 if(!clientId())return;
 const u=new URL(location.href),code=u.searchParams.get('code'),state=u.searchParams.get('state'),err=u.searchParams.get('error');
 if(err){history.replaceState({},'',REDIRECT_URI);reply('Spotify sign-in was cancelled or denied. Say “E.V., connect Spotify” to try again.');return}
 if(!code)return;
 try{
   await exchange(code,state);
   history.replaceState({},'',REDIRECT_URI);
   const me=await api('/me');
   let extra='';
   try{const ds=await devices();extra=ds.length?' I can see '+ds.length+' Spotify device'+(ds.length===1?'':'s')+'.':' Open Spotify on a device if you want E.V. to control playback.'}catch(_){ }
   reply('Spotify is connected as '+(me.display_name||'your account')+'. E.V. can now access your authorized playlists.'+extra);
 }catch(e){
   history.replaceState({},'',REDIRECT_URI);
   const m=String(e?.message||e);
   if(/redirect/i.test(m))reply('Spotify connection failed because the Redirect URI does not match. In your Spotify app settings, add this exact URI: '+REDIRECT_URI);
   else reply('Spotify connection failed: '+m);
 }
}
function hook(){
 const f=frame(),i=input(),b=send();if(!f||!i)return;let last='',busy=false;
 async function inspect(){const t=(i.value||'').trim();if(!t||t===last||busy)return;last=t;if(!(/spotify/i.test(t)||isIntent(norm(t))||/\b(best playlist|favorite playlist|favourite playlist|one of my playlists)\b/i.test(t)))return;busy=true;const ok=await handle(t).catch(()=>false);busy=false;if(ok){i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))}}
 i.addEventListener('input',()=>setTimeout(inspect,60));i.addEventListener('change',inspect);i.addEventListener('blur',inspect);i.addEventListener('keydown',e=>{if(e.key==='Enter')setTimeout(inspect,0)});if(b)b.addEventListener('click',()=>setTimeout(inspect,0));
 window.EVSpotify={connect,handle,playlists,devices,token:()=>!!token(),setClientId:id=>{if(id)localStorage.setItem(CLIENT_ID_KEY,String(id).trim())},status:()=>({connected:!!token(),hasClientId:!!clientId(),redirectUri:REDIRECT_URI})};
}
callback();const f=frame();if(f)f.addEventListener('load',()=>setTimeout(hook,250));setTimeout(hook,1000);
})();
