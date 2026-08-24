/* E.V. HOLOGRAM VISUALS — frameless transparent projection look */
(function(){'use strict';
function install(){
  if(document.getElementById('ev-hologram-visual-style')) return;
  const s=document.createElement('style');
  s.id='ev-hologram-visual-style';
  s.textContent=`
/* The reference look is a projection floating in open space — NOT a picture card. */
#evPhotoPanel{
  background:rgba(0,0,0,.18)!important;
  backdrop-filter:blur(1px)!important;
}
#evPhotoPanel .ev-carousel{
  background:radial-gradient(ellipse at 50% 52%,rgba(67,255,231,.10),transparent 34%),transparent!important;
  overflow:visible!important;
  perspective:1200px!important;
}
#evPhotoPanel .ev-grid{
  gap:0!important;
  padding-left:10vw!important;
  padding-right:10vw!important;
}
/* No card, no border, no green rectangle. The image itself is the projection. */
#evPhotoPanel .ev-card,
#evPhotoPanel .ev-card.active,
#evPhotoPanel .ev-card:not(.active){
  flex-basis:76vw!important;
  max-width:520px!important;
  height:min(62vh,500px)!important;
  min-height:260px!important;
  background:transparent!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
  outline:0!important;
  overflow:visible!important;
  padding:0!important;
  isolation:isolate!important;
  transform-style:preserve-3d!important;
  transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .45s ease,filter .45s ease!important;
}
#evPhotoPanel .ev-card.active{
  opacity:1!important;
  filter:none!important;
  transform:scale(1.04) translateZ(35px)!important;
  animation:evHoloFloat 4.8s ease-in-out infinite!important;
}
/* Turn the real photo into a luminous glass/OLED projection. Dark areas nearly
   disappear while the brighter subject remains visible through the dark UI. */
#evPhotoPanel .ev-card img,
#evPhotoPanel .ev-card.active img{
  position:relative!important;
  z-index:1!important;
  display:block!important;
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  object-position:center!important;
  opacity:.62!important;
  mix-blend-mode:screen!important;
  filter:grayscale(1) contrast(1.65) brightness(1.28) saturate(0)
    drop-shadow(0 0 3px rgba(116,255,240,.95))
    drop-shadow(0 0 12px rgba(68,255,230,.55))
    drop-shadow(0 0 34px rgba(68,255,230,.20))!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.55) 7%,#000 18%,#000 82%,rgba(0,0,0,.45) 95%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);
  -webkit-mask-composite:source-in;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.55) 7%,#000 18%,#000 82%,rgba(0,0,0,.45) 95%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);
  mask-composite:intersect;
}
/* Soft cyan projection haze around the image without drawing a rectangle. */
#evPhotoPanel .ev-card:before{
  content:''!important;
  position:absolute!important;
  z-index:0!important;
  inset:8% 8%!important;
  border:0!important;
  border-radius:50%!important;
  background:radial-gradient(ellipse,rgba(76,255,232,.18) 0%,rgba(76,255,232,.08) 34%,transparent 72%)!important;
  filter:blur(22px)!important;
  box-shadow:0 0 65px rgba(76,255,232,.14),0 0 140px rgba(76,255,232,.07)!important;
  pointer-events:none!important;
  animation:evHoloGlow 3.5s ease-in-out infinite!important;
}
/* Scan/reflection texture floats over the projection, with no frame around it. */
#evPhotoPanel .ev-card:after{
  content:''!important;
  position:absolute!important;
  z-index:4!important;
  inset:5% 6%!important;
  border:0!important;
  background:
    repeating-linear-gradient(to bottom,rgba(190,255,248,.055) 0,rgba(190,255,248,.055) 1px,transparent 1px,transparent 8px),
    linear-gradient(105deg,transparent 18%,rgba(225,255,250,.15) 46%,rgba(225,255,250,.025) 53%,transparent 74%)!important;
  mix-blend-mode:screen!important;
  opacity:.46!important;
  pointer-events:none!important;
  animation:evHoloScan 3.8s linear infinite,evHoloFlicker 6s steps(10,end) infinite!important;
}
/* Hide HUD corner lines that made the projection look like a card. */
#evPhotoPanel .ev-card .ev-corners,
#evPhotoPanel .ev-card.active .ev-corners{
  display:none!important;
}
/* Captions float underneath the projection rather than sitting in a card footer. */
#evPhotoPanel .ev-cap{
  z-index:6!important;
  bottom:-20px!important;
  padding:0!important;
  background:transparent!important;
  border:0!important;
  color:rgba(190,255,247,.76)!important;
  text-shadow:0 0 6px rgba(92,255,235,.95),0 0 18px rgba(92,255,235,.30)!important;
}
/* Neighboring images are ghost projections, not cards beside the main one. */
#evPhotoPanel .ev-card.prev,
#evPhotoPanel .ev-card.next{
  opacity:.14!important;
  filter:blur(1px)!important;
  transform:scale(.72) translateZ(-130px)!important;
}
#evPhotoPanel .ev-card.prev img,
#evPhotoPanel .ev-card.next img{
  opacity:.24!important;
  mix-blend-mode:screen!important;
  filter:grayscale(1) contrast(1.35) brightness(1.15) drop-shadow(0 0 16px rgba(73,255,231,.25))!important;
}
#evPhotoPanel .ev-carousel:after{
  left:18%!important;
  right:18%!important;
  top:auto!important;
  bottom:8%!important;
  height:18%!important;
  border:0!important;
  border-radius:50%!important;
  transform:none!important;
  background:radial-gradient(ellipse,rgba(65,255,230,.14),transparent 68%)!important;
  box-shadow:0 0 90px rgba(60,255,230,.10)!important;
  opacity:.8!important;
}
@keyframes evHoloScan{
  0%{background-position:0 -60px,120% 0}
  100%{background-position:0 70px,-30% 0}
}
@keyframes evHoloFlicker{
  0%,100%{opacity:.43}
  48%{opacity:.50}
  50%{opacity:.30}
  52%{opacity:.55}
  76%{opacity:.40}
}
@keyframes evHoloGlow{
  0%,100%{opacity:.48;transform:scale(.96)}
  50%{opacity:.82;transform:scale(1.05)}
}
@keyframes evHoloFloat{
  0%,100%{transform:scale(1.04) translateY(0) translateZ(35px)}
  50%{transform:scale(1.055) translateY(-8px) translateZ(48px)}
}
@media(max-width:700px){
  #evPhotoPanel .ev-grid{padding-left:8vw!important;padding-right:8vw!important}
  #evPhotoPanel .ev-card,#evPhotoPanel .ev-card.active,#evPhotoPanel .ev-card:not(.active){
    flex-basis:84vw!important;
    height:56vh!important;
    max-width:none!important;
  }
  #evPhotoPanel .ev-card.active img{
    opacity:.56!important;
    filter:grayscale(1) contrast(1.7) brightness(1.30) drop-shadow(0 0 3px rgba(116,255,240,.95)) drop-shadow(0 0 13px rgba(68,255,230,.48))!important;
  }
  #evPhotoPanel .ev-cap{bottom:-16px!important}
}
`;
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.EVHologramVisuals={install};
})();
