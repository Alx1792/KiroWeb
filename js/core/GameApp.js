import { BLADERS, STADIUMS, getBlader, getStadium } from '../data/gameData.js';
import { applyTournamentCompletion, createTournament } from './Progression.js';
import { BattleSimulation } from '../physics/BattleSimulation.js';

const TITLE_ITEMS=[
  {id:'quick',label:'JUGAR',help:'Combat ràpid contra la CPU'},
  {id:'metal',label:'TORNEIG METAL FURY',help:'Quatre combats i Rago com a cap final'},
  {id:'burst',label:'TORNEIG BURST EVOLUTION',help:'Domina la nova generació Burst'},
  {id:'pvp',label:'2 JUGADORS',help:'PvP local al mateix teclat'},
  {id:'training',label:'ENTRENAMENT',help:'Practica poders i llançaments sense límit'},
  {id:'survival',label:'SUPERVIVÈNCIA',help:'Rivals consecutius i dificultat progressiva'},
  {id:'collection',label:'COL·LECCIÓ',help:'Bladers, estadis i rècords'},
  {id:'options',label:'OPCIONS',help:'Volum, efectes i qualitat gràfica'},
  {id:'controls',label:'TUTORIAL I CONTROLS',help:'Aprèn llançament, moviment i poder especial'},
];

export class GameApp {
  constructor({input,renderer,ui,audio,storage,assets}) {
    Object.assign(this,{input,renderer,ui,audio,storage,assets});
    this.scene='title'; this.menuIndex=0; this.cursor=0; this.picks=[]; this.mode='quick'; this.paused=false; this.hudClock=0; this.survival=0;
    this.registerUI(); this.applyOptions(); this.showTitle();
  }

  registerUI() {
    this.ui.on('menu',(id)=>this.chooseMode(id)); this.ui.on('fighter',(id)=>this.chooseFighter(id)); this.ui.on('stage',(id)=>this.chooseStage(id));
    this.ui.on('back',()=>this.back()); this.ui.on('fight',()=>this.queueTournamentFight()); this.ui.on('resume',()=>this.togglePause(false));
    this.ui.on('quit',()=>this.showTitle()); this.ui.on('continue',()=>this.continueAfterResult()); this.ui.on('save-options',()=>this.saveOptions()); this.ui.on('tutorial',()=>this.startTutorial());
  }

  applyOptions() { const options=this.storage.data.options; this.audio.setVolumes(options.music,options.sfx); this.renderer.setQuality(options.quality); this.renderer.setEffectsOptions(options); }
  availableBladers(series=null) { return BLADERS.filter((fighter)=>!series||fighter.series===series).map((fighter)=>({...fighter,unavailable:fighter.id==='rago'&&!this.storage.data.ragoUnlocked})); }
  availableStadiums() { return STADIUMS.filter((stage)=>stage.id!=='nemesis'||this.storage.data.ragoUnlocked); }

  showTitle() {
    this.scene='title'; this.simulation=null; this.paused=false; this.picks=[]; this.result=null; this.audio.stopSpin(); this.audio.music('menu');
    this.ui.title(TITLE_ITEMS,this.menuIndex); this.renderer.showShowroom(getBlader('gingka')); this.input.clearPressed();
  }

  chooseMode(id) {
    this.audio.init(); this.audio.sfx('select');
    if (id==='collection') return this.showCollection();
    if (id==='options') return this.showOptions();
    if (id==='controls') return this.showControls();
    this.mode=id; this.picks=[]; this.cursor=0;
    if (id==='metal'||id==='burst') this.series=id;
    else this.series=null;
    this.showSelect();
  }

  showSelect() {
    this.scene='select';
    const roster=this.availableBladers(this.series);
    this.cursor=Math.min(this.cursor,roster.length-1);
    this.ui.roster(roster,this.cursor,this.picks.length+1,this.mode==='pvp'&&this.picks.length?'TRIA RIVAL':'TRIA BLADER');
    this.renderer.showShowroom(roster[this.cursor]); this.audio.music('menu');
  }

