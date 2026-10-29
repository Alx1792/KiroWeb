import * as THREE from 'three';

const DESIGNS={
  gingka:{label:'Cosmic Pegasus',motif:'pegasus',blades:3,tip:'attack',disc:3.05,primary:'#1764e8',secondary:'#e7edf8',detail:'#e93742'},
  kyoya:{label:'Fang Leone',motif:'lion',blades:5,tip:'defense',disc:3.25,primary:'#168844',secondary:'#e3c232',detail:'#f2f2e8'},
  ryuga:{label:'L-Drago Destructor',motif:'dragon',blades:3,tip:'attack',disc:3.2,primary:'#bd1820',secondary:'#e7bd2d',detail:'#23232a'},
  kenta:{label:'Flame Sagittario',motif:'arrows',blades:3,tip:'stamina',disc:2.95,primary:'#ec6717',secondary:'#f3cd5a',detail:'#a9161d'},
  chris:{label:'Phantom Orion',motif:'bearing',blades:6,tip:'bearing',disc:3.35,primary:'#159aca',secondary:'#d9f4ff',detail:'#182866'},
  king:{label:'Variares',motif:'axes',blades:6,tip:'balance',disc:3.2,primary:'#d9af12',secondary:'#aa211c',detail:'#ecebf2'},
  aguma:{label:'Scythe Kronos',motif:'scythes',blades:4,tip:'stamina',disc:3.3,primary:'#3e3e5b',secondary:'#8ad3ee',detail:'#e8edf2'},
  dynamis:{label:'Jade Jupiter',motif:'orbs',blades:5,tip:'defense',disc:3.15,primary:'#13a98d',secondary:'#e9f2ee',detail:'#7131c2'},
  rago:{label:'Diablo Nemesis',motif:'nemesis',blades:4,tip:'balance',disc:3.5,primary:'#3c1359',secondary:'#e61d59',detail:'#e3bd00'},
  valt:{label:'God Valkyrie / Genesis Valtryek V3',motif:'valkyrie',blades:3,tip:'reboot',disc:3.05,primary:'#175cdd',secondary:'#eef4ff',detail:'#e92f49'},
  shu:{label:'Legend Spriggan / Legend Spryzen S3',motif:'spriggan',blades:4,tip:'balance',disc:3.18,primary:'#c92335',secondary:'#eeeeee',detail:'#efbe26'},
  lui:{label:'Nightmare Longinus / Lúinor L3',motif:'longinus',blades:2,tip:'attack',disc:3.42,primary:'#eeeeee',secondary:'#61238e',detail:'#c91938'},
  free:{label:'Drain Fafnir F3',motif:'fafnir',blades:3,tip:'stamina',disc:3.2,primary:'#dab31e',secondary:'#159485',detail:'#bc2f3b'},
  xander:{label:'Sieg Xcalibur / Surge Xcalius X3',motif:'xcalibur',blades:1,tip:'attack',disc:3.28,primary:'#d72924',secondary:'#dfb72c',detail:'#17191f'},
  rantaro:{label:'Blaze Ragnaruk / Roktavor R3',motif:'ragnaruk',blades:8,tip:'stamina',disc:3.15,primary:'#e57915',secondary:'#a8d128',detail:'#e9edf2'},
  daigo:{label:'Killer Deathscyther / Doomscizor D3',motif:'doomscizor',blades:4,tip:'attack',disc:3.22,primary:'#1b1d24',secondary:'#7938ac',detail:'#d8dce5'},
  zac:{label:'Galaxy Zeus / Zeutron Z3',motif:'zeus',blades:6,tip:'bearing',disc:3.22,primary:'#ddb21f',secondary:'#eee8d2',detail:'#7b36b3'},
  silas:{label:'Kreis Satan / Kinetic Satomb S3',motif:'satan',blades:5,tip:'defense',disc:3.28,primary:'#278d48',secondary:'#54237d',detail:'#d9dee7'},
  serpent:{label:'Wind Serpent CC0',motif:'serpent',blades:6,tip:'balance',disc:3.2,primary:'#22a9c7',secondary:'#7d2ed0',detail:'#d9f7ff'},
};

