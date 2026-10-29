import * as THREE from 'three';

const CHARACTERS={
  gingka:{hair:'spiky',spikes:9,accent:'#245fcf',accessory:'headband',build:1},
  kyoya:{hair:'mane',spikes:11,accent:'#d6be3b',accessory:'fur',build:1.08},
  ryuga:{hair:'long',spikes:7,accent:'#b91f2b',accessory:'headband',build:1.04},
  kenta:{hair:'spiky',spikes:7,accent:'#f4e8d0',accessory:'scarf',build:.9},
  chris:{hair:'long',spikes:5,accent:'#16a1d4',accessory:'scarf',build:1},
  king:{hair:'crown',spikes:8,accent:'#d3ac1e',accessory:'armor',build:1.12},
  aguma:{hair:'long',spikes:6,accent:'#8bd8f3',accessory:'sash',build:1.15},
  dynamis:{hair:'long',spikes:5,accent:'#6c32bd',accessory:'cape',build:.98},
  rago:{hair:'mane',spikes:10,accent:'#e92361',accessory:'armor',build:1.18},
  valt:{hair:'spiky',spikes:8,accent:'#f22f45',accessory:'headband',build:.96},
  shu:{hair:'swept',spikes:7,accent:'#e7bb2e',accessory:'scarf',build:1},
  lui:{hair:'crown',spikes:9,accent:'#6b2997',accessory:'coat',build:1.08},
  free:{hair:'long',spikes:6,accent:'#1a9688',accessory:'openCoat',build:.98},
  xander:{hair:'mane',spikes:12,accent:'#dfb82e',accessory:'armor',build:1.24},
  rantaro:{hair:'pompadour',spikes:6,accent:'#99ca2b',accessory:'goggles',build:1.1},
  daigo:{hair:'spiky',spikes:10,accent:'#813cb5',accessory:'coat',build:.98},
  zac:{hair:'star',spikes:7,accent:'#8b42be',accessory:'cape',build:1},
  silas:{hair:'swept',spikes:6,accent:'#65308d',accessory:'collar',build:1.04},
  serpent:{hair:'swept',spikes:8,accent:'#7d2ed0',accessory:'scarf',build:1.02},
};
const material=(color,metalness=.12,roughness=.62)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const add=(parent,geometry,mat,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1])=>{const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh};
function hair(group,profile,color){
  const back=profile.hair==='long'||profile.hair==='mane';
  if(back)add(group,new THREE.CapsuleGeometry(2.2,6,5,12),color,[0,11.7,-1.5],[.12,0,0],[1,1,back&&profile.hair==='mane'?1.35:1]);
  if(profile.hair==='pompadour'){for(let i=0;i<profile.spikes;i++)add(group,new THREE.ConeGeometry(.8,3.5,7),color,[-2+i*.72,15.5+(i%2)*.35,.2],[0,0,-.6]);return}
  for(let i=0;i<profile.spikes;i++){const t=profile.spikes===1?0:i/(profile.spikes-1),angle=(t-.5)*(profile.hair==='crown'?3.2:2.5),height=profile.hair==='star'?4.5:profile.hair==='mane'?4.2:3.5;const x=Math.sin(angle)*2.35,y=15.1+Math.cos(angle)*.95,z=profile.hair==='swept'?(t-.5)*1.2:-.25;add(group,new THREE.ConeGeometry(profile.hair==='mane'?1.05:.78,height,7),color,[x,y,z],[0,0,-angle*(profile.hair==='swept'?.9:.62)])}
}
function accessory(group,profile,colors){
  if(profile.accessory==='headband'){add(group,new THREE.TorusGeometry(2.65,.19,7,30),colors.accent,[0,13.9,.05],[Math.PI/2,0,0]);add(group,new THREE.BoxGeometry(1.1,.62,.25),colors.accent,[0,14.1,2.5])}
  if(profile.accessory==='scarf'){add(group,new THREE.TorusGeometry(2.15,.42,8,28),colors.accent,[0,10.2,0],[Math.PI/2,0,0]);add(group,new THREE.BoxGeometry(1.1,5,.35),colors.accent,[1.65,8,-1.5],[0,0,-.22])}
  if(profile.accessory==='fur')add(group,new THREE.TorusGeometry(2.85,.72,8,28),colors.light,[0,10.1,0],[Math.PI/2,0,0]);
  if(profile.accessory==='armor')for(const side of [-1,1])add(group,new THREE.SphereGeometry(1.25,14,9),colors.accent,[side*3.3,9.1,0],[0,0,0],[1.55,.65,1]);
  if(profile.accessory==='sash')add(group,new THREE.BoxGeometry(1.15,8,.3),colors.accent,[0,6.7,2.75],[0,0,-.62]);
  if(profile.accessory==='cape'){add(group,new THREE.ConeGeometry(3.3,8,5,1,true),colors.accent,[0,6,-1.8],[.15,0,0]);}
  if(profile.accessory==='coat'||profile.accessory==='openCoat'){for(const side of [-1,1])add(group,new THREE.BoxGeometry(2.4,7,.55),profile.accessory==='openCoat'?colors.light:colors.accent,[side*1.35,5.4,-.25],[0,0,side*.08]);}
  if(profile.accessory==='goggles'){add(group,new THREE.TorusGeometry(2.5,.22,7,28),colors.dark,[0,14,.3],[Math.PI/2,0,0]);for(const side of [-1,1])add(group,new THREE.CylinderGeometry(.72,.72,.25,16),colors.accent,[side*.9,13.65,2.48],[Math.PI/2,0,0]);}
  if(profile.accessory==='collar')for(const side of [-1,1])add(group,new THREE.ConeGeometry(1.2,3.6,5),colors.accent,[side*1.7,10.5,-.6],[0,0,side*.75]);
}
export function createCharacterView(character){
  const profile=CHARACTERS[character.id]||{hair:'spiky',spikes:7,accent:character.accent,accessory:'scarf',build:1};
  const group=new THREE.Group();group.userData.kind='avatar';group.userData.characterId=character.id;group.userData.profile=profile;
  const colors={skin:material(character.skin,.03,.76),cloth:material(character.cloth,.2,.48),hair:material(character.hair,.15,.5),accent:material(profile.accent,.38,.35),dark:material('#11182c',.3,.5),light:material(character.color2||'#eef2ff',.2,.45)};
  const body=add(group,new THREE.CapsuleGeometry(3.05*profile.build,7,5,12),colors.cloth,[0,6,0]);body.userData.body=true;
  add(group,new THREE.SphereGeometry(2.62,22,16),colors.skin,[0,13,0]);
  for(const side of [-1,1]){add(group,new THREE.SphereGeometry(.18,8,6),colors.dark,[side*.78,13.25,2.52]);const arm=add(group,new THREE.CapsuleGeometry(.62*profile.build,5,3,8),colors.skin,[side*3.5*profile.build,7.2,0],[0,0,side*.22]);arm.userData.arm=side;add(group,new THREE.CapsuleGeometry(.82*profile.build,5,3,8),colors.dark,[side*1.45*profile.build,.7,0]);}
  add(group,new THREE.BoxGeometry(2.2,.18,.18),colors.dark,[0,11.95,2.57]);hair(group,profile,colors.hair);accessory(group,profile,colors);
  return group;
}
export { CHARACTERS as CHARACTER_DESIGNS };
