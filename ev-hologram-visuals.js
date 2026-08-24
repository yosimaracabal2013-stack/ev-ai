/* E.V. HOLOGRAM VISUALS — frameless projection + interactive 3D depth */
(function(){'use strict';
function install(){
  if(document.getElementById('ev-hologram-visual-style')) return;
  const s=document.createElement('style');
  s.id='ev-hologram-visual-style';
  s.textContent=`
#evPhotoPanel{background:rgba(0,0,0,.18)!important;backdrop-filter:blur(1px)!important}
#evPhotoPanel .ev-carousel{background:radial-gradient(ellipse at 50% 52%,rgba(67,255,231,.10),transparent 34%),transparent!important;overflow:visible!important;perspective:1400px!important;perspective-origin:50% 48%!important}
#evPhotoPanel .ev-grid{gap:0!important;padding-left:10vw!important;padding-right:10vw!important;transform-style:preserve-3d!important}
#evPhotoPanel .ev-card,#evPhotoPanel .ev-card.active,#evPhotoPanel .ev-card:not(.active){flex-basis:76vw!important;max-width:520px!important;height:min(62vh,500px)!important;min-height:260px!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;outline:0!important;overflow:visible!important;padding:0!important;isolation:isolate!important;transform-style:preserve-3d!important;will-change:transform,filter,opacity!important;transition:transform .18s ease-out,opacity .35s ease,filter .35s ease!important}
#evPhotoPanel .ev-card.active{opacity:1!important;filter:none!important;transform:var(--ev-3d-transform,scale(1.04) translateZ(35px))!important;animation:evHoloFloat 4.8s ease-in-out infinite!important}
#evPhotoPanel .ev-card img,#evPhotoPanel .ev-card.active img{position:relative!important;z-index:1!important;display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;opacity:.62!important;mix-blend-mode:screen!important;transform:translateZ(35px)!important;filter:grayscale(1) contrast(1.65) brightness(1.28) saturate(0) drop-shadow(0 0 3px rgba(116,255,240,.95)) drop-shadow(0 0 12px rgba(68,255,230,.55)) drop-shadow(0 0 34px rgba(68,255,230,.20))!important;-webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.55) 7%,#000 18%,#000 82%,rgba(0,0,0,.45) 95%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.55) 7%,#000 18%,#000 82%,rgba(0,0,0,.45) 95%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);mask-composite:intersect}
#evPhotoPanel .ev-card:before{content:''!important;position:absolute!important;z-index:0!important;inset:8% 8%!important;border:0!important;border-radius:50%!important;background:radial-gradient(ellipse,rgba(76,255,232,.18) 0%,rgba(76,255,232,.08) 34%,transparent 72%)!important;filter:blur(22px)!important;box-shadow:0 0 65px rgba(76,255,232,.14),0 0 140px rgba(76,255,232,.07)!important;pointer-events:none!important;animation:evHoloGlow 3.5s ease-in-out infinite!important}
#evPhotoPanel .ev-card:after{content:''!important;position:absolute!important;z-index:4!important;inset:5% 6%!important;border:0!important;background:repeating-linear-gradient(to bottom,rgba(190,255,248,.055) 0,rgba(190,255,248,.055) 1px,transparent 1px,transparent 8px),linear-gradient(105deg,transparent 18%,rgba(225,255,250,.15) 46%,rgba(225,255,250,.025) 53%,transparent 74%)!important;mix-blend-mode:screen!important;opacity:.46!important;pointer-events:none!important;animation:evHoloScan 3.8s linear infinite,evHoloFlicker 6s steps(10,end) infinite!important}
#evPhotoPanel .ev-card .ev-corners,#evPhotoPanel .ev-card.active .ev-corners{display:none!important}
#evPhotoPanel .ev-cap{z-index:6!important;bottom:-20px!important;padding:0!important;background:transparent!important;border:0!important;color:rgba(190,255,247,.76)!important;text-shadow:0 0 6px rgba(92,255,235,.95),0 0 18px rgba(92,255,235,.30)!important;transform:translateZ(45px)!important}
#evPhotoPanel .ev-card.prev,#evPhotoPanel .ev-card.next{opacity:.14!important;filter:blur(1px)!important;transform:scale(.72) translateZ(-130px)!important}
#evPhotoPanel .ev-card.prev img,#evPhotoPanel .ev-card.next img{opacity:.24!important;mix-blend-mode:screen!important;filter:grayscale(1) contrast(1.35) brightness(1.15) drop-shadow(0 0 16px rgba(73,255,231,.25))!important}
#evPhotoPanel .ev-carousel:after{left:18%!important;right:18%!important;top:auto!important;bottom:8%!important;height:18%!important;border:0!important;border-radius:50%!important;transform:none!important;background:radial-gradient(ellipse,rgba(65,255,230,.14),transparent 68%)!important;box-shadow:0 0 90px rgba(60,255,230,.10)!important;opacity:.8!important}
@keyframes evHoloScan{0%{background-position:0 -60px,120% 0}100%{background-position:0 70px,-30% 0}}
@keyframes evHoloFlicker{0%,100%{opacity:.43}48%{opacity:.50}50%{opacity:.30}52%{opacity:.55}76%{opacity:.40}}
@keyframes evHoloGlow{0%,100%{opacity:.48;transform:scale(.96)}50%{opacity:.82;transform:scale(1.05)}}
@keyframes evHoloFloat{0%,100%{transform:var(--ev-3d-transform,scale(1.04) translateY(0) translateZ(35px))}50%{transform:var(--ev-3d-transform,scale(1.055) translateY(-8px) translateZ(48px))}}
@media(max-width:700px){#evPhotoPanel .ev-grid{padding-left:8vw!important;padding-right:8vw!important}#evPhotoPanel .ev-card,#evPhotoPanel .ev-card.active,#evPhotoPanel .ev-card:not(.active){flex-basis:84vw!important;height:56vh!important;max-width:none!important}#evPhotoPanel .ev-card.active img{opacity:.56!important;filter:grayscale(1) contrast(1.7) brightness(1.30) drop-shadow(0 0 3px rgba(116,255,240,.95)) drop-shadow(0 0 13px rgba(68,255,230,.48))!important}}
`;
  document.head.appendChild(s);
  enable3D();
}
function enable3D(){
  const grid=document.getElementById('evGrid'); if(!grid||grid.dataset.ev3d)return;
  grid.dataset.ev3d='1';
  let active=null,lastX=0,lastY=0,rx=0,ry=0,drag=false;
  const reset=()=>{if(active){rx*=.82;ry*=.82;apply()} };
  const apply=()=>{if(!active)return;const scale=1.04;active.style.setProperty('--ev-3d-transform',`scale(${scale}) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(35px)`)};
  const pick=()=>{const c=grid.querySelector('.ev-card.active');if(c!==active){active=c;rx=0;ry=0;apply()}return c};
  const point=(e)=>e.touches?e.touches[0]:e;
  const down=e=>{const c=pick();if(!c)return;const p=point(e);lastX=p.clientX;lastY=p.clientY;drag=true;c.style.transition='none';if(e.cancelable)e.preventDefault()};
  const move=e=>{if(!drag)return;const c=pick();if(!c)return;const p=point(e);const dx=p.clientX-lastX,dy=p.clientY-lastY;lastX=p.clientX;lastY=p.clientY;ry=Math.max(-28,Math.min(28,ry+dx*.22));rx=Math.max(-16,Math.min(16,rx-dy*.16));apply();if(e.cancelable)e.preventDefault()};
  const up=()=>{if(!drag)return;drag=false;if(active)active.style.transition='transform .18s ease-out,opacity .35s ease,filter .35s ease';setTimeout(reset,250)};
  grid.addEventListener('pointerdown',down,{passive:false});grid.addEventListener('pointermove',move,{passive:false});grid.addEventListener('pointerup',up);grid.addEventListener('pointercancel',up);grid.addEventListener('touchstart',down,{passive:false});grid.addEventListener('touchmove',move,{passive:false});grid.addEventListener('touchend',up);
  const observer=new MutationObserver(pick);observer.observe(grid,{subtree:true,attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.EVHologramVisuals={install,enable3D};
})();
