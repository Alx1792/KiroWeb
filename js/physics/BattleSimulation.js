import { angleDistance, BEY_RADIUS, clamp, DEG, MAX_SPIN, ROUND_SECONDS, WORLD_RADIUS, WIN_SCORE } from '../core/constants.js';

const EMPTY_INPUT = Object.freeze({ x:0, z:0, special:false });
const effectState = () => ({ dash:0, wall:0, absorb:0, slow:0, vortex:0, precision:0, overdrive:0, zone:0 });

export class BattleSimulation {
  constructor({ fighters, stadium, human2 = false, training = false, aiLevel = .65, random = Math.random }) {
    this.fighters = fighters;
    this.stadium = stadium;
    this.human2 = human2;
    this.training = training;
    this.aiLevel = aiLevel;
    this.random = random;
    this.score = [0,0];
    this.round = 0;
    this.totalHits = 0;
    this.events = [];
    this.startRound();
  }

  createEntity(character, side) {
    return {
      character, side, x:side ? 17 : -17, z:side ? -4 : 4, previousX:side ? 17 : -17, previousZ:side ? -4 : 4,
      vx:0, vz:0, radius:BEY_RADIUS, spin:0, maxSpin:MAX_SPIN, angularVelocity:0, rotation:0, stability:1,
      power:0, maxBurstLock:character.burstable ? 100 : 145, burstLock:character.burstable ? 100 : 145, out:false, burst:false, fall:0, hitCooldown:0,
      specialCooldown:0, effects:effectState(), ai:{ jitterX:0, jitterZ:0, timer:0 },
    };
  }

  startRound() {
    this.round++;
    this.entities = [this.createEntity(this.fighters[0],0), this.createEntity(this.fighters[1],1)];
    this.phase = 'launch';
    this.phaseTime = 0;
    this.fightTime = 0;
    this.point = null;
    this.projectiles = [];
    this.pendingSpecial = null;
    this.launch = {
      phases:[this.random()*Math.PI*2,this.random()*Math.PI*2], values:[0,0], locks:[null,null],
      cpuTarget:clamp(.5+this.random()*.25+this.aiLevel*.2,0,.97), announced:-1,
    };
    this.events.push({type:'roundStart',round:this.round});
  }

  drainEvents() { const events = this.events; this.events = []; return events; }

  step(dt, inputs = [EMPTY_INPUT,EMPTY_INPUT]) {
    this.phaseTime += dt;
    if (this.phase === 'launch') return this.stepLaunch(dt, inputs);
    if (this.phase === 'special') {
      if (this.phaseTime >= .85) { this.applySpecial(this.pendingSpecial); this.pendingSpecial = null; this.phase = 'fight'; this.phaseTime = 0; }
      return;
    }
    if (this.phase === 'point') {
      if (this.phaseTime >= 2.35) {
        if (!this.training && (this.score[0] >= WIN_SCORE || this.score[1] >= WIN_SCORE)) {
          this.phase = 'ended';
          this.events.push({type:'matchEnd',winner:this.score[0] >= WIN_SCORE ? 0 : 1,score:[...this.score]});
        } else this.startRound();
      }
      return;
    }
    if (this.phase !== 'fight') return;
    this.fightTime += dt;
    const resolvedInputs = [inputs[0] || EMPTY_INPUT, this.human2 ? (inputs[1] || EMPTY_INPUT) : this.aiInput(this.entities[1],this.entities[0],dt)];
    for (let side=0;side<2;side++) {
      const bey = this.entities[side];
      if (resolvedInputs[side].special && bey.power >= 100 && bey.specialCooldown <= 0 && bey.spin > 0 && !bey.out && !bey.burst) {
        this.triggerSpecial(side);
        return;
      }
    }
    for (let side=0;side<2;side++) this.moveEntity(this.entities[side],this.entities[1-side],resolvedInputs[side],dt);
    this.collide();
    this.stepProjectiles(dt);
    this.checkEnd();
  }

