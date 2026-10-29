import { FIXED_STEP } from './core/constants.js';
import { InputManager } from './core/InputManager.js';
import { GameStorage } from './core/Storage.js';
import { AssetManager } from './assets/AssetManager.js';
import { Renderer3D } from './3d/Renderer3D.js';
import { AudioManager } from './audio/AudioManager.js';
import { UI } from './ui/UI.js';
import { GameApp } from './core/GameApp.js';

const canvas=document.getElementById('game'),loading=document.getElementById('loading'),loadingBar=document.getElementById('loadingBar'),loadingText=document.getElementById('loadingText');
const loadProgress=(value,text)=>{loadingBar.style.width=`${value}%`;loadingText.textContent=text};
loadProgress(12,'Carregant manifest de recursos…');
const assets=new AssetManager();
await assets.init();
loadProgress(38,'Preparant materials i models procedurals…');
const storage=new GameStorage();
const input=new InputManager();
const audio=new AudioManager(storage.data.options);
const ui=new UI(document.getElementById('screen'),document.getElementById('hud'),document.getElementById('toast'));
let renderer;
try { renderer=new Renderer3D(canvas,assets); }
catch (error) { document.getElementById('screen').innerHTML=`<section class="panel compact"><h2>WEBGL NO DISPONIBLE</h2><p>El navegador no ha pogut iniciar el motor 3D. Actualitza els controladors gràfics o activa l’acceleració per maquinari.</p><pre>${error.message}</pre></section>`; loading.classList.add('done'); throw error; }
loadProgress(76,'Construint escena, llums i shaders…');
const app=new GameApp({input,renderer,ui,audio,storage,assets});
loadProgress(100,'Preparat. Let it rip!');
setTimeout(()=>loading.classList.add('done'),280);
input.onFirstInput=()=>audio.init();
canvas.addEventListener('pointerdown',()=>{audio.init();canvas.focus()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&app.scene==='battle'&&!app.paused)app.togglePause(true)});
document.getElementById('fullscreen').addEventListener('click',async()=>{audio.init();const viewport=document.getElementById('viewport');if(!document.fullscreenElement)await viewport.requestFullscreen?.();else await document.exitFullscreen?.()});

// Ruta determinista només per a la prova headless; no s'activa en una partida normal.
if(new URLSearchParams(location.search).get('smoke')==='pvp'){
  await assets.load('beys','serpent');
  app.chooseMode('pvp'); app.chooseFighter('serpent'); app.chooseFighter('shu'); app.chooseStage('classic');
  await new Promise((resolve)=>setTimeout(resolve,30));
  app.simulation.lockLaunch(0); app.simulation.lockLaunch(1);
  for(let step=0;step<190;step++) app.simulation.step(FIXED_STEP,[{x:0,z:0,special:false},{x:0,z:0,special:false}]);
  const smokeEvents=app.simulation.drainEvents();renderer.handleEvents(smokeEvents);renderer.render(FIXED_STEP,app.simulation,0);
  const fightState=`${app.scene}:${app.simulation.phase}:${renderer.beyViews.length}`,design=renderer.beyViews[0].profile.motif,avatarProfile=renderer.characterViews[0].userData.profile.hair,externalModel=!!renderer.beyViews[0].external;
  renderer.explodeBey(0);const burstParts=renderer.detached.length;
  app.simulation.startRound();renderer.handleEvents(app.simulation.drainEvents());
  const pvpState=`${fightState}:${design}:${avatarProfile}:${externalModel}:${burstParts}:${renderer.beyViews.length}:${app.simulation.round}`;
  app.startTutorial();app.simulation.lockLaunch(0);app.simulation.lockLaunch(1);
  for(let step=0;step<190;step++)app.simulation.step(FIXED_STEP,[{x:0,z:0,special:false},{x:0,z:0,special:false}]);
  let tutorialEvents=app.simulation.drainEvents();renderer.handleEvents(tutorialEvents);app.updateTutorial([{x:0,z:0}],tutorialEvents);app.updateTutorial([{x:1,z:0}],[]);app.simulation.triggerSpecial(0);tutorialEvents=app.simulation.drainEvents();app.updateTutorial([{x:0,z:0}],tutorialEvents);renderer.handleEvents(tutorialEvents);for(let step=0;step<52;step++)app.simulation.step(FIXED_STEP);renderer.handleEvents(app.simulation.drainEvents());
  document.body.dataset.smoke=`${pvpState}:${app.tutorialStep}:${renderer.effects.length>0}`;app.togglePause(true);
}

let previous=performance.now(),accumulator=0;
function frame(now){const delta=Math.min(.1,(now-previous)/1000);previous=now;accumulator+=delta;while(accumulator>=FIXED_STEP){app.update(FIXED_STEP);input.clearPressed();accumulator-=FIXED_STEP}renderer.render(delta,app.scene==='battle'?app.simulation:null,accumulator/FIXED_STEP);requestAnimationFrame(frame)}
requestAnimationFrame((time)=>{previous=time;frame(time)});