const mat=(color,metalness=.72,roughness=.24,emissive=null)=>new THREE.MeshStandardMaterial({color,metalness,roughness,emissive:emissive||'#000000',emissiveIntensity:emissive?.18:0});
const mesh=(geometry,material,parent,position=[0,0,0],rotation=[0,0,0])=>{const object=new THREE.Mesh(geometry,material);object.position.set(...position);object.rotation.set(...rotation);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object};
const radial=(parent,object,index,count,radius,y=2.65,offset=0)=>{const angle=offset+index/count*Math.PI*2;object.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius);object.rotation.y=-angle;parent.add(object);return object};
function extruded(points,depth,material){const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))shape.lineTo(x,y);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.12,bevelThickness:.1,bevelSegments:1});geometry.center();const object=new THREE.Mesh(geometry,material);object.rotation.x=Math.PI/2;object.castShadow=true;object.receiveShadow=true;return object}

function addTip(group,profile,materials){
  if(profile.tip==='attack'){mesh(new THREE.CylinderGeometry(1.2,1.5,.5,20),materials.detail,group,[0,.55,0]);mesh(new THREE.CylinderGeometry(1.25,1.25,.35,20),materials.rubber,group,[0,.16,0])}
  else if(profile.tip==='stamina'){mesh(new THREE.ConeGeometry(.92,2.25,20),materials.secondary,group,[0,.65,0],[Math.PI,0,0]);mesh(new THREE.SphereGeometry(.38,12,8),materials.metal,group,[0,-.43,0])}
  else if(profile.tip==='bearing'){mesh(new THREE.CylinderGeometry(1.28,1.05,1.55,24),materials.secondary,group,[0,.48,0]);mesh(new THREE.SphereGeometry(.58,16,10),materials.metal,group,[0,-.42,0])}
  else if(profile.tip==='reboot'){mesh(new THREE.CylinderGeometry(1.35,1.55,.9,20),materials.detail,group,[0,.36,0]);mesh(new THREE.ConeGeometry(.72,1.25,16),materials.rubber,group,[0,-.35,0],[Math.PI,0,0])}
  else {mesh(new THREE.ConeGeometry(1.35,1.75,20),materials.secondary,group,[0,.42,0],[Math.PI,0,0]);mesh(new THREE.SphereGeometry(.48,14,10),materials.rubber,group,[0,-.34,0])}
}
function addDisc(group,profile,materials){
  mesh(new THREE.CylinderGeometry(profile.disc,profile.disc-.25,.78,48),materials.metal,group,[0,1.38,0]);
  mesh(new THREE.TorusGeometry(profile.disc-.38,.27,8,48),materials.dark,group,[0,1.78,0],[Math.PI/2,0,0]);
  const weights=profile.motif==='longinus'?2:profile.motif==='xcalibur'?1:profile.blades;
  for(let i=0;i<weights;i++){const weight=mesh(new THREE.BoxGeometry(profile.motif==='xcalibur'?2.4:.75,.42,.7),materials.secondary,new THREE.Group());radial(group,weight,i,weights,profile.disc-.35,1.38,.15)}
}
function baseLayer(group,profile,materials){
  mesh(new THREE.CylinderGeometry(2.48,2.7,.72,32),materials.primary,group,[0,2.3,0]);
  mesh(new THREE.TorusGeometry(2.15,.35,10,40),materials.secondary,group,[0,2.72,0],[Math.PI/2,0,0]);
  mesh(new THREE.CylinderGeometry(.85,1.12,.5,20),materials.detail,group,[0,3.03,0]);
}
function addMotif(group,profile,materials){
  const wing=[[0,-.48],[1.35,-.82],[2.45,-.38],[2.8,.08],[1.55,.72],[.2,.5]];
  const fang=[[0,-.38],[1.45,-.55],[2.45,0],[1.35,.5],[.45,.34]];
  const dragon=[[0,-.55],[1.15,-.76],[2.25,-.28],[2.65,.35],[1.6,.25],[1.15,.8],[.2,.52]];
  const arrow=[[0,-.4],[1.35,-.42],[1.35-.0,-.85],[2.55,0],[1.35,.85],[1.35,.42],[0,.4]];
  const scythe=[[0,-.33],[1.15,-.65],[2.55,-.2],[1.45,.12],[2.05,.82],[.85,.5]];
  const sword=[[0,-.5],[2.75,-.58],[3.55,0],[2.75,.58],[0,.5],[-.4,0]];
  const profiles={pegasus:wing,valkyrie:wing,lion:fang,dragon,longinus:dragon,fafnir:dragon,serpent:dragon,arrows:arrow,scythes:scythe,doomscizor:scythe,xcalibur:sword,axes:fang,nemesis:fang,spriggan:wing,ragnaruk:wing,zeus:wing,satan:fang,bearing:wing,orbs:fang};
  const shape=profiles[profile.motif]||wing,count=profile.blades;
  for(let i=0;i<count;i++){
    const material=i%2?materials.secondary:materials.primary,blade=extruded(shape,.38,material);radial(group,blade,i,count,1.75,2.72,profile.motif==='spriggan'?Math.PI/4:0);
    if(['pegasus','valkyrie','dragon','longinus','nemesis','xcalibur'].includes(profile.motif)){const gem=mesh(new THREE.OctahedronGeometry(.36,0),materials.detail,new THREE.Group());radial(group,gem,i,count,3.05,3.02)}
  }
  if(profile.motif==='lion')for(let i=0;i<5;i++){const tooth=mesh(new THREE.ConeGeometry(.32,1.35,7),materials.secondary,new THREE.Group(),[0,0,0],[0,0,Math.PI/2]);radial(group,tooth,i,5,3.25,2.65)}
  if(profile.motif==='bearing')for(let i=0;i<6;i++){const bearing=mesh(new THREE.SphereGeometry(.34,12,8),materials.metal,new THREE.Group());radial(group,bearing,i,6,2.95,2.74)}
  if(profile.motif==='orbs')for(let i=0;i<5;i++){const orb=mesh(new THREE.SphereGeometry(.48,14,10),i%2?materials.detail:materials.secondary,new THREE.Group());radial(group,orb,i,5,3.0,2.85)}
  if(profile.motif==='fafnir')for(let i=0;i<3;i++){const rubber=mesh(new THREE.BoxGeometry(1.45,.5,.44),materials.rubber,new THREE.Group());radial(group,rubber,i,3,2.7,2.98,.3)}
  if(profile.motif==='satan')for(let i=0;i<5;i++){const roller=mesh(new THREE.SphereGeometry(.45,12,8),materials.secondary,new THREE.Group());radial(group,roller,i,5,3.15,2.82)}
  if(profile.motif==='zeus')for(let i=0;i<6;i++){const orb=mesh(new THREE.SphereGeometry(.31,12,8),materials.detail,new THREE.Group());radial(group,orb,i,6,3.2,2.9)}
  if(profile.motif==='nemesis'){mesh(new THREE.TorusGeometry(3.2,.25,8,32),materials.detail,group,[0,2.82,0],[Math.PI/2,0,0]);for(let i=0;i<4;i++){const spike=mesh(new THREE.ConeGeometry(.42,1.6,6),materials.detail,new THREE.Group(),[0,0,0],[0,0,Math.PI/2]);radial(group,spike,i,4,3.45,2.85,Math.PI/4)}}
}

