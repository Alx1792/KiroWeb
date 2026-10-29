import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const DEFAULT_PARTS={layer:'Bey_Layer',disc:'Bey_Disc',driver:'Bey_Driver'};
const cloneMaterials=(root)=>root.traverse((object)=>{if(!object.isMesh)return;object.geometry=object.geometry?.clone();if(Array.isArray(object.material))object.material=object.material.map((entry)=>entry.clone());else object.material=object.material?.clone();object.castShadow=true;object.receiveShadow=true});

export class AssetManager {
  constructor(){this.loader=new GLTFLoader();this.manifest={version:2,models:{}};this.cache=new Map();this.errors=new Map()}
  async init(){try{const response=await fetch('assets/models/manifest.json',{cache:'no-cache'});if(response.ok){const parsed=await response.json();if(parsed?.models)this.manifest=parsed}}catch(error){this.errors.set('manifest',error)}}
  descriptor(type,id){const entry=this.manifest.models?.[`${type}:${id}`];return typeof entry==='string'?{path:entry}:entry||null}
  async source(type,id){const descriptor=this.descriptor(type,id);if(!descriptor?.path)return null;const key=`${type}:${id}`;if(!this.cache.has(key))this.cache.set(key,new Promise((resolve)=>this.loader.load(descriptor.path,(gltf)=>resolve({scene:gltf.scene,animations:gltf.animations||[]}),undefined,(error)=>{this.errors.set(key,error);resolve(null)})));return this.cache.get(key)}
  async load(type,id){
    const descriptor=this.descriptor(type,id),source=await this.source(type,id);if(!descriptor||!source)return null;
    const model=cloneSkeleton(source.scene);cloneMaterials(model);this.normalize(model,descriptor,type);
    const names=descriptor.parts||DEFAULT_PARTS,pieces={};for(const [part,name] of Object.entries(names))pieces[part]=model.getObjectByName(name)||null;
    return {model,descriptor,pieces,animations:source.animations};
  }
  normalize(model,descriptor,type){
    const rotation=descriptor.rotation||[0,0,0];model.rotation.set(...rotation.map((value)=>THREE.MathUtils.degToRad(value)));
    const baseScale=descriptor.scale??1;model.scale.setScalar(baseScale);model.updateMatrixWorld(true);
    if(descriptor.normalize!==false){const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());const target=descriptor.targetSize??(type==='characters'?17:type==='arenas'?82:7.4);const extent=type==='characters'?size.y:type==='arenas'?Math.max(size.x,size.z):Math.max(size.x,size.z);if(extent>0)model.scale.multiplyScalar(target/extent);model.updateMatrixWorld(true)}
    const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),offset=descriptor.offset||[0,0,0];model.position.set(-center.x+offset[0],-box.min.y+offset[1],-center.z+offset[2]);model.updateMatrixWorld(true);
  }
  hasCompleteBurstParts(asset){return !!asset&&['layer','disc','driver'].every((part)=>asset.pieces[part])}
}