  stepLaunch(_dt, inputs) {
    const launch = this.launch;
    for (let side=0;side<2;side++) if (launch.locks[side] === null) launch.values[side] = (Math.sin(this.phaseTime*4.2+launch.phases[side])+1)/2;
    if (inputs[0]?.special && launch.locks[0] === null) this.lockLaunch(0);
    if (this.human2) {
      if (inputs[1]?.special && launch.locks[1] === null) this.lockLaunch(1);
    } else if (launch.locks[1] === null && this.phaseTime > .9 && launch.values[1] >= launch.cpuTarget) this.lockLaunch(1);
    const second = Math.floor(this.phaseTime);
    if (second !== launch.announced && second < 3) { launch.announced = second; this.events.push({type:'count',value:3-second}); }
    if (this.phaseTime < 3) return;
    for (let side=0;side<2;side++) {
      const bey = this.entities[side];
      const power = launch.locks[side] ?? .4;
      bey.spin = MAX_SPIN*(.6+.4*power);
      bey.angularVelocity = (24+34*power)*(bey.character.left ? -1 : 1);
      bey.stability = .72+.28*power;
      const direction = side ? Math.PI*.78 : -Math.PI*.22;
      const speed = 20+28*power;
      bey.vx = Math.cos(direction)*speed;
      bey.vz = Math.sin(direction)*speed;
    }
    this.phase = 'fight'; this.phaseTime = 0;
    this.events.push({type:'launch',powers:[launch.locks[0]??.4,launch.locks[1]??.4]});
  }

  lockLaunch(side) {
    this.launch.locks[side] = this.launch.values[side];
    this.events.push({type:'launchLock',side,value:this.launch.values[side]});
  }

  moveEntity(bey, opponent, input, dt) {
    bey.previousX=bey.x; bey.previousZ=bey.z;
    for (const key of Object.keys(bey.effects)) bey.effects[key]=Math.max(0,bey.effects[key]-dt);
    bey.hitCooldown=Math.max(0,bey.hitCooldown-dt);
    bey.specialCooldown=Math.max(0,bey.specialCooldown-dt);
    if (bey.burst) return;
    if (bey.out) {
      bey.fall+=dt; bey.x+=bey.vx*dt; bey.z+=bey.vz*dt; bey.rotation+=bey.angularVelocity*dt;
      return;
    }
    const alive=bey.spin>0;
    const spinFactor=clamp(bey.spin/MAX_SPIN,0,1);
    if (alive) {
      let ix=input.x||0, iz=input.z||0;
      const inputLength=Math.hypot(ix,iz);
      if (inputLength>1) { ix/=inputLength; iz/=inputLength; }
      const slow=bey.effects.slow>0?.4:1;
      const precision=bey.effects.precision>0?1.3:1;
      const acceleration=112*bey.character.spd*slow*precision*(.35+.65*spinFactor);
      bey.vx+=ix*acceleration*dt; bey.vz+=iz*acceleration*dt;
      if (inputLength>.1) bey.spin-=4*dt;
    }
    bey.vx+=-bey.x*this.stadium.pull*.44*dt;
    bey.vz+=-bey.z*this.stadium.pull*.44*dt;
    if (opponent.effects.vortex>0 && !opponent.out && !opponent.burst) {
      const dx=opponent.x-bey.x,dz=opponent.z-bey.z,d=Math.hypot(dx,dz)||1;
      bey.vx+=dx/d*155*dt; bey.vz+=dz/d*155*dt;
    }
    if (opponent.effects.zone>0) {
      const dx=bey.x-opponent.x,dz=bey.z-opponent.z,d=Math.hypot(dx,dz)||1;
      if (d<14) { bey.vx+=dx/d*85*dt; bey.vz+=dz/d*85*dt; }
    }
    const drag=Math.max(0,1-(alive?this.stadium.fric:3.5)*dt);
    bey.vx*=drag; bey.vz*=drag;
    const speed=Math.hypot(bey.vx,bey.vz);
    const boost=(bey.effects.dash>0?2.4:1)*(bey.effects.overdrive>0?1.6:1)*(bey.effects.slow>0?.6:1);
    const maxSpeed=(32+39*spinFactor)*bey.character.spd*boost+(alive?0:10);
    if (speed>maxSpeed) { bey.vx*=maxSpeed/speed; bey.vz*=maxSpeed/speed; }
    bey.x+=bey.vx*dt; bey.z+=bey.vz*dt;
    if (alive) {
      bey.spin-=((15+speed*.095)/bey.character.sta)*dt;
      bey.angularVelocity=(8+46*spinFactor)*(bey.character.left?-1:1);
      bey.rotation+=bey.angularVelocity*dt;
      bey.stability=clamp(bey.stability-(1-spinFactor)*.035*dt,0,1);
    }
    this.applyHazard(bey,dt);
    this.resolveWall(bey);
    bey.spin=Math.max(0,bey.spin);
  }

