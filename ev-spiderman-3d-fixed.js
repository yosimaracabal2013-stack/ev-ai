/* E.V. Spider-Man 3D viewer — fixed
   Uses only Three.js core primitives (no CapsuleGeometry dependency).
   Intercepts Spider-Man visual requests before the old photo feed opens.
*/
(function(){
  'use strict';

  const SUITS=[
    {name:'Advanced Suit 2.0',body:0x26302f,accent:0xc92e3a,web:0xe6eeee},
    {name:'Classic Suit',body:0xb51f2a,accent:0x17232d,web:0xdde7e8},
    {name:'Black Suit',body:0x101416,accent:0x465055,web:0x9ed8d0},
    {name:'Symbiote Suit',body:0x080a0b,accent:0x20272b,web:0xe8f4f0},
    {name:'Iron Spider Suit',body:0x8d202b,accent:0xc7a24f,web:0x252426},
    {name:'Arachknight Suit',body:0x182331,accent:0x748b9c,web:0xe7eff1},
    {name:'Tactical Suit',body:0x20272a,accent:0xa72d35,web:0x94a6a8},
    {name:'Stealth Suit',body:0x081011,accent:0x365255,web:0x69d7cf}
  ];

  let idx=0, THREE=null, scene=null, camera=null, renderer=null, controls=null, model=null, started=false;

  function style(){
    if(document.getElementById('ev3dFixedStyle')) return;
    const s=document.createElement('style');
    s.id='ev3dFixedStyle';
    s.textContent=`
#ev3dFixed{position:fixed;inset:0;z-index:50000;display:none;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,rgba(60,255,225,.14),transparent 42%),#020806;color:#eafff5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
#ev3dFixed.open{display:block}
#ev3dFixed:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(158,232,197,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(158,232,197,.035) 1px,transparent 1px);background-size:34px 34px;pointer-events:none}
.ev3f-top{position:relative;z-index:10;height:58px;padding:10px 14px;border-bottom:1px solid rgba(158,232,197,.18);display:flex;align-items:center;justify-content:space-between;box-sizing:border-box}.ev3f-title{font-size:10px;letter-spacing:2.5px;color:#b8ffdd}.ev3f-btn{background:rgba(2,12,9,.7);border:1px solid rgba(158,232,197,.35);color:#cffff0;border-radius:8px;padding:9px 12px;font:9px ui-monospace;letter-spacing:1.5px}.ev3f-hud{position:absolute;z-index:10;top:72px;left:14px;right:14px;display:flex;justify-content:space-between;font-size:8px;letter-spacing:1.6px;color:#72c99f}.ev3f-stage{position:absolute;inset:90px 0 98px;touch-action:none}.ev3f-stage canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block}.ev3f-floor{position:absolute;z-index:1;left:50%;bottom:5%;width:66%;height:18%;transform:translateX(-50%) rotateX(67deg);border:1px solid rgba(93,255,231,.38);border-radius:50%;box-shadow:0 0 45px rgba(70,255,230,.18),inset 0 0 30px rgba(70,255,230,.08);pointer-events:none}.ev3f-beam{position:absolute;z-index:1;left:50%;top:8%;bottom:8%;width:2px;transform:translateX(-50%);background:linear-gradient(transparent,rgba(89,255,231,.25),transparent);box-shadow:0 0 30px rgba(70,255,230,.25);pointer-events:none}.ev3f-ring{position:absolute;z-index:1;left:50%;top:51%;width:220px;height:220px;transform:translate(-50%,-50%);border:1px solid rgba(125,255,237,.12);border-radius:50%;box-shadow:0 0 35px rgba(70,255,230,.06);pointer-events:none}.ev3f-name{position:absolute;z-index:4;left:50%;bottom:1%;transform:translateX(-50%);width:90%;text-align:center;font-size:11px;letter-spacing:2px;text-shadow:0 0 12px rgba(92,255,235,.9);pointer-events:none}.ev3f-name small{display:block;margin-top:6px;font-size:7px;color:#67a98a;letter-spacing:1.4px}.ev3f-arrow{position:absolute;z-index:20;top:52%;transform:translateY(-50%);width:40px;height:66px;background:rgba(2,12,9,.35);border:1px solid rgba(158,232,197,.3);border-radius:9px;color:#cffff0;font-size:30px}.ev3f-prev{left:6px}.ev3f-next{right:6px}.ev3f-chips{position:absolute;z-index:20;bottom:35px;left:50%;transform:translateX(-50%);display:flex;gap:5px;max-width:94vw;overflow-x:auto;padding:4px;scrollbar-width:none}.ev3f-chip{flex:0 0 auto;background:rgba(3,13,9,.7);border:1px solid rgba(158,232,197,.18);color:#8fc6aa;border-radius:6px;padding:7px 9px;font:7px ui-monospace}.ev3f-chip.on{color:#d9fff3;border-color:rgba(128,255,242,.75);box-shadow:0 0 12px rgba(78,255,231,.22)}.ev3f-hint{position:absolute;z-index:20;bottom:8px;left:0;right:0;text-align:center;color:#5e9b7f;font-size:7px;letter-spacing:1.3px}@media(max-width:700px){.ev3f-title{font-size:9px}.ev3f-arrow{width:34px;height:56px}.ev3f-ring{width:190px;height:190px}.ev3f-stage{inset:88px 0 94px}.ev3f-name{font-size:10px}}
`;
    document.head.appendChild(s);
  }

  function mat(c,metal,rough){return new THREE.MeshStandardMaterial({color:c,metalness:metal==null?.3:metal,roughness:rough==null?.5:rough,emissive:0x06130f,emissiveIntensity:.22})}
  function cyl(r,h,m){return new THREE.Mesh(new THREE.CylinderGeometry(r,r*.92,h,20),m)}
  function sph(r,m){return new THREE.Mesh(new THREE.SphereGeometry(r,24,16),m)}
  function limb(a,b,r,m){const d=new THREE.Vector3().subVectors(b,a),o=cyl(r,d.length(),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
  function buildSuit(s){
    const g=new THREE.Group(),body=mat(s.body,.35,.48),acc=mat(s.accent,.5,.38),web=mat(s.web,.2,.52),dark=mat(0x080c0c,.3,.6);
    const torso=cyl(.57,1.18,body);torso.position.y=1.55;g.add(torso);
    const chest=sph(.59,body);chest.scale.set(.98,1.05,.68);chest.position.y=1.63;g.add(chest);
    const head=sph(.42,body);head.position.y=2.62;g.add(head);
    const neck=cyl(.24,.2,dark);neck.position.y=2.25;g.add(neck);
    const hips=new THREE.Mesh(new THREE.BoxGeometry(.72,.38,.44),body);hips.position.y=.86;g.add(hips);
    for(const side of [-1,1]){
      const sh=new THREE.Vector3(side*.62,1.95,0),el=new THREE.Vector3(side*.77,1.35,.03),ha=new THREE.Vector3(side*.84,.78,.08);
      g.add(limb(sh,el,.2,body),limb(el,ha,.17,body));const glove=sph(.18,acc);glove.position.copy(ha);g.add(glove);
      const hip=new THREE.Vector3(side*.29,.78,0),k=new THREE.Vector3(side*.31,.05,.03),foot=new THREE.Vector3(side*.32,-.62,.13);
      g.add(limb(hip,k,.23,body),limb(k,foot,.18,body));const boot=new THREE.Mesh(new THREE.BoxGeometry(.28,.2,.55),acc);boot.position.copy(foot);g.add(boot);
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.13,16,8),mat(0xffffff,.1,.25));eye.scale.set(.8,.55,.18);eye.position.set(side*.16,2.69,.36);g.add(eye);
    }
    const emblem=new THREE.Group();const spine=cyl(.055,.38,acc);spine.position.y=1.74;emblem.add(spine);
    for(let i=-2;i<=2;i++){const y=i*.065;emblem.add(limb(new THREE.Vector3(-.05,y,0),new THREE.Vector3(-.25,y+i*.03,0),.012,acc));emblem.add(limb(new THREE.Vector3(.05,y,0),new THREE.Vector3(.25,y+i*.03,0),.012,acc))}
    emblem.position.set(0,1.7,.59);emblem.scale.set(1.2,1.2,1.2);g.add(emblem);
    for(const y of [2.42,2.56,2.70,1.25,1.48,1.71,1.94]){const r=y>2?.39:.53;const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.012,6,48),web);ring.rotation.x=Math.PI/2;ring.position.y=y;g.add(ring)}
    return g;
  }
  function renderSuit(){
    if(!model)return;while(model.children.length)model.remove(model.children[0]);model.add(buildSuit(SUITS[idx]));
    const n=document.getElementById('ev3fName');if(n)n.innerHTML=SUITS[idx].name+'<small>MARVEL’S SPIDER-MAN 2 · 3D HOLOGRAPHIC RECREATION</small>';
    const c=document.getElementById('ev3fCount');if(c)c.textContent=(idx+1)+' / '+SUITS.length;
    document.querySelectorAll('.ev3f-chip').forEach((b,i)=>b.classList.toggle('on',i===idx));
  }
  function change(n){idx=(idx+n+SUITS.length)%SUITS.length;renderSuit()}

  async function loadThree(){
    if(window.THREE){THREE=window.THREE;return}
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/three@0.152.2/examples/js/controls/OrbitControls.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
    THREE=window.THREE;
  }

  function init(){
    if(started)return;started=true;
    const stage=document.getElementById('ev3fStage');
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,Math.max(1,stage.clientWidth)/Math.max(1,stage.clientHeight),.1,100);camera.position.set(0,1.35,5.1);
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(stage.clientWidth,stage.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;stage.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0x9affdc,.8));const key=new THREE.PointLight(0x63ffe1,12,9);key.position.set(0,2.5,3);scene.add(key);const rim=new THREE.PointLight(0x4ca0ff,8,8);rim.position.set(-3,2,-2);scene.add(rim);
    controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3.0;controls.maxDistance=7;controls.target.set(0,1.1,0);
    model=new THREE.Group();scene.add(model);renderSuit();
    window.addEventListener('resize',()=>{if(!renderer)return;camera.aspect=Math.max(1,stage.clientWidth)/Math.max(1,stage.clientHeight);camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight)}, {passive:true});
    (function loop(){requestAnimationFrame(loop);if(controls)controls.update();renderer.render(scene,camera)})();
  }

  function makeUI(){
    style();let p=document.getElementById('ev3dFixed');if(p)return p;
    p=document.createElement('section');p.id='ev3dFixed';
    p.innerHTML='<div class="ev3f-top"><div class="ev3f-title">E.V. // HOLOGRAPHIC SUIT ARCHIVE</div><button class="ev3f-btn" id="ev3fClose">CLOSE</button></div><div class="ev3f-hud"><span>● 3D SUIT DATABASE ONLINE</span><span id="ev3fCount">1 / 8</span></div><div class="ev3f-stage" id="ev3fStage"><div class="ev3f-beam"></div><div class="ev3f-ring"></div><div class="ev3f-floor"></div><div class="ev3f-name" id="ev3fName"></div></div><button class="ev3f-arrow ev3f-prev" id="ev3fPrev">‹</button><button class="ev3f-arrow ev3f-next" id="ev3fNext">›</button><div class="ev3f-chips" id="ev3fChips"></div><div class="ev3f-hint">DRAG TO ROTATE · PINCH / SCROLL TO ZOOM · SWIPE OR USE ARROWS TO CHANGE SUIT</div>';
    document.body.appendChild(p);
    document.getElementById('ev3fClose').onclick=()=>p.classList.remove('open');document.getElementById('ev3fPrev').onclick=()=>change(-1);document.getElementById('ev3fNext').onclick=()=>change(1);
    const chips=document.getElementById('ev3fChips');SUITS.forEach((s,i)=>{const b=document.createElement('button');b.className='ev3f-chip';b.textContent=s.name;b.onclick=()=>{idx=i;renderSuit()};chips.appendChild(b)});
    return p;
  }

  async function open(){
    const p=makeUI();p.classList.add('open');
    if(!started){try{await loadThree();init()}catch(e){const n=document.getElementById('ev3fName');if(n)n.textContent='3D CORE FAILED TO LOAD — TAP CLOSE AND TRY AGAIN';console.error('E.V. 3D:',e)}}
  }

  function isSpider(q){q=(q||'').toLowerCase().replace(/[\u2019']/g,"'");return /spider\s*-?\s*man|spiderman|peter\s*parker/.test(q)}

  function intercept(){
    document.addEventListener('submit',function(e){
      const form=e.target;if(!form||!form.matches('#composer'))return;
      const input=document.getElementById('input');const q=input?input.value:'';
      if(isSpider(q)){e.preventDefault();e.stopImmediatePropagation();open();}
    },true);
    document.addEventListener('click',function(e){
      const b=e.target&&e.target.closest?e.target.closest('button'):null;if(!b)return;
      const text=(b.textContent||'').toLowerCase();if(!/search|send/.test(text))return;
      const fields=[...document.querySelectorAll('input,textarea')];const q=fields.map(x=>x.value||'').join(' ');if(!isSpider(q))return;
      setTimeout(()=>open(),0);
    },true);
    window.EVSpider3DFixed={open};
  }

  style();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',intercept,{once:true});else intercept();
})();