export function createBeyView(character){
  const profile=DESIGNS[character.id]||{label:character.bey,motif:'wing',blades:6,tip:'balance',disc:3.1,primary:character.color,secondary:character.color2,detail:character.accent};
  const group=new THREE.Group(),visualRoot=new THREE.Group(),pieces={layer:new THREE.Group(),disc:new THREE.Group(),driver:new THREE.Group()};
  group.userData.characterId=character.id;group.userData.design=profile.label;group.add(visualRoot);for(const [name,piece] of Object.entries(pieces)){piece.name=`Bey_${name[0].toUpperCase()+name.slice(1)}`;piece.userData.part=name;visualRoot.add(piece)}
  const materials={primary:mat(profile.primary),secondary:mat(profile.secondary,.55,.27),detail:mat(profile.detail,.68,.2,profile.detail),metal:mat('#aeb8c9',.96,.1),dark:mat('#242936',.88,.2),rubber:mat(profile.detail,.05,.8)};
  addTip(pieces.driver,profile,materials);addDisc(pieces.disc,profile,materials);baseLayer(pieces.layer,profile,materials);addMotif(pieces.layer,profile,materials);
  visualRoot.traverse((object)=>{if(object.isMesh)object.userData.baseEmissive=object.material.emissiveIntensity||0});
  return {group,visualRoot,pieces,burstPieces:Object.values(pieces),profile,external:null};
}
export { DESIGNS as BEY_DESIGNS };