  chooseFighter(id) {
    const fighter=getBlader(id); if (!fighter) return;
    if (fighter.id==='rago'&&!this.storage.data.ragoUnlocked) return this.ui.toast('RAGO: SUPERA EL TORNEIG METAL FURY');
    this.audio.sfx('select'); this.picks.push(fighter);
    if (this.mode==='pvp'&&this.picks.length<2) { this.cursor=0; return this.showSelect(); }
    if (this.mode==='metal'||this.mode==='burst') {
      this.tournament=createTournament(this.mode,fighter,BLADERS,STADIUMS); return this.showBracket();
    }
    if (this.mode==='training') {
      const opponent=getBlader('shu'); this.picks=[fighter,opponent.id===fighter.id?getBlader('gingka'):opponent]; return this.startBattle(getStadium('classic'),{training:true,aiLevel:.35});
    }
    if (this.mode==='survival') { this.survival=0; this.picks=[fighter,this.randomOpponent(fighter)]; return this.chooseStageFlow(); }
    if (this.mode==='quick') this.picks=[fighter,this.randomOpponent(fighter)];
    this.chooseStageFlow();
  }

  chooseStageFlow() {
    this.scene='stage'; this.stadiums=this.availableStadiums(); this.stageIndex=0;
    this.ui.stages(this.stadiums); this.renderer.showShowroom(this.picks[0]);
  }

  chooseStage(id) {
    const stadium=getStadium(id); if (!stadium) return;
    this.selectedStadium=stadium; this.audio.sfx('select');
    this.startBattle(stadium,{human2:this.mode==='pvp',aiLevel:this.mode==='survival'?.5:.65});
  }

  startTutorial() {
    this.mode='tutorial';this.tutorialStep=0;this.picks=[getBlader('valt'),getBlader('rantaro')];
    this.startBattle(getStadium('classic'),{training:true,aiLevel:.18});
    this.simulation.tutorialMessage='PAS 1 · Prem ESPAI quan la barra de llançament sigui ben alta.';
  }

  randomOpponent(player,series=null) {
    const pool=BLADERS.filter((fighter)=>fighter.id!==player.id&&fighter.id!=='rago'&&(!series||fighter.series===series));
    return pool[Math.floor(Math.random()*pool.length)];
  }

  showBracket() {
    this.scene='bracket'; this.ui.bracket(this.tournament); this.renderer.showShowroom(this.tournament.opponents[this.tournament.round]); this.audio.music('menu');
  }
  queueTournamentFight() {
    const tournament=this.tournament,index=tournament.round;
    this.picks=[tournament.player,tournament.opponents[index]];
    this.startBattle(tournament.stages[index],{aiLevel:tournament.levels[index]});
  }

  startBattle(stadium,options={}) {
    this.scene='battle'; this.paused=false; this.selectedStadium=stadium;
    this.simulation=new BattleSimulation({fighters:this.picks,stadium,human2:!!options.human2,training:!!options.training,aiLevel:options.aiLevel??.65});
    this.renderer.startBattle(this.simulation); this.ui.hideScreen(); this.ui.battle(this.simulation); this.audio.music(stadium.music); this.audio.startSpin(); this.processEvents(this.simulation.drainEvents());
  }

  update(dt) {
    const menu=this.input.menu();
    if (this.input.pressed('KeyM')) { const volume=this.audio.toggleMusic(); this.storage.update((data)=>{data.options.music=volume}); this.ui.toast(volume?'MÚSICA ACTIVADA':'MÚSICA DESACTIVADA'); }
    if (this.scene==='title') this.updateTitle(menu);
    else if (this.scene==='select') this.updateSelect(menu);
    else if (this.scene==='stage') this.updateStage(menu);
    else if (this.scene==='bracket') { if(menu.ok)this.queueTournamentFight(); else if(menu.back)this.showTitle(); }
    else if (this.scene==='battle') this.updateBattle(dt,menu);
    else if (['collection','options','controls','champion'].includes(this.scene)&&menu.back) this.showTitle();
  }

  updateTitle(menu) {
    if (menu.up||menu.left) { this.menuIndex=(this.menuIndex-1+TITLE_ITEMS.length)%TITLE_ITEMS.length; this.audio.sfx('move'); this.ui.title(TITLE_ITEMS,this.menuIndex); }
    if (menu.down||menu.right) { this.menuIndex=(this.menuIndex+1)%TITLE_ITEMS.length; this.audio.sfx('move'); this.ui.title(TITLE_ITEMS,this.menuIndex); }
    if (menu.ok) this.chooseMode(TITLE_ITEMS[this.menuIndex].id);
  }