  applyHazard(bey,dt) {
    const distance=Math.hypot(bey.x,bey.z), hazard=this.stadium.hazard;
    if (hazard==='lava' && distance>WORLD_RADIUS-7) bey.spin-=75*dt;
    if (hazard==='hole' && distance<6.2) { bey.spin-=150*dt; const pull=distance||1; bey.vx+=-bey.x/pull*35*dt; bey.vz+=-bey.z/pull*35*dt; }
    if (hazard==='poison' && distance<9) bey.spin-=42*dt;
    if (hazard==='rails' && distance>WORLD_RADIUS-8 && distance<WORLD_RADIUS-2) { bey.vx*=1+dt*.75; bey.vz*=1+dt*.75; }
  }

  resolveWall(bey) {
    const distance=Math.hypot(bey.x,bey.z);
    if (distance<=WORLD_RADIUS-bey.radius) return;
    const angle=Math.atan2(bey.z,bey.x);
    const inExit=this.stadium.exits.some(([center,width])=>angleDistance(angle,center*DEG)<width*DEG);
    const nx=bey.x/(distance||1),nz=bey.z/(distance||1);
    if (inExit) {
      if (distance>WORLD_RADIUS+2.5) { bey.out=true; bey.fall=0; this.events.push({type:'ringout',side:bey.side,x:bey.x,z:bey.z}); }
      return;
    }
    const outward=bey.vx*nx+bey.vz*nz;
    if (outward>0) {
      bey.vx-=1.75*outward*nx; bey.vz-=1.75*outward*nz;
      if (outward>17) { bey.spin-=outward*.18; this.events.push({type:'wallHit',side:bey.side,force:outward,x:bey.x,z:bey.z}); }
    }
    bey.x=nx*(WORLD_RADIUS-bey.radius); bey.z=nz*(WORLD_RADIUS-bey.radius);
  }

  collide() {
    const [a,b]=this.entities;
    if (a.out||b.out||a.burst||b.burst) return;
    const dx=b.x-a.x,dz=b.z-a.z,min=a.radius+b.radius;
    let distance=Math.hypot(dx,dz);
    if (distance>=min) return;
    distance=Math.max(distance,.001);
    const nx=dx/distance,nz=dz/distance,overlap=min-distance;
    a.x-=nx*overlap/2; a.z-=nz*overlap/2; b.x+=nx*overlap/2; b.z+=nz*overlap/2;
    const relative=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;
    const massA=a.character.def*(a.effects.wall>0?4:1),massB=b.character.def*(b.effects.wall>0?4:1);
    const opposite=a.character.left!==b.character.left?1.25:1;
    const impulse=(Math.max(0,relative)*1.15+24+28*(a.spin+b.spin)/(MAX_SPIN*2))*opposite;
    a.vx-=nx*impulse*massB/(massA+massB); a.vz-=nz*impulse*massB/(massA+massB);
    b.vx+=nx*impulse*massA/(massA+massB); b.vz+=nz*impulse*massA/(massA+massB);
    if (a.hitCooldown>0||b.hitCooldown>0||this.phase!=='fight') return;
    a.hitCooldown=b.hitCooldown=.12;
    const impact=Math.max(0,relative)+15;
    const damage=(attacker,defender)=>impact*.9*(attacker.character.atk/defender.character.def)*(.5+.8*clamp(attacker.spin/MAX_SPIN,0,1))*(attacker.effects.dash>0?2.3:1)*(attacker.effects.precision>0?1.35:1)*(attacker.effects.wall>0?1.6:1)*(defender.effects.wall>0?.25:1)*(.85+this.random()*.3);
    const damageB=damage(a,b),damageA=damage(b,a);
    this.hurt(b,damageB,a); this.hurt(a,damageA,b);
    a.power=Math.min(100,a.power+9); b.power=Math.min(100,b.power+9);
    this.damageBurstLock(b,damageB,a); this.damageBurstLock(a,damageA,b);
    this.totalHits++;
    this.events.push({type:'hit',x:(a.x+b.x)/2,z:(a.z+b.z)/2,force:impact,damage:[damageA,damageB]});
  }

  damageBurstLock(victim,damage,source) {
    const multiplier=victim.character.burstable?.82:.46;
    const pressure=Math.max(0,damage-18)*multiplier*(source.effects.precision>0?1.2:1);
    this.applyBurstPressure(victim,pressure);
  }

  applyBurstPressure(victim,pressure) {
    victim.burstLock=Math.max(0,victim.burstLock-pressure);
    if (victim.burstLock<=0 && victim.spin<MAX_SPIN*.62 && !victim.burst) {
      victim.burst=true;
      this.events.push({type:'burst',side:victim.side,x:victim.x,z:victim.z,character:victim.character});
    }
  }

