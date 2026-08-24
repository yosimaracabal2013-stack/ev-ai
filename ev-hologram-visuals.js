/* E.V. HOLOGRAM VISUALS — transparent OLED-style photo projection */
(function(){'use strict';
function install(){
  if(document.getElementById('ev-hologram-visual-style')) return;
  const s=document.createElement('style');
  s.id='ev-hologram-visual-style';
  s.textContent=`
/* Transparent-OLED look: keep the real photo visible while making it feel like
   a floating glass projection. The photo is NOT replaced or generated. */
#evPhotoPanel{
  background:radial-gradient(circle at 50% 46%,rgba(40,230,205,.09),transparent 34%),rgba(1,7,8,.30)!important;
  backdrop-filter:blur(2px)!important;
}
#evPhotoPanel .ev-carousel{
  background:radial-gradient(circle at 50% 48%,rgba(50,255,230,.055),transparent 42%)!important;
}
#evPhotoPanel .ev-card{
  background:transparent!important;
  border:1px solid rgba(130,255,238,.34)!important;
  box-shadow:0 0 18px rgba(65,255,225,.12),0 0 70px rgba(65,255,225,.055),inset 0 0 30px rgba(65,255,225,.025)!important;
  isolation:isolate;
  overflow:visible!important;
  transition:transform .42s cubic-bezier(.2,.8,.2,1),opacity .42s ease,filter .42s ease,box-shadow .42s ease!important;
}
#evPhotoPanel .ev-card.active{
  background:rgba(8,28,28,.025)!important;
  box-shadow:0 0 16px rgba(100,255,238,.42),0 0 55px rgba(65,255,225,.16),0 0 120px rgba(65,255,225,.07),inset 0 0 35px rgba(65,255,225,.045)!important;
  animation:evHoloFloat 4.8s ease-in-out infinite;
}
/* Keep the original image colors. Lower opacity + screen blending creates the
   see-through display effect instead of turning the whole photo green. */
#evPhotoPanel .ev-card img,
#evPhotoPanel .ev-card.active img{
  position:relative;
  z-index:1;
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
  opacity:.58!important;
  mix-blend-mode:screen!important;
  filter:saturate(1.04) brightness(1.12) contrast(1.08)!important;
  transform:scale(1.012);
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.50) 6%,#000 20%,#000 80%,rgba(0,0,0,.38) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);
  -webkit-mask-composite:source-in;
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.50) 6%,#000 20%,#000 80%,rgba(0,0,0,.38) 96%,transparent 100%),linear-gradient(to right,transparent 0%,#000 7%,#000 93%,transparent 100%);
  mask-composite:intersect;
}
/* Thin cyan projection frame — like light emitted from glass rather than a
   normal solid picture card. */
#evPhotoPanel .ev-card:before{
  z-index:4!important;
  inset:-9px!important;
  border:1px solid rgba(136,255,241,.72)!important;
  border-radius:16px!important;
  box-shadow:0 0 7px rgba(92,255,235,.75),0 0 25px rgba(92,255,235,.30),0 0 62px rgba(92,255,235,.10),inset 0 0 20px rgba(92,255,235,.055)!important;
  animation:evHoloEdge 2.8s ease-in-out infinite!important;
}
/* Moving scan/reflection across the transparent surface. */
#evPhotoPanel .ev-card:after{
  z-index:3!important;
  inset:0!important;
  background:
    repeating-linear-gradient(to bottom,rgba(205,255,250,.12) 0,rgba(205,255,250,.12) 1px,transparent 1px,transparent 6px),
    linear-gradient(105deg,transparent 25%,rgba(220,255,250,.13) 48%,rgba(220,255,250,.04) 53%,transparent 70%),
    linear-gradient(to bottom,transparent 0%,transparent 43%,rgba(170,255,245,.11) 50%,transparent 57%)!important;
  mix-blend-mode:screen!important;
  opacity:.62!important;
  pointer-events:none!important;
  animation:evHoloScan 3.6s linear infinite,evHoloFlicker 5.5s steps(9,end) infinite!important;
}
/* Corner lines and an inner glass boundary. */
#evPhotoPanel .ev-card.active .ev-corners{
  border-color:rgba(174,255,246,.40)!important;
  box-shadow:0 0 12px rgba(92,255,235,.22),inset 0 0 20px rgba(92,255,235,.055)!important;
}
#evPhotoPanel .ev-card.active .ev-corners:after{
  content:'';
  position:absolute;
  inset:8%;
  border:1px solid rgba(155,255,244,.12);
  border-radius:8px;
  box-shadow:0 0 28px rgba(80,255,230,.08);
  pointer-events:none;
}
/* Neighboring choices float behind the selected projection. */
#evPhotoPanel .ev-card.prev,#evPhotoPanel .ev-card.next{
  opacity:.25!important;
  filter:saturate(.72) brightness(.78)!important;
}
#evPhotoPanel .ev-card.prev img,#evPhotoPanel .ev-card.next img{
  opacity:.30!important;
  filter:saturate(.82) brightness(.92)!important;
}
#evPhotoPanel .ev-card:not(.active){
  background:transparent!important;
  box-shadow:0 0 28px rgba(65,255,225,.045)!important;
}
#evPhotoPanel .ev-card:not(.active) .ev-cap{opacity:.18!important}
#evPhotoPanel .ev-cap{
  z-index:5!important;
  color:#d9fffa!important;
  text-shadow:0 0 7px rgba(92,255,235,.9),0 0 18px rgba(92,255,235,.28)!important;
  background:linear-gradient(transparent,rgba(0,18,18,.20),transparent)!important;
}
#evPhotoPanel .ev-carousel:after{
  box-shadow:0 0 70px rgba(60,255,230,.09),0 0 150px rgba(60,255,230,.035)!important;
}
@keyframes evHoloScan{0%{background-position:0 -40px,120% 0,0 -45px}100%{background-position:0 55px,-30% 0,0 45px}}
@keyframes evHoloFlicker{0%,100%{opacity:.60}48%{opacity:.67}50%{opacity:.45}52%{opacity:.70}76%{opacity:.57}}
@keyframes evHoloEdge{0%,100%{opacity:.62;filter:brightness(1)}50%{opacity:.94;filter:brightness(1.30)}}
@keyframes evHoloFloat{0%,100%{translate:0 0}50%{translate:0 -6px}}
@media(max-width:700px){
  #evPhotoPanel .ev-card img,#evPhotoPanel .ev-card.active img{opacity:.52!important}
  #evPhotoPanel .ev-card.active{animation-duration:5.2s}
}
`;
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.EVHologramVisuals={install};
})();
