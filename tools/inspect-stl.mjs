import { readFile } from 'node:fs/promises';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import * as THREE from 'three';
const path=process.argv[2];if(!path)throw new Error('Ús: node tools/inspect-stl.mjs <fitxer.stl>');
const data=await readFile(path),buffer=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),geometry=new STLLoader().parse(buffer);
geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new THREE.Vector3()),center=geometry.boundingBox.getCenter(new THREE.Vector3());
console.log(JSON.stringify({vertices:geometry.attributes.position.count,size:size.toArray(),center:center.toArray(),min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},null,2));
