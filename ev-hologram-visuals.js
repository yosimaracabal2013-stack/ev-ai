/* E.V. HOLOGRAM VISUALS — true transparent projection look */
(function(){'use strict';
function install(){
  if(document.getElementById('ev-hologram-visual-style')) return;
  const s=document.createElement('style');
  s.id='ev-hologram-visual-style';
  s.textContent=`
/*
  IMPORTANT: this styles the real search result image. It does not generate,
  replace, or alter the source photo. The goal is to make the image itself
  look like it is being projected from transparent glass, matching the
  reference: dark/see-through surroundings, cyan luminous edges, faint scan
  lines, glow, and floating depth.
*/
#evPhotoPanel{
  background:
    radial-gradient(ellipse at 50% 52%,rgba(75,255,235,.13),transparent 30%),
    radial-gradient(ellipse at 50% 50%,rgba(30,180,170,.07),transparent 58%),
    transparent!important;
  backdrop-filter:none!important;
}
#evPhotoPanel .ev-carousel{
  background:transparent!important;
  overflow:visible!important;
  perspective:1100px!important;
}
/* The reference is NOT a normal web card. Remove the heavy frame and let the
   photograph float in the dark like a transparent projection. */
#evPhotoPanel .ev-card{
  background:transparent!important;
  border:0!important;
  border-radius:4px!important;
  box-shadow:none!important;
  overflow:visible!important;
  isolation:isolate!important;
  transform-style:preserve-3d!important;
  transition:transform .55s cubic-bezier(.2,.8,.2,1),opacity .5s ease,filter .5s ease!important;
}
#evPhotoPanel .ev-card.active{
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  animation:evHoloFloat 4.6s ease-in-out infinite!important;
}
/* Make the actual photo luminous and translucent instead of looking like a
   framed screenshot. Screen blending lets the dark background show through. */
#evPhotoPanel .ev-card img,
#evPhotoPanel .ev-card.active img{
  position:relative!important;
  z-index:1!important;
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  object-position:center!important;
  opacity:.72!important;
  mix-blend-mode:screen!important;
  filter:
    saturate(.48)
    brightness(1.22)
    contrast(1.10)
    drop-shadow(0 0 3px rgba(105,255,241,.95))
    drop-shadow(0 0 15px rgba(73,255,231,.32))!important;
  transform:translateZ(18px) scale(1.015)!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.48) 5%,#000 17%,#000 83%,rgba(0,0,0,.40) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 5%,#000 95%,transparent 100%);
  -webkit-mask-composite:source-in;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.48) 5%,#000 17%,#000 83%,rgba(0,0,0,.40) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 5%,#000 95%,transparent 100%);
  mask-composite:intersect;
}
/* Cyan luminous silhouette around the real photograph — like the edges of a
   transparent OLED projection, not a physical picture frame. */
#evPhotoPanel .ev-card:before{
  content:''!important;
  position:absolute!important;
  z-index:3!important;
  inset:-7px!important;
  border:1px solid rgba(128,255,242,.32)!important;
  border-radius:5px!important;
  background:transparent!important;
  box-shadow:
    0 0 5px rgba(115,255,240,.65),
    0 0 20px rgba(78,255,231,.25),
    0 0 65px rgba(78,255,231,.08),
    inset 0 0 22px rgba(78,255,231,.035)!important;
  pointer-events:none!important;
  animation:evHoloEdge 2.7s ease-in-out infinite!important;
}
/* Transparent scan texture + one moving reflection, directly over the photo. */
#evPhotoPanel .ev-card:after{
  content:''!important;
  position:absolute!important;
  z-index:4!important;
  inset:-1px!important;
  background:
    repeating-linear-gradient(to bottom,rgba(190,255,248,.075) 0,rgba(190,255,248,.075) 1px,transparent 1px,transparent 7px),
    linear-gradient(104deg,transparent 24%,rgba(225,255,250,.18) 47%,rgba(225,255,250,.035) 54%,transparent 72%),
    radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(75,255,235,.10) 100%)!important;
  mix-blend-mode:screen!important;
  opacity:.56!important;
  pointer-events:none!important;
  animation:evHoloScan 3.2s linear infinite,evHoloFlicker 5.8s steps(10,end) infinite!important;
}
/* Thin HUD corners instead of a chunky card outline. */
#evPhotoPanel .ev-card.active .ev-corners{
  border-color:rgba(160,255,246,.42)!important;
  box-shadow:0 0 14px rgba(92,255,235,.24)!important;
}
#evPhotoPanel .ev-card.active .ev-corners:after{
  content:''!important;
  position:absolute!important;
  inset:4%!important;
  border:1px solid rgba(155,255,244,.07)!important;
  border-radius:2px!important;
  box-shadow:0 0 30px rgba(80,255,230,.06)!important;
  pointer-events:none!important;
}
/* Other results become ghosted projections sitting behind the selected one. */
#evPhotoPanel .ev-card.prev,
#evPhotoPanel .ev-card.next{
  opacity:.20!important;
  filter:saturate(.30) brightness(.72) blur(.2px)!important;
  transform:translateZ(-90px) scale(.86)!important;
}
#evPhotoPanel .ev-card.prev img,
#evPhotoPanel .ev-card.next img{
  opacity:.28!important;
  mix-blend-mode:screen!important;
  filter:saturate(.25) brightness(1.05) drop-shadow(0 0 12px rgba(73,255,231,.22))!important;
}
#evPhotoPanel .ev-card:not(.active){
  background:transparent!important;
  box-shadow:none!important;
}
#evPhotoPanel .ev-card:not(.active) .ev-cap{opacity:.14!important}
#evPhotoPanel .ev-cap{
  z-index:6!important;
  color:rgba(190,255,247,.82)!important;
  text-shadow:0 0 6px rgba(92,255,235,.95),0 0 18px rgba(92,255,235,.32)!important;
  background:linear-gradient(transparent,rgba(0,12,12,.10),transparent)!important;
  border:0!important;
}
/* A soft projected pool underneath gives the same floating-on-glass feeling as
   the reference without pretending the phone has a physical transparent OLED. */
#evPhotoPanel .ev-carousel:after{
  background:radial-gradient(ellipse at center,rgba(65,255,230,.16) 0%,rgba(65,255,230,.07) 20%,transparent 65%)!important;
  box-shadow:0 0 90px rgba(60,255,230,.11),0 0 180px rgba(60,255,230,.035)!important;
  opacity:.8!important;
}
@keyframes evHoloScan{
  0%{background-position:0 -45px,120% 0,0 0}
  100%{background-position:0 65px,-30% 0,0 0}
}
@keyframes evHoloFlicker{
  0%,100%{opacity:.54}
  48%{opacity:.61}
  50%{opacity:.40}
  52%{opacity:.66}
  76%{opacity:.50}
}
@keyframes evHoloEdge{
  0%,100%{opacity:.50;filter:brightness(1)}
  50%{opacity:.88;filter:brightness(1.35)}
}
@keyframes evHoloFloat{
  0%,100%{transform:translateY(0) translateZ(18px) scale(1.015)}
  50%{transform:translateY(-7px) translateZ(28px) scale(1.02)}
}
@media(max-width:700px){
  #evPhotoPanel .ev-card img,#evPhotoPanel .ev-card.active img{
    opacity:.66!important;
    filter:saturate(.42) brightness(1.18) contrast(1.08) drop-shadow(0 0 3px rgba(105,255,241,.95)) drop-shadow(0 0 13px rgba(73,255,231,.30))!important;
  }
  #evPhotoPanel .ev-card:before{inset:-5px!important}
  #evPhotoPanel .ev-card.active{animation-duration:5.1s!important}
}
`;
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.EVHologramVisuals={install};
})();
