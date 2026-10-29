import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { BLADERS,STADIUMS } from '../js/data/gameData.js';
const key=process.env.MESHY_API_KEY,[type,id]=process.argv.slice(2);
if(!key)throw new Error('Falta MESHY_API_KEY. Configura-la només a l’entorn local.');
if(!['beys','characters','arenas'].includes(type)||!id)throw new Error('Ús: node tools/generate-model.mjs <beys|characters|arenas> <id>');
const manifestPath=resolve('assets/models/manifest.json'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const manifestKey=`${type}:${id}`;if(manifest.models[manifestKey]){console.log(`Ja existeix: ${manifest.models[manifestKey].path}`);process.exit(0)}
const item=type==='arenas'?STADIUMS.find((entry)=>entry.id===id):BLADERS.find((entry)=>entry.id===id);if(!item)throw new Error(`ID desconegut: ${id}`);
const prompts={
  beys:`Detailed stylized anime spinning top game asset inspired by ${item.bey}; layered construction with separate energy layer, metal disc and performance tip; dominant colors ${item.color}, ${item.color2} and ${item.accent}; radial hard-surface geometry, metallic materials, isolated, centered, no logo, no text`,
  characters:`Full-body stylized anime blader character inspired by ${item.name}; characteristic ${item.hair} hair, ${item.cloth} sports clothing with ${item.accent} details; heroic proportions, neutral A-pose, clean topology, isolated, no weapon, no logo, no text`,
  arenas:`Stylized anime spinning-top battle stadium ${item.name}; circular concave bowl, visible exits, raised containment wall, ${item.desc}; metallic game environment asset, centered, isolated, no logo, no text`,
};
const api='https://api.meshy.ai/openapi/v2/text-to-3d';
async function request(path,options={}){const response=await fetch(api+path,{...options,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers}});if(!response.ok)throw new Error(`Meshy ${response.status}: ${await response.text()}`);return response.json()}
async function create(body){const data=await request('',{method:'POST',body:JSON.stringify(body)});return data.result||data.id}
async function wait(taskId){for(let tries=0;tries<180;tries++){const task=await request(`/${taskId}`);if(task.status==='SUCCEEDED')return task;if(['FAILED','CANCELED'].includes(task.status))throw new Error(`La tasca ${taskId} ha acabat amb ${task.status}`);await new Promise((resolve)=>setTimeout(resolve,5000))}throw new Error('Temps d’espera de Meshy excedit')}
console.log(`Generant una sola tasca controlada: ${manifestKey}`);
const previewId=await create({mode:'preview',prompt:prompts[type].slice(0,800),model_type:'smart-topology',ai_model:'meshy-t2.5',target_polycount:type==='arenas'?18000:type==='characters'?15000:10000,target_formats:['glb'],pose_mode:type==='characters'?'a-pose':'',moderation:true});
await wait(previewId);const refineId=await create({mode:'refine',preview_task_id:previewId,enable_pbr:true,texture_resolution:'2k',target_formats:['glb'],moderation:true});
const task=await wait(refineId),url=task.model_urls?.glb||task.result?.model_urls?.glb;if(!url)throw new Error('Meshy no ha retornat cap GLB');
const destination=resolve(`assets/models/${type}/${id}.glb`);await mkdir(dirname(destination),{recursive:true});const modelResponse=await fetch(url);if(!modelResponse.ok)throw new Error(`No s’ha pogut descarregar el GLB: ${modelResponse.status}`);await writeFile(destination,Buffer.from(await modelResponse.arrayBuffer()));
manifest.version=2;manifest.models[manifestKey]={path:`assets/models/${type}/${id}.glb`,source:'Meshy API (generated locally)',license:'Review Meshy terms before redistribution',targetSize:type==='arenas'?82:type==='characters'?17:7.4,rotation:[0,0,0],offset:[0,0,0],...(type==='beys'?{parts:{layer:'Bey_Layer',disc:'Bey_Disc',driver:'Bey_Driver'}}:{})};await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log(`Desat: ${destination}. Revisa escala, llicència i nodes abans de publicar.`);
