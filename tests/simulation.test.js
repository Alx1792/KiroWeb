import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleSimulation } from '../js/physics/BattleSimulation.js';
import { BLADERS,STADIUMS } from '../js/data/gameData.js';
import { createTournament } from '../js/core/Progression.js';
const fighter=(id)=>BLADERS.find((entry)=>entry.id===id),stadium=(id)=>STADIUMS.find((entry)=>entry.id===id);
const fixedRandom=()=>.5;
const make=(options={})=>new BattleSimulation({fighters:[fighter('gingka'),fighter('valt')],stadium:stadium('classic'),random:fixedRandom,...options});
function launch(simulation){for(let i=0;i<181;i++)simulation.step(1/60,[{x:0,z:0,special:i===20},{x:0,z:0,special:i===25}]);simulation.drainEvents()}

test('el llançament aplica força, spin i velocitat angular',()=>{const simulation=make({human2:true});launch(simulation);assert.equal(simulation.phase,'fight');assert.ok(simulation.entities.every((bey)=>bey.spin>=600&&Math.abs(bey.angularVelocity)>0));});
test('el spin disminueix durant el combat',()=>{const simulation=make({human2:true});launch(simulation);const before=simulation.entities[0].spin;for(let i=0;i<60;i++)simulation.step(1/60,[{x:0,z:0},{x:0,z:0}]);assert.ok(simulation.entities[0].spin<before);});
test('la paret rebota una baldufa fora de les sortides',()=>{const simulation=make({human2:true});launch(simulation);const bey=simulation.entities[0];bey.x=37;bey.z=0;bey.vx=30;bey.vz=0;simulation.moveEntity(bey,simulation.entities[1],{x:0,z:0},1/60);assert.ok(bey.vx<0);assert.equal(bey.out,false);});
test('una sortida produeix ring out i un punt',()=>{const simulation=make({human2:true});launch(simulation);const angle=-90*Math.PI/180,bey=simulation.entities[0];bey.x=Math.cos(angle)*42;bey.z=Math.sin(angle)*42;simulation.resolveWall(bey);simulation.checkEnd();assert.equal(simulation.point.reason,'ringout');assert.deepEqual(simulation.score,[0,1]);});
test('el Burst separa la ronda i atorga dos punts',()=>{const simulation=make({human2:true});launch(simulation);const victim=simulation.entities[1];victim.spin=400;victim.burstLock=1;simulation.damageBurstLock(victim,100,simulation.entities[0]);simulation.checkEnd();assert.equal(victim.burst,true);assert.deepEqual(simulation.score,[2,0]);assert.equal(simulation.point.reason,'burst');});
test('els poders consumeixen barra i afecten la física',()=>{const simulation=make({human2:true});launch(simulation);const bey=simulation.entities[0];bey.power=100;simulation.triggerSpecial(0);for(let i=0;i<52;i++)simulation.step(1/60);assert.equal(bey.power,0);assert.ok(bey.effects.dash>0);assert.ok(Math.hypot(bey.vx,bey.vz)>50);});
test('la lava consumeix spin més ràpid',()=>{const simulation=make({stadium:stadium('volcano'),human2:true});launch(simulation);const bey=simulation.entities[0];bey.x=34;bey.z=0;const before=bey.spin;simulation.applyHazard(bey,1);assert.ok(before-bey.spin>=75);});
test('un empat per temps no concedeix punts',()=>{const simulation=make({human2:true});launch(simulation);simulation.fightTime=60;simulation.entities[0].spin=500;simulation.entities[1].spin=500;simulation.checkEnd();assert.deepEqual(simulation.score,[0,0]);assert.equal(simulation.point.winner,-1);});
test('el torneig conserva quatre combats i un cap final',()=>{const tournament=createTournament('metal',fighter('gingka'),BLADERS,STADIUMS,fixedRandom);assert.equal(tournament.opponents.length,4);assert.equal(tournament.stages.length,4);assert.equal(tournament.opponents.at(-1).id,'rago');assert.equal(tournament.stages.at(-1).id,'nemesis');});


test('completar Metal Fury desbloqueja Rago i registra el torneig',async()=>{
  const { applyTournamentCompletion }=await import('../js/core/Progression.js');
  const data={completed:{metal:0,burst:0},ragoUnlocked:false};
  applyTournamentCompletion(data,'metal');
  assert.equal(data.completed.metal,1);
  assert.equal(data.ragoUnlocked,true);
});

test('la persistència migra el desbloqueig antic de Rago',async()=>{
  const { GameStorage }=await import('../js/core/Storage.js');
  const values=new Map([['beyfury_rago','1']]);
  const fake={getItem:(key)=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const storage=new GameStorage(fake);
  assert.equal(storage.data.ragoUnlocked,true);
  assert.equal(storage.save(),true);
  assert.ok(values.has('bey_battle_ultimate_3d'));
});


test('els poders Burst avaluen immediatament el bloqueig',()=>{
  const simulation=new BattleSimulation({fighters:[fighter('gingka'),fighter('valt')],stadium:stadium('classic'),human2:true,random:fixedRandom});
  launch(simulation);const victim=simulation.entities[0];victim.spin=400;victim.burstLock=10;
  simulation.applySpecial(1);
  assert.equal(victim.burst,true);
  assert.ok(simulation.drainEvents().some((event)=>event.type==='burst'));
});

test('cada entitat normalitza la seva barra Burst',()=>{
  const simulation=make();
  assert.equal(simulation.entities[0].maxBurstLock,145);
  assert.equal(simulation.entities[1].maxBurstLock,100);
});

test('els 19 Beys tenen disseny procedural i tres peces lògiques',async()=>{
  const { BEY_DESIGNS,createBeyView }=await import('../js/3d/BeyFactory.js');
  assert.equal(Object.keys(BEY_DESIGNS).length,19);
  assert.equal(new Set(Object.values(BEY_DESIGNS).map((design)=>design.label)).size,19);
  for(const blader of BLADERS){const view=createBeyView(blader);assert.deepEqual(Object.keys(view.pieces).sort(),['disc','driver','layer']);assert.ok(view.visualRoot.children.length===3);}
});

test('una ronda nova restaura entitats després d’un Burst',()=>{
  const simulation=make({human2:true});launch(simulation);simulation.entities[1].burst=true;simulation.checkEnd();
  for(let step=0;step<142;step++)simulation.step(1/60);
  assert.equal(simulation.round,2);
  assert.equal(simulation.entities[1].burst,false);
  assert.equal(simulation.phase,'launch');
});


test('els 19 bladers tenen perfils visuals explícits',async()=>{
  const { CHARACTER_DESIGNS,createCharacterView }=await import('../js/3d/CharacterFactory.js');
  assert.equal(Object.keys(CHARACTER_DESIGNS).length,19);
  for(const blader of BLADERS){const avatar=createCharacterView(blader);assert.equal(avatar.userData.characterId,blader.id);assert.ok(avatar.children.length>=10);}
});