  hurt(victim,amount,source) {
    if (victim.out||victim.burst||victim.spin<=0) return;
    victim.spin=Math.max(0,victim.spin-amount);
    victim.power=Math.min(100,victim.power+amount*.06);
    if (source?.character.left) source.spin=Math.min(MAX_SPIN,source.spin+amount*.3);
  }

  stepProjectiles(dt) {
    for (const projectile of this.projectiles) {
      projectile.x+=projectile.vx*dt; projectile.z+=projectile.vz*dt; projectile.life-=dt;
      const target=this.entities[1-projectile.owner];
      if (target.out||target.burst||Math.hypot(target.x-projectile.x,target.z-projectile.z)>=target.radius+1.2) continue;
      projectile.life=0;
      const speed=Math.hypot(projectile.vx,projectile.vz)||1;
      target.vx+=projectile.vx/speed*48; target.vz+=projectile.vz/speed*48;
      this.hurt(target,projectile.damage,this.entities[projectile.owner]);
      this.damageBurstLock(target,projectile.damage,this.entities[projectile.owner]);
      this.events.push({type:'projectileHit',x:projectile.x,z:projectile.z,kind:projectile.kind});
    }
    this.projectiles=this.projectiles.filter((projectile)=>projectile.life>0&&Math.hypot(projectile.x,projectile.z)<WORLD_RADIUS+8);
  }

  triggerSpecial(side) {
    const bey=this.entities[side];
    bey.power=0; bey.specialCooldown=6; this.pendingSpecial=side; this.phase='special'; this.phaseTime=0;
    this.events.push({type:'specialStart',side,character:bey.character});
  }

  applySpecial(side) {
    const me=this.entities[side],opponent=this.entities[1-side];
    const dx=opponent.x-me.x,dz=opponent.z-me.z,distance=Math.hypot(dx,dz)||1;
    const forward=(speed)=>{ me.vx=dx/distance*speed; me.vz=dz/distance*speed; };
    const kind=me.character.special.kind;
    if (kind==='dash') { me.effects.dash=.8; forward(115); }
    else if (kind==='wall') me.effects.wall=3.2;
    else if (kind==='absorb') me.effects.absorb=me.character.special.duration||3;
    else if (kind==='fire') this.spawnFan(side,3,.25,76,70,'fire');
    else if (kind==='heal') me.spin=Math.min(MAX_SPIN,me.spin+MAX_SPIN*.4);
    else if (kind==='shock') this.shock(me,opponent,105,70);
    else if (kind==='slow') { opponent.effects.slow=3.5; this.hurt(opponent,40,me); }
    else if (kind==='vortex') me.effects.vortex=2.5;
    else if (kind==='nemesis') { me.effects.absorb=2.5; this.shock(me,opponent,92,60); }
    else if (kind==='burstDash') { me.effects.dash=1.15; forward(125); this.applyBurstPressure(opponent,12); }
    else if (kind==='precision') me.effects.precision=3.5;
    else if (kind==='upper') { forward(105); this.shock(me,opponent,82,82); this.applyBurstPressure(opponent,24); }
    else if (kind==='smash') this.shock(me,opponent,135,92);
    else if (kind==='balance') { me.effects.wall=2.8; me.spin=Math.min(MAX_SPIN,me.spin+180); }
    else if (kind==='blade') this.spawnFan(side,5,.16,88,38,'blade');
    else if (kind==='overdrive') { me.effects.overdrive=3.2; me.spin=Math.min(MAX_SPIN,me.spin+100); }
    else if (kind==='zone') { me.effects.zone=3.8; me.effects.wall=3.8; opponent.effects.slow=1.5; }
    this.events.push({type:'specialApplied',side,kind});
  }

  spawnFan(side,count,spread,speed,damage,kind) {
    const me=this.entities[side],opponent=this.entities[1-side],base=Math.atan2(opponent.z-me.z,opponent.x-me.x);
    for (let index=0;index<count;index++) {
      const angle=base+(index-(count-1)/2)*spread;
      this.projectiles.push({x:me.x,z:me.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,owner:side,life:2,damage,kind});
    }
  }

  shock(me,opponent,force,damage) {
    const dx=opponent.x-me.x,dz=opponent.z-me.z,distance=Math.hypot(dx,dz)||1;
    if (distance<26) { const scaled=force*(1-distance/34); opponent.vx+=dx/distance*scaled; opponent.vz+=dz/distance*scaled; this.hurt(opponent,damage,me); this.damageBurstLock(opponent,damage,me); }
    this.events.push({type:'shockwave',side:me.side,x:me.x,z:me.z,color:me.character.accent});
  }

