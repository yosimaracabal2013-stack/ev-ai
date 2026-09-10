/* E.V. Spotify Diagnostics v1 — distinguishes account authorization from playback readiness. */
(function(){
'use strict';
const frame=document.getElementById('evDashboard');if(!frame)return;
function patch(){try{const w=frame.contentWindow;if(!w||w.__evSpotifyDiagnosticsV1)return;w.__evSpotifyDiagnosticsV1=true;const i=w.document.getElementById('input'),b=w.document.getElementById('sendBtn');if(!i||!b)return;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const isStatus=s=>{const t=norm(s);return /\b(is|are|am)\b.*\b(spotify|connected|linked)\b/.test(t)||/\bspotify\b.*\b(connected|linked)\b/.test(t)||/\b(are you|are we|do you have)\b.*\bspotify\b/.test(t)};
 async function state(){if(w.EVSystem?.spotifyState)return await w.EVSystem.spotifyState();const t=w.localStorage.getItem('ev-spotify-token-v1')||'';return t?{connection:'connected',playback:'unknown',reason:'Live Spotify device check is unavailable.'}:{connection:'disconnected',playback:'not_available',reason:'No Spotify authorization is stored.'}}
 function reply(msg){w.__evSpotifyInternalReply=true;i.value=msg;i.dispatchEvent(new Event('input',{bubbles:true}));b.click();w.setTimeout(()=>{w.__evSpotifyInternalReply=false},1200)}
 const inspect=async e=>{const t=(i.value||'').trim();if(!t||!isStatus(t))return; e.stopImmediatePropagation();e.preventDefault();try{const s=await state();if(s.connection==='disconnected')reply('Spotify is not connected to E.V. right now.');else if(s.connection==='expired')reply('Spotify authorization is expired. The account was connected before, but E.V. needs you to reconnect Spotify.');else if(s.playback==='ready')reply('Spotify is connected and playback is ready. I found an active device: '+(s.device||'your active device')+'.');else if(s.playback==='available_but_not_active')reply('Spotify is connected, but playback is not ready yet. Spotify has a usable device, but none is active right now. Open Spotify on a device first.');else if(s.playback==='no_usable_device')reply('Spotify is connected, but playback is not ready because Spotify has not exposed a usable playback device.');else if(s.playback==='denied')reply('Spotify is connected, but Spotify denied access to playback/device information.');else reply('Spotify is connected, but I could not verify playback readiness right now: '+(s.reason||'unknown device state'));}catch(err){reply('I could not verify Spotify right now: '+(err?.message||'unknown error'))}};
 b.addEventListener('click',inspect,true);i.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){const t=(i.value||'').trim();if(isStatus(t)){setTimeout(()=>{},0)}}},true);
 w.EVSpotifyDiagnostics={state};
}catch(e){console.warn('Spotify diagnostics attach failed',e)}}
frame.addEventListener('load',()=>setTimeout(patch,300));setTimeout(patch,1200);setTimeout(patch,2600);
})();
