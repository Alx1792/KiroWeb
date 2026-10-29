import * as THREE from 'three';
import { WORLD_RADIUS, clamp } from '../core/constants.js';
import { createBeyView } from './BeyFactory.js';
import { createCharacterView } from './CharacterFactory.js';

const Y_AXIS=new THREE.Vector3(0,1,0);
const colorMaterial=(color,metalness=.65,roughness=.28,emissive='#000000')=>new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:.35});
const disposeObject=(object)=>object?.traverse((child)=>{ if (child.geometry) child.geometry.dispose(); if (child.material) (Array.isArray(child.material)?child.material:[child.material]).forEach((material)=>material.dispose()); });

export class Renderer3D {
  constructor(canvas,assets) {
    this.canvas=canvas; this.assets=assets; this.clockTime=0; this.beyViews=[]; this.projectileViews=new Set(); this.effects=[]; this.detached=[]; this.preview=null; this.cameraShake=0; this.shakeEnabled=true; this.lowMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#030713'); this.scene.fog=new THREE.FogExp2('#050816',.012);
    this.camera=new THREE.PerspectiveCamera(43,1,.1,240); this.camera.position.set(0,52,62); this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.18;
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.root=new THREE.Group(); this.scene.add(this.root);
    this.addLights(); this.addEnvironment(); this.setQuality('high');
    this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(canvas); this.resize();
  }

  addLights() {
    this.scene.add(new THREE.HemisphereLight('#8ebdff','#16091f',1.4));
    const key=new THREE.DirectionalLight('#ffffff',3.4); key.position.set(-24,48,26); key.castShadow=true; key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-50; key.shadow.camera.right=50; key.shadow.camera.top=50; key.shadow.camera.bottom=-50; this.scene.add(key);
    const blue=new THREE.PointLight('#298cff',45,110); blue.position.set(30,18,18); this.scene.add(blue);
    const red=new THREE.PointLight('#ff315c',35,90); red.position.set(-30,12,-20); this.scene.add(red);
  }