  updateSelect(menu) {
    const roster=this.availableBladers(this.series),columns=innerWidth<700?3:Math.max(3,Math.floor(Math.min(940,innerWidth*.96)/160));
    let changed=false;
    if(menu.left){this.cursor=(this.cursor-1+roster.length)%roster.length;changed=true}if(menu.right){this.cursor=(this.cursor+1)%roster.length;changed=true}
    if(menu.up){this.cursor=(this.cursor-columns+roster.length*2)%roster.length;changed=true}if(menu.down){this.cursor=(this.cursor+columns)%roster.length;changed=true}
    if(changed){this.audio.sfx('move');this.ui.roster(roster,this.cursor,this.picks.length+1,this.mode==='pvp'&&this.picks.length?'TRIA RIVAL':'TRIA BLADER');this.renderer.showShowroom(roster[this.cursor])}
    if(menu.ok)this.chooseFighter(roster[this.cursor].id);else if(menu.back)this.back();
  }

  updateStage(menu) {
    if(menu.left||menu.up){this.stageIndex=(this.stageIndex-1+this.stadiums.length)%this.stadiums.length;this.audio.sfx('move');this.ui.toast(this.stadiums[this.stageIndex].name)}
    if(menu.right||menu.down){this.stageIndex=(this.stageIndex+1)%this.stadiums.length;this.audio.sfx('move');this.ui.toast(this.stadiums[this.stageIndex].name)}
    if(menu.ok)this.chooseStage(this.stadiums[this.stageIndex].id);else if(menu.back)this.back();
  }

  updateBattle(dt,menu) {
    if (menu.back||this.input.pressed('KeyP')) { this.togglePause(!this.paused); return; }
    if (this.paused) return;
    if ((this.mode==='training'||this.mode==='tutorial')&&this.input.pressed('KeyR')) { if(this.mode==='tutorial')this.startTutorial();else this.startBattle(this.selectedStadium,{training:true,aiLevel:.35}); this.ui.toast('ENTRENAMENT REINICIAT'); return; }
    const inputs=[this.input.player(0,this.simulation.human2),this.input.player(1,this.simulation.human2)];
    this.simulation.step(dt,inputs);
    const averageSpin=(this.simulation.entities[0].spin+this.simulation.entities[1].spin)/2000;
    const averageSpeed=(Math.hypot(this.simulation.entities[0].vx,this.simulation.entities[0].vz)+Math.hypot(this.simulation.entities[1].vx,this.simulation.entities[1].vz))/2;
    this.audio.updateSpin(averageSpin,averageSpeed);
    const events=this.simulation.drainEvents(); this.processEvents(events); this.renderer.handleEvents(events); if(this.mode==='tutorial')this.updateTutorial(inputs,events);
    this.hudClock-=dt; if(this.hudClock<=0){this.hudClock=.08;this.ui.battle(this.simulation,false)}
  }

  updateTutorial(inputs,events) {
    if(this.tutorialStep===0&&this.simulation.phase==='fight'){
      this.tutorialStep=1;this.simulation.tutorialMessage='PAS 2 · Mou Valkyrie amb W A S D i busca un bon angle d’impacte.';this.ui.toast('MOU-TE AMB W A S D');
    }else if(this.tutorialStep===1&&Math.hypot(inputs[0].x,inputs[0].z)>.1){
      this.tutorialStep=2;this.simulation.entities[0].power=100;this.simulation.tutorialMessage='PAS 3 · Barra blava plena! Prem ESPAI per activar GENESIS REBOOT.';this.ui.toast('PODER PREPARAT');
    }else if(this.tutorialStep===2&&events.some((event)=>event.type==='specialStart'&&event.side===0)){
      this.tutorialStep=3;this.simulation.tutorialMessage='TUTORIAL COMPLET · Practica lliurement o prem ESC per tornar al menú.';this.ui.toast('TUTORIAL COMPLET!');
    }
  }

  processEvents(events) {
    for (const event of events) {
      if(event.type==='count')this.audio.sfx('count');else if(event.type==='launchLock')this.audio.sfx('lock');else if(event.type==='launch')this.audio.sfx('launch');
      else if(event.type==='hit'||event.type==='projectileHit')this.audio.sfx('hit',Math.min(1.3,(event.force||70)/80));else if(event.type==='wallHit')this.audio.sfx('wall');
      else if(event.type==='ringout'){this.audio.sfx('ringout');this.storage.update((data)=>data.records.ringOuts++)}else if(event.type==='specialStart')this.audio.sfx('special');else if(event.type==='shockwave')this.audio.sfx('shock');
      else if(event.type==='burst'){this.audio.sfx('burst');this.storage.update((data)=>data.records.bursts++)}
      else if(event.type==='point'&&event.reason!=='burst')this.audio.sfx('point');else if(event.type==='matchEnd')this.finishMatch(event);
    }
  }

