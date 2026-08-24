/* E.V. HOLOGRAM VISUALS — turns the selected photo into a projected holographic display */
(function(){'use strict';
function install(){
  if(document.getElementById('ev-hologram-visual-style')) return;
  const s=document.createElement('style');
  s.id='ev-hologram-visual-style';
  s.textContent=`
/* The photo itself is projected, not rendered as a normal solid card. */
#evPhotoPanel .ev-card{
  background:rgba(20,55,43,.06)!important;
  border-color:rgba(158,232,197,.28)!important;
  box-shadow:0 0 35px rgba(60,255,174,.10),inset 0 0 35px rgba(60,255,174,.035)!important;
  isolation:isolate;
  overflow:visible!important;
  transition:transform .34s ease,opacity .34s ease,filter .34s ease,box-shadow .34s ease!important;
}
#evPhotoPanel .ev-card.active{
  box-shadow:0 0 18px rgba(83,255,190,.28),0 0 75px rgba(54,255,167,.16),inset 0 0 45px rgba(54,255,167,.08)!important;
}
#evPhotoPanel .ev-card img,
#evPhotoPanel .ev-card.active img{
  position:relative;
  z-index:1;
  opacity:.68!important;
  mix-blend-mode:screen!important;
  filter:grayscale(.82) sepia(.58) hue-rotate(88deg) saturate(2.8) brightness(1.12) contrast(1.16)!important;
  transform:scale(1.015);
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.96) 8%,rgba(0,0,0,.96) 90%,transparent 100%);
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.96) 8%,rgba(0,0,0,.96) 90%,transparent 100%);
}
/* Fine scanlines and a faint projection shimmer over the image. */
#evPhotoPanel .ev-card:after{
  z-index:3!important;
  background:
    repeating-linear-gradient(to bottom,rgba(190,255,225,.13) 0,rgba(190,255,225,.13) 1px,transparent 1px,transparent 5px),
    linear-gradient(90deg,transparent 0%,rgba(130,255,205,.08) 48%,transparent 52%),
    linear-gradient(to bottom,transparent 0%,rgba(40,255,160,.10) 48%,transparent 52%,rgba(2,9,6,.35) 100%)!important;
  background-size:100% 100%,100% 100%,100% 100%!important;
  mix-blend-mode:screen!important;
  opacity:.62!important;
  animation:evHoloScan 2.7s linear infinite,evHoloFlicker 4.8s steps(8,end) infinite!important;
}
#evPhotoPanel .ev-card:before{
  z-index:4!important;
  border-color:rgba(129,255,210,.72)!important;
  box-shadow:0 0 12px rgba(57,255,170,.38),0 0 40px rgba(57,255,170,.13),inset 0 0 28px rgba(57,255,170,.09)!important;
  animation:evHoloEdge 2.2s ease-in-out infinite!important;
}
/* Ghosted side projections make the selector feel like a floating 3-D display. */
#evPhotoPanel .ev-card.prev img,#evPhotoPanel .ev-card.next img{opacity:.34!important;filter:grayscale(.9) sepia(.7) hue-rotate(88deg) saturate(2.4) brightness(.9) contrast(1.12)!important}
#evPhotoPanel .ev-card:not(.active) .ev-cap{opacity:.35!important}
#evPhotoPanel .ev-cap{
  z-index:5!important;
  color:#cffff0!important;
  text-shadow:0 0 10px rgba(77,255,184,.9),0 0 24px rgba(77,255,184,.35)!important;
  background:linear-gradient(transparent,rgba(3,30,20,.55))!important;
}
/* A soft projected glow beneath the selected object. */
#evPhotoPanel .ev-card.active::marker{display:none}
#evPhotoPanel .ev-card.active{animation:evHoloFloat 3.8s ease-in-out infinite}
#evPhotoPanel .ev-card.active .ev-corners{border-color:rgba(170,255,220,.34)!important;box-shadow:0 0 18px rgba(70,255,180,.16),inset 0 0 18px rgba(70,255,180,.05)!important}
#evPhotoPanel .ev-carousel:after{
  box-shadow:0 0 80px rgba(50,255,170,.08),0 0 150px rgba(50,255,170,.05)!important;
}
@keyframes evHoloScan{0%{background-position:0 0,0 -30px,0 0}100%{background-position:0 55px,0 30px,0 0}}
@keyframes evHoloFlicker{0%,100%{opacity:.56}48%{opacity:.62}50%{opacity:.43}52%{opacity:.66}76%{opacity:.57}}
@keyframes evHoloEdge{50%{opacity:.72;filter:brightness(1.3)}}
@keyframes evHoloFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
@media(max-width:700px){
  #evPhotoPanel .ev-card img,#evPhotoPanel .ev-card.active img{opacity:.64!important}
  #evPhotoPanel .ev-card.active{animation-duration:4.2s}
}
`;
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.EVHologramVisuals={install};
})();