  addEnvironment() {
    const grid=new THREE.GridHelper(180,36,'#18326a','#0c1734'); grid.position.y=-4.2; this.scene.add(grid);
    const starsGeometry=new THREE.BufferGeometry(); const positions=[];
    for (let i=0;i<450;i++) { const radius=55+Math.random()*100,angle=Math.random()*Math.PI*2; positions.push(Math.cos(angle)*radius,15+Math.random()*85,Math.sin(angle)*radius); }
    starsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    this.stars=new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:'#8cb5ff',size:.3,sizeAttenuation:true})); this.scene.add(this.stars);
  }

  setQuality(quality) {
    this.quality=quality; const ratio=quality==='low'?1:quality==='medium'?Math.min(devicePixelRatio,1.35):Math.min(devicePixelRatio,1.8);
    this.renderer.setPixelRatio(ratio); this.renderer.shadowMap.enabled=quality!=='low'; this.resize();
  }
  setEffectsOptions(options) { this.shakeEnabled=options.shake!==false&&!this.lowMotion; }
  resize() { const width=this.canvas.clientWidth||innerWidth,height=this.canvas.clientHeight||innerHeight; this.camera.aspect=width/Math.max(1,height); this.camera.updateProjectionMatrix(); this.renderer.setSize(width,height,false); }

  clearRoot() {
    for (const child of [...this.root.children]) { this.root.remove(child); disposeObject(child); }
    this.beyViews=[]; this.characterViews=[]; this.projectileViews.clear(); this.effects=[]; this.detached=[]; this.preview=null;
  }

  showShowroom(character) {
    if (this.mode==='showroom'&&this.preview?.userData.characterId===character?.id) return;
    this.mode='showroom'; this.clearRoot(); this.scene.background=new THREE.Color(character?.series==='burst'?'#070d28':'#100821');
    const platform=new THREE.Mesh(new THREE.CylinderGeometry(21,24,2.8,64),colorMaterial('#182958',.85,.2)); platform.position.y=-2.3; platform.receiveShadow=true; this.root.add(platform);
    const rings=new THREE.Mesh(new THREE.TorusGeometry(18,.3,10,96),new THREE.MeshBasicMaterial({color:character?.accent||'#4de8ff'})); rings.rotation.x=Math.PI/2; rings.position.y=-.75; this.root.add(rings);
    if (character) {
      const avatar=createCharacterView(character); avatar.position.set(-9,-.7,1); avatar.rotation.y=.22; this.root.add(avatar);
      const bey=createBeyView(character); bey.group.scale.setScalar(1.65); bey.group.position.set(10,2,0); this.root.add(bey.group);
      this.preview=bey.group; this.preview.userData.characterId=character.id; this.avatar=avatar;
      this.tryExternalModel('beys',character,bey);
      this.tryExternalCharacter(character,avatar);
    }
    this.camera.position.set(0,18,48); this.camera.lookAt(0,4,0);
  }

  async tryExternalModel(type,character,view) {
    const asset=await this.assets.load(type,character.id);if(!asset||!view.group.parent)return;
    view.external=asset.model;view.group.add(asset.model);view.visualRoot.visible=false;
    if(this.assets.hasCompleteBurstParts(asset)){view.burstPieces=Object.values(asset.pieces);view.externalBurst=true}
  }

  async tryExternalCharacter(character,fallback) {
    const asset=await this.assets.load('characters',character.id);if(!asset||!fallback.parent)return;
    const procedural=[...fallback.children];fallback.add(asset.model);procedural.forEach((child)=>child.visible=false);fallback.userData.external=asset.model;
  }

  async tryExternalArena(stadium,arenaRoot) {
    const asset=await this.assets.load('arenas',stadium.id);if(!asset||!arenaRoot.parent)return;
    asset.model.userData.decorativeArena=true;arenaRoot.add(asset.model);
  }

  buildStadium(stadium) {
    const group=new THREE.Group(); group.userData.stadium=true;
    const base=new THREE.Mesh(new THREE.CylinderGeometry(WORLD_RADIUS+4,WORLD_RADIUS+7,4,96),colorMaterial(stadium.rimD,.82,.3)); base.position.y=-3; base.receiveShadow=true; group.add(base);
    const floorMaterial=colorMaterial(stadium.floor,stadium.hazard==='ice'?.3:.68,stadium.hazard==='ice'?.08:.34);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(WORLD_RADIUS,96),floorMaterial); floor.rotation.x=-Math.PI/2; floor.position.y=-.92; floor.receiveShadow=true; group.add(floor);
    const inner=new THREE.Mesh(new THREE.RingGeometry(10,WORLD_RADIUS-7,96),new THREE.MeshStandardMaterial({color:stadium.floor2,metalness:.5,roughness:.4,side:THREE.DoubleSide})); inner.rotation.x=-Math.PI/2; inner.position.y=-.88; group.add(inner);
    const wallGeometry=new THREE.BoxGeometry(3.45,3.8,1.25); const wallMaterial=colorMaterial(stadium.rim,.8,.22,stadium.rim);
    const transforms=[];
    for (let degree=0;degree<360;degree+=5) {
      const angle=degree*Math.PI/180;
      const exit=stadium.exits.some(([center,width])=>Math.abs(Math.atan2(Math.sin(angle-center*Math.PI/180),Math.cos(angle-center*Math.PI/180)))<width*Math.PI/180);
      if (!exit) transforms.push(angle);
    }
    const walls=new THREE.InstancedMesh(wallGeometry,wallMaterial,transforms.length); walls.castShadow=true; walls.receiveShadow=true;
    const dummy=new THREE.Object3D(); transforms.forEach((angle,i)=>{ dummy.position.set(Math.cos(angle)*(WORLD_RADIUS+1),1,Math.sin(angle)*(WORLD_RADIUS+1)); dummy.rotation.y=-angle; dummy.updateMatrix(); walls.setMatrixAt(i,dummy.matrix); }); group.add(walls);
    for (const [center,width] of stadium.exits) for (const edge of [-1,1]) { const angle=(center+width*edge)*Math.PI/180; const marker=new THREE.Mesh(new THREE.BoxGeometry(.55,4.1,2),colorMaterial('#ffd84a',.5,.2,'#ffd84a')); marker.position.set(Math.cos(angle)*WORLD_RADIUS,1.1,Math.sin(angle)*WORLD_RADIUS); marker.rotation.y=-angle; group.add(marker); }
    this.addHazardVisual(group,stadium);
    return group;
  }

  addHazardVisual(group,stadium) {
    if (stadium.hazard==='lava') { const lava=new THREE.Mesh(new THREE.RingGeometry(WORLD_RADIUS-7,WORLD_RADIUS,96),new THREE.MeshBasicMaterial({color:'#ff4a12',side:THREE.DoubleSide})); lava.rotation.x=-Math.PI/2; lava.position.y=-.72; lava.userData.animate='lava'; group.add(lava); }
    if (stadium.hazard==='hole') { const hole=new THREE.Mesh(new THREE.CircleGeometry(6.2,48),new THREE.MeshBasicMaterial({color:'#000000'})); hole.rotation.x=-Math.PI/2; hole.position.y=-.66; group.add(hole); const halo=new THREE.Mesh(new THREE.TorusGeometry(6.4,.35,10,64),new THREE.MeshBasicMaterial({color:'#ff2a6b'})); halo.rotation.x=Math.PI/2; halo.position.y=-.55; halo.userData.animate='hole'; group.add(halo); }
    if (stadium.hazard==='rails') for (const angle of [0,Math.PI]) { const rail=new THREE.Mesh(new THREE.TorusGeometry(WORLD_RADIUS-5,.5,8,32,Math.PI*.7),new THREE.MeshBasicMaterial({color:'#4de8ff'})); rail.rotation.x=Math.PI/2; rail.rotation.z=angle-.35*Math.PI; rail.position.y=-.55; rail.userData.animate='rail'; group.add(rail); }
    if (stadium.hazard==='poison') { const poison=new THREE.Mesh(new THREE.CircleGeometry(9,48),new THREE.MeshBasicMaterial({color:'#47e53d',transparent:true,opacity:.35,side:THREE.DoubleSide})); poison.rotation.x=-Math.PI/2; poison.position.y=-.62; poison.userData.animate='poison'; group.add(poison); }
  }

  startBattle(simulation) {
    this.mode='battle'; this.clearRoot(); this.simulation=simulation; this.scene.background=new THREE.Color(simulation.stadium.bg); this.scene.fog.color.set(simulation.stadium.bg);
    this.stadiumView=this.buildStadium(simulation.stadium); this.root.add(this.stadiumView); this.tryExternalArena(simulation.stadium,this.stadiumView);
    this.beyViews=simulation.entities.map((entity)=>{ const view=createBeyView(entity.character); this.root.add(view.group); this.tryExternalModel('beys',entity.character,view); return view; });
    this.characterViews=simulation.entities.map((entity,index)=>{const avatar=createCharacterView(entity.character);avatar.scale.setScalar(.55);avatar.position.set(index?-47:47,-1,index?10:-10);avatar.rotation.y=index?-Math.PI/2:Math.PI/2;this.root.add(avatar);this.tryExternalCharacter(entity.character,avatar);return avatar});
    this.camera.position.set(0,51,57); this.camera.lookAt(0,0,0);
  }

  syncBattle(simulation,alpha) {
    if (this.mode!=='battle'||this.simulation!==simulation) this.startBattle(simulation);
    simulation.entities.forEach((entity,index)=>{
      const view=this.beyViews[index]; if (!view) return;
      const x=THREE.MathUtils.lerp(entity.previousX,entity.x,alpha),z=THREE.MathUtils.lerp(entity.previousZ,entity.z,alpha);
      view.group.position.set(x,entity.out?-entity.fall*13:0,z);
      view.group.rotation.y=entity.rotation;
      const spin=clamp(entity.spin/entity.maxSpin,0,1),wobble=(1-spin)*.24+(1-entity.stability)*.22;
      view.group.rotation.x=Math.sin(this.clockTime*(6+spin*12)+index)*wobble;
      view.group.rotation.z=Math.cos(this.clockTime*(7+spin*10)+index)*wobble;
      view.group.scale.setScalar(entity.out?Math.max(.1,1-entity.fall*.7):1);
      view.group.visible=!entity.burst;
      const energized=Object.values(entity.effects).some((value)=>value>0);
      view.group.traverse((mesh)=>{ if(mesh.isMesh&&mesh.material?.emissive) mesh.material.emissiveIntensity=energized?.75:(mesh.userData.baseEmissive||.05); });
    });
    this.characterViews.forEach((avatar,index)=>{
      const winner=simulation.point?.winner,launching=simulation.phase==='launch';
      avatar.position.y=-1+Math.sin(this.clockTime*2+index)*.08;
      avatar.rotation.z=winner===index?Math.sin(this.clockTime*7)*.07:(winner===(1-index)?.16:0);
      avatar.traverse((part)=>{if(part.userData.arm){const side=part.userData.arm;part.rotation.z=launching?side*(.65+Math.sin(this.clockTime*5)*.15):winner===index?side*1.15:side*.22;part.rotation.x=launching?-.75:0}});
    });
    const activeProjectiles=new Set(simulation.projectiles);
    for (const projectile of this.projectileViews) if (!activeProjectiles.has(projectile)) { this.root.remove(projectile.view); disposeObject(projectile.view); this.projectileViews.delete(projectile); }
    for (const projectile of simulation.projectiles) {
      if (!projectile.view) { const mesh=new THREE.Mesh(new THREE.SphereGeometry(.65,10,8),new THREE.MeshBasicMaterial({color:projectile.kind==='blade'?'#b66cff':'#ff6a18'})); mesh.userData.projectile=true; this.root.add(mesh); projectile.view=mesh; this.projectileViews.add(projectile); }
      projectile.view.position.set(projectile.x,1.5,projectile.z);
    }
    this.updateCamera(simulation);
  }

  updateCamera(simulation) {
    if(simulation.phase==='special'&&simulation.pendingSpecial!==null){const attacker=simulation.entities[simulation.pendingSpecial],opponent=simulation.entities[1-simulation.pendingSpecial],midpoint=new THREE.Vector3((attacker.x+opponent.x)/2,1.8,(attacker.z+opponent.z)/2),direction=new THREE.Vector3(attacker.x-opponent.x,0,attacker.z-opponent.z).normalize();const cinematic=midpoint.clone().addScaledVector(direction,13);cinematic.y=13;this.camera.position.lerp(cinematic,.14);this.camera.lookAt(attacker.x,1.8,attacker.z);return}
    const alive=simulation.entities.filter((entry)=>!entry.out&&!entry.burst); if (!alive.length) return;
    const center=alive.reduce((acc,entry)=>acc.add(new THREE.Vector3(entry.x,0,entry.z)),new THREE.Vector3()).multiplyScalar(1/alive.length);
    const spread=alive.length===2?Math.hypot(alive[0].x-alive[1].x,alive[0].z-alive[1].z):20;
    const targetPosition=new THREE.Vector3(center.x*.15,clamp(43+spread*.28,46,57),center.z*.15+clamp(48+spread*.16,51,62));
    this.camera.position.lerp(targetPosition,.035); this.camera.lookAt(center.x*.12,0,center.z*.12);
  }

  handleEvents(events) {
    for (const event of events) {
      if (event.type==='roundStart'&&event.round>1) { this.startBattle(this.simulation); continue; }
      if (event.type==='hit'||event.type==='projectileHit'||event.type==='wallHit') { this.spawnSparks(event.x??this.simulation.entities[event.side].x,event.z??this.simulation.entities[event.side].z,event.force||55,event.type==='projectileHit'?'#ff8a24':'#fff2a6'); if(this.shakeEnabled)this.cameraShake=Math.max(this.cameraShake,Math.min(1.2,(event.force||35)/90)); }
      if (event.type==='shockwave') this.spawnRing(event.x,event.z,event.color);
      if (event.type==='specialStart'&&this.shakeEnabled) this.cameraShake=Math.max(this.cameraShake,.7);
      if (event.type==='specialApplied') this.spawnSpecialEffect(event.side,event.kind);
      if (event.type==='burst') this.explodeBey(event.side);
    }
  }

  spawnSpecialEffect(side,kind) {
    const entity=this.simulation.entities[side],color=entity.character.accent,x=entity.x,z=entity.z;
    if(['absorb','vortex','nemesis','slow'].includes(kind)){for(let ring=0;ring<3;ring++){const aura=new THREE.Mesh(new THREE.TorusGeometry(2.8+ring*.7,.12,8,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85}));aura.position.set(x,1.2+ring*.65,z);aura.rotation.set(Math.PI/2,ring*.6,0);this.root.add(aura);this.effects.push({mesh:aura,aura:true,life:1+ring*.12})}}
    else if(['wall','zone','balance'].includes(kind)){const shield=new THREE.Mesh(new THREE.SphereGeometry(4.4,20,14),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.65}));shield.position.set(x,2,z);this.root.add(shield);this.effects.push({mesh:shield,aura:true,life:1.25})}
    else if(kind==='heal'||kind==='overdrive'){for(let index=0;index<14;index++){const spark=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),new THREE.MeshBasicMaterial({color:index%2?color:'#ffffff'}));spark.position.set(x+(Math.random()-.5)*5,.4+Math.random()*2,z+(Math.random()-.5)*5);this.root.add(spark);this.effects.push({mesh:spark,velocity:new THREE.Vector3(0,3+Math.random()*5,0),life:.7+Math.random()*.5})}}
    else {this.spawnRing(x,z,color);this.spawnRing(x,z,entity.character.color2);this.spawnSparks(x,z,95,color)}
  }

  spawnSparks(x,z,force,color) {
    const count=this.lowMotion?3:this.quality==='low'?5:Math.min(22,6+Math.floor(force/7));
    for (let i=0;i<count;i++) { const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.12,0),new THREE.MeshBasicMaterial({color})); mesh.position.set(x,2.3,z); const velocity=new THREE.Vector3((Math.random()-.5)*force*.12,2+Math.random()*6,(Math.random()-.5)*force*.12); this.root.add(mesh); this.effects.push({mesh,velocity,life:.35+Math.random()*.35}); }
  }

  spawnRing(x,z,color) { const mesh=new THREE.Mesh(new THREE.TorusGeometry(1,.16,8,48),new THREE.MeshBasicMaterial({color,transparent:true})); mesh.rotation.x=Math.PI/2; mesh.position.set(x,1,z); this.root.add(mesh); this.effects.push({mesh,ring:true,life:.65}); }

  explodeBey(side) {
    const view=this.beyViews[side]; if (!view||view.exploded) return; view.exploded=true;
    if(view.external&&!view.externalBurst){view.external.visible=false;view.visualRoot.visible=true}
    const parts=view.externalBurst?view.burstPieces:Object.values(view.pieces),count=parts.length;
    view.group.updateMatrixWorld(true);
    for (const [index,part] of parts.entries()) {
      this.root.attach(part);part.visible=true;part.rotation.x+=Math.random()*2;part.rotation.z+=Math.random()*2;
      const angle=index/count*Math.PI*2+Math.random()*.45;
      this.detached.push({mesh:part,velocity:new THREE.Vector3(Math.cos(angle)*(12+Math.random()*11),7+Math.random()*10,Math.sin(angle)*(12+Math.random()*11)),spin:new THREE.Vector3(Math.random()*8,Math.random()*8,Math.random()*8),life:2.4});
    }
    view.group.visible=false;const origin=view.group.position;this.spawnSparks(origin.x,origin.z,150,view.group.userData.characterId==='rago'?'#ff2a6b':'#ffd84a');
  }

  updateEffects(dt) {
    for (const effect of this.effects) { effect.life-=dt; if(effect.ring){effect.mesh.scale.multiplyScalar(1+dt*9);effect.mesh.material.opacity=clamp(effect.life/.65,0,1);}else if(effect.aura){effect.mesh.rotation.y+=dt*3;effect.mesh.scale.multiplyScalar(1+dt*.7);effect.mesh.material.opacity=clamp(effect.life,0,.75);}else{effect.velocity.y-=19*dt;effect.mesh.position.addScaledVector(effect.velocity,dt);} if(effect.life<=0){this.root.remove(effect.mesh);disposeObject(effect.mesh);} }
    this.effects=this.effects.filter((effect)=>effect.life>0);
    for (const piece of this.detached) { piece.life-=dt; piece.velocity.y-=18*dt; piece.mesh.position.addScaledVector(piece.velocity,dt); piece.mesh.rotation.x+=piece.spin.x*dt; piece.mesh.rotation.y+=piece.spin.y*dt; piece.mesh.rotation.z+=piece.spin.z*dt; if(piece.mesh.position.y<0){piece.mesh.position.y=0;piece.velocity.y=Math.abs(piece.velocity.y)*.35;} if(piece.life<=0){this.root.remove(piece.mesh);disposeObject(piece.mesh);} }
    this.detached=this.detached.filter((piece)=>piece.life>0);
  }

  render(dt,simulation=null,alpha=0) {
    this.clockTime+=dt; this.stars.rotation.y+=dt*.006;
    if (this.mode==='showroom'&&this.preview) { this.preview.rotation.y+=dt*1.8; this.preview.position.y=2+Math.sin(this.clockTime*2)*.3; if(this.avatar){this.avatar.rotation.y=.22+Math.sin(this.clockTime*.7)*.04;this.avatar.position.y=-.7+Math.sin(this.clockTime*1.4)*.12;} }
    if (simulation) this.syncBattle(simulation,alpha);
    this.root.traverse((object)=>{ if(object.userData.animate==='lava') object.material.color.setHSL(.04+Math.sin(this.clockTime*3)*.015,1,.52); if(object.userData.animate==='hole') object.rotation.z+=dt*.8; if(object.userData.animate==='rail') object.material.opacity=.7+Math.sin(this.clockTime*5)*.3; if(object.userData.animate==='poison') object.scale.setScalar(1+Math.sin(this.clockTime*2)*.08); });
    this.updateEffects(dt);this.cameraShake=Math.max(0,this.cameraShake-dt*3.5);const cameraPosition=this.camera.position.clone();if(this.cameraShake>0)this.camera.position.add(new THREE.Vector3((Math.random()-.5)*this.cameraShake,(Math.random()-.5)*this.cameraShake*.5,(Math.random()-.5)*this.cameraShake));this.renderer.render(this.scene,this.camera);this.camera.position.copy(cameraPosition);
  }
}
