/* E.V. HOLOGRAM VISUALS — transparent projected-photo treatment */
(function(){'use strict';
function install(){
  if(document.getElementById('ev-hologram-visual-style')) return;
  const s=document.createElement('style');
  s.id='ev-hologram-visual-style';
  s.textContent=`
/* Make the selected visual feel like a projection floating in the air.
   The original photo remains visible, but its dark/solid card is removed. */
#evPhotoPanel .ev-card{
  background:transparent!important;
  border-color:rgba(86,255,218,.28)!important;
  box-shadow:0 0 22px rgba(46,255,205,.10),0 0 90px rgba(46,255,205,.055),inset 0 0 35px rgba(46,255,205,.035)!important;
  isolation:isolate;
  overflow:visible!important;
  transition:transform .34s ease,opacity .34s ease,filter .34s ease,box-shadow .34s ease!important;
}
#evPhotoPanel .ev-card.active{
  background:rgba(20,80,65,.025)!important;
  box-shadow:0 0 20px rgba(83,255,220,.34),0 0 75px rgba(54,255,205,.18),0 0 150px rgba(54,255,205,.07),inset 0 0 50px rgba(54,255,205,.06)!important;
  animation:evHoloFloat 3.8s ease-in-out infinite;
}
/* Cyan/teal projection instead of a normal photograph. */
#evPhotoPanel .ev-card img,
#evPhotoPanel .ev-card.active img{
  position:relative;
  z-index:1;
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
  opacity:.48!important;
  mix-blend-mode:screen!important;
  filter:grayscale(1) sepia(.18) hue-rotate(112deg) saturate(4.8) brightness(1.42) contrast(1.22)!important;
  transform:scale(1.015);
  /* fade the projected image into the transparent air */
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.42) 5%,rgba(0,0,0,.92) 22%,rgba(0,0,0,.88) 78%,rgba(0,0,0,.24) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 8%,#000 92%,transparent 100%);
  -webkit-mask-composite:source-in;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.42) 5%,rgba(0,0,0,.92) 22%,rgba(0,0,0,.88) 78%,rgba(0,0,0,.24) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 8%,#000 92%,transparent 100%);
  mask-composite:intersect;
}
/* Bright hologram edges and a moving light field. */
#evPhotoPanel .ev-card:before{
  z-index:4!important;
  inset:-8px!important;
  border:1px solid rgba(113,255,226,.68)!important;
  border-radius:16px!important;
  box-shadow:0 0 9px rgba(73,255,219,.62),0 0 28px rgba(73,255,219,.28),0 0 70px rgba(73,255,219,.10),inset 0 0 24px rgba(73,255,219,.08)!important;
  animation:evHoloEdge 2.2s ease-in-out infinite!important;
}
#evPhotoPanel .ev-card:after{
  z-index:3!important;
  inset:-3px!important;
  background:
    repeating-linear-gradient(to bottom,rgba(192,255,244,.22) 0,rgba(192,255,244,.22) 1px,transparent 1px,transparent 5px),
    linear-gradient(90deg,transparent 0%,rgba(106,255,224,.04) 42%,rgba(190,255,245,.20) 50%,rgba(106,255,224,.04) 58%,transparent 100%),
    linear-gradient(to bottom,transparent 0%,rgba(72,255,210,.04) 44%,rgba(180,255,242,.14) 50%,rgba(72,255,210,.04) 56%,transparent 100%)!important;
  background-size:100% 100%,100% 100%,100% 100%!important;
  mix-blend-mode:screen!important;
  opacity:.70!important;
  pointer-events:none!important;
  animation:evHoloScan 2.4s linear infinite,evHoloFlicker 4.2s steps(9,end) infinite!important;
}
/* Extra transparent "ghost" projection to mimic the floating/glass look. */
#evPhotoPanel .ev-card.active .ev-corners{
  border-color:rgba(150,255,236,.38)!important;
  box-shadow:0 0 16px rgba(70,255,220,.25),inset 0 0 22px rgba(70,255,220,.07)!important;
}
#evPhotoPanel .ev-card.active .ev-corners:after{
  content:'';
  position:absolute;
  inset:7%;
  border:1px solid rgba(120,255,230,.14);
  border-radius:8px;
  box-shadow:0 0 35px rgba(75,255,220,.10);
  pointer-events:none;
}
/* Side cards become faint ghost projections, like neighboring holographic choices. */
#evPhotoPanel .ev-card.prev img,#evPhotoPanel .ev-card.next img{
  opacity:.18!important;
  filter:grayscale(1) sepia(.2) hue-rotate(112deg) saturate(4) brightness(1.1) contrast(1.12)!important;
}
#evPhotoPanel .ev-card:not(.active){
  background:transparent!important;
  box-shadow:0 0 35px rgba(54,255,205,.055)!important;
}
#evPhotoPanel .ev-card:not(.active) .ev-cap{opacity:.22!important}
#evPhotoPanel .ev-cap{
  z-index:5!important;
  color:#d8fff7!important;
  text-shadow:0 0 8px rgba(78,255,220,.95),0 0 22px rgba(78,255,220,.38)!important;
  background:linear-gradient(transparent,rgba(0,24,19,.32),transparent)!important;
}
/* Floating projection glow underneath the selected visual. */
#evPhotoPanel .ev-carousel:after{
  box-shadow:0 0 90px rgba(50,255,210,.12),0 0 170px rgba(50,255,210,.06)!important;
}
@keyframes evHoloScan{0%{background-position:0 -35px,0 0,0 -40px}100%{background-position:0 55px,0 0,0 40px}}
@keyframes evHoloFlicker{0%,100%{opacity:.68}48%{opacity:.74}50%{opacity:.48}52%{opacity:.76}76%{opacity:.63}}
@keyframes evHoloEdge{0%,100%{opacity:.68;filter:brightness(1)}50%{opacity:.92;filter:brightness(1.35)}}
@keyframes evHoloFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
@media(max-width:700px){
  #evPhotoPanel .ev-card img,#evPhotoPanel .ev-card.active img{opacity:.43!important}
  #evPhotoPanel .ev-card.active{animation-duration:4.2s}
}
`;
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.EVHologramVisuals={install};
})();