  finishMatch(event) {
    const playerWon=event.winner===0,winner=this.simulation.fighters[event.winner];
    this.storage.update((data)=>{data.records[playerWon?'wins':'losses']++;});
    if ((this.mode==='metal'||this.mode==='burst')&&playerWon) {
      this.tournament.round++;
      if (this.tournament.round>=4) return this.completeTournament();
    }
    if(this.mode==='survival'&&playerWon)this.survival++;
    if(this.mode==='survival'&&!playerWon)this.storage.update((data)=>{data.records.survival=Math.max(data.records.survival,this.survival)});
    this.result={playerWon,winner,score:event.score,hits:this.simulation.totalHits,rounds:this.simulation.round,continueLabel:this.resultLabel(playerWon)};
    this.scene='result';this.audio.stopSpin();this.audio.music(null);this.audio.sfx(playerWon?'win':'lose');this.ui.result(this.result);
  }

  resultLabel(playerWon) {
    if(this.mode==='pvp')return 'REVENJA';
    if(this.mode==='metal'||this.mode==='burst')return playerWon?'SEGÜENT COMBAT':'REINTENTAR';
    if(this.mode==='survival')return playerWon?'SEGÜENT RIVAL':'NOVA PARTIDA';
    return 'REPETIR';
  }

  continueAfterResult() {
    if(this.mode==='metal'||this.mode==='burst'){if(this.result.playerWon)this.showBracket();else this.queueTournamentFight();return}
    if(this.mode==='survival'&&this.result.playerWon){this.picks=[this.picks[0],this.randomOpponent(this.picks[0])];this.startBattle(this.selectedStadium,{aiLevel:Math.min(1,.5+this.survival*.09)});return}
    if(this.mode==='survival'&&!this.result.playerWon){this.survival=0;this.showSelect();return}
    this.startBattle(this.selectedStadium,{human2:this.mode==='pvp',aiLevel:.65});
  }

  completeTournament() {
    const series=this.mode,newRago=series==='metal'&&!this.storage.data.ragoUnlocked;
    this.storage.update((data)=>applyTournamentCompletion(data,series));
    this.scene='champion';this.audio.stopSpin();this.audio.music(null);this.audio.sfx('win');
    this.renderer.showShowroom(this.tournament.player);
    this.ui.info('CAMPIÓ!',`<p class="subtitle">${this.tournament.player.name} ha superat el torneig ${series==='metal'?'Metal Fury':'Burst Evolution'}.</p>${newRago?'<p class="battle-call" style="font-size:1.4rem">RAGO I TEMPLE NÈMESI DESBLOQUEJATS!</p>':''}`);
  }

  togglePause(value){this.paused=value;this.ui.battle(this.simulation,this.paused);if(value){this.audio.stopSpin();this.audio.music(null)}else{this.audio.music(this.selectedStadium.music);this.audio.startSpin()}}

  showCollection(){this.scene='collection';const roster=this.availableBladers();this.renderer.showShowroom(getBlader(this.storage.data.ragoUnlocked?'rago':'valt'));this.ui.collection(roster,this.storage.data)}
  showOptions(){this.scene='options';this.renderer.showShowroom(getBlader('dynamis'));this.ui.options(this.storage.data.options)}
  saveOptions(){const values={};this.ui.screen.querySelectorAll('[data-option]').forEach((input)=>{values[input.dataset.option]=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value});this.storage.update((data)=>Object.assign(data.options,values));this.applyOptions();this.showTitle()}
  showControls(){this.scene='controls';this.renderer.showShowroom(getBlader('valt'));this.ui.info('COM ES JUGA','<p><b>J1:</b> WASD + ESPAI · <b>J2:</b> FLETXES + ENTER</p><p>Prem el botó quan la barra de llançament sigui a dalt. Mou la baldufa, carrega la barra blava amb impactes i activa el poder quan arribi al 100%.</p><p><b>Ring out:</b> 1 punt · <b>Spin finish:</b> 1 punt · <b>Burst finish:</b> 2 punts · Guanya qui arriba a 3.</p><p>ESC/P: pausa · M: música · R: reinicia l’entrenament.</p><div class="action-row"><button class="action-button primary" data-action="tutorial">COMENÇAR TUTORIAL INTERACTIU</button></div>')}

  back(){this.audio.sfx('back');if(this.scene==='select'&&this.picks.length){this.picks.pop();this.showSelect()}else if(this.scene==='stage')this.showSelect();else this.showTitle()}
}