  applyContinuousEffects(dt) {
    const [a,b]=this.entities;
    for (const [me,opponent] of [[a,b],[b,a]]) if (me.effects.absorb>0&&me.spin>0&&!opponent.out&&!opponent.burst&&opponent.spin>0) {
      const amount=95*dt; opponent.spin=Math.max(0,opponent.spin-amount); me.spin=Math.min(MAX_SPIN,me.spin+amount*.9);
    }
  }

  checkEnd() {
    this.applyContinuousEffects(1/60);
    const [a,b]=this.entities;
    if (a.burst) return this.award(1,2,'BURST FINISH!','burst');
    if (b.burst) return this.award(0,2,'BURST FINISH!','burst');
    if (a.out&&b.out) return this.award(-1,0,'DOBLE RING OUT!','draw');
    if (a.out) return this.award(1,1,'RING OUT!','ringout');
    if (b.out) return this.award(0,1,'RING OUT!','ringout');
    if (a.spin<=0&&b.spin<=0) return this.award(-1,0,'EMPAT!','draw');
    if (a.spin<=0) return this.award(1,1,'SPIN FINISH!','spin');
    if (b.spin<=0) return this.award(0,1,'SPIN FINISH!','spin');
    if (this.fightTime>=ROUND_SECONDS) {
      if (Math.abs(a.spin-b.spin)<.01) return this.award(-1,0,'TEMPS ESGOTAT · EMPAT!','draw');
      return this.award(a.spin>b.spin?0:1,1,'TEMPS ESGOTAT!','time');
    }
  }

  award(winner,points,label,reason) {
    if (this.phase!=='fight') return;
    if (!this.training&&winner>=0) this.score[winner]+=points;
    this.phase='point'; this.phaseTime=0; this.point={winner,points:this.training?0:points,label,reason};
    this.events.push({type:'point',...this.point,score:[...this.score]});
  }

  aiInput(me,opponent,dt) {
    if (me.spin<=0||me.out||me.burst) return EMPTY_INPUT;
    const dx=opponent.x-me.x,dz=opponent.z-me.z,distance=Math.hypot(dx,dz)||1;
    const centerDistance=Math.hypot(me.x,me.z)||1;
    let x=0,z=0;
    const orbit=(radius,direction=1)=>{ const angle=Math.atan2(me.z,me.x)+.6*direction; const gx=Math.cos(angle)*radius,gz=Math.sin(angle)*radius,d=Math.hypot(gx-me.x,gz-me.z)||1; x=(gx-me.x)/d; z=(gz-me.z)/d; };
    if (me.character.type==='ATAC'||me.character.type==='BOSS'||me.effects.dash>0) { x=dx/distance; z=dz/distance; }
    else if (me.character.type==='DEFENSA') { if (distance<23) { x=dx/distance; z=dz/distance; } else { x=-me.x/centerDistance; z=-me.z/centerDistance; } }
    else if (me.character.type==='RESISTENCIA') { orbit(16); if (distance<12) { x-=dx/distance*.8; z-=dz/distance*.8; } }
    else if (me.spin>opponent.spin) { x=dx/distance; z=dz/distance; } else orbit(14,-1);
    if (centerDistance>WORLD_RADIUS-10) { x+=-me.x/centerDistance*1.7; z+=-me.z/centerDistance*1.7; }
    if (this.stadium.hazard==='hole'&&centerDistance<11) { x+=me.x/centerDistance*1.5; z+=me.z/centerDistance*1.5; }
    if (this.stadium.hazard==='lava'&&centerDistance>WORLD_RADIUS-12) { x+=-me.x/centerDistance; z+=-me.z/centerDistance; }
    me.ai.timer-=dt;
    if (me.ai.timer<=0) { me.ai.timer=.2+this.random()*.4; me.ai.jitterX=(this.random()*2-1)*(1-this.aiLevel)*.9; me.ai.jitterZ=(this.random()*2-1)*(1-this.aiLevel)*.9; }
    x+=me.ai.jitterX; z+=me.ai.jitterZ;
    const length=Math.hypot(x,z)||1,magnitude=.55+.45*this.aiLevel;
    const kind=me.character.special.kind;
    let special=false;
    if (me.power>=100&&me.specialCooldown<=0&&this.random()<(.02+this.aiLevel*.04)) {
      special=kind==='heal'?me.spin<MAX_SPIN*.55:kind==='wall'||kind==='zone'?distance<25:distance<34;
    }
    return {x:x/length*magnitude,z:z/length*magnitude,special};
  }
}
