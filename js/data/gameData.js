const fighter = (id, series, name, bey, type, stats, colors, special, extra = {}) => ({
  id, series, name, bey, type, ...stats, ...colors, special, ...extra,
});

export const BLADERS = [
  fighter('gingka','metal','GINGKA HAGANE','COSMIC PEGASUS','ATAC',{atk:1.25,def:0.90,sta:1.00,spd:1.25},{color:'#2f6bff',color2:'#e8ecff',accent:'#ff3b3b',hair:'#e23a2a',skin:'#f4c08e',cloth:'#f5f7ff'}, {name:'BIG BANG STARBLAST',kind:'dash',duration:.8}),
  fighter('kyoya','metal','KYOYA TATEGAMI','FANG LEONE','DEFENSA',{atk:1.00,def:1.35,sta:1.05,spd:.95},{color:'#1fae4b',color2:'#f5d33a',accent:'#ffffff',hair:'#2e7d3a',skin:'#e7b07c',cloth:'#5a4a2a'}, {name:'KING LION TEARING BLAST',kind:'wall',duration:3.2}),
  fighter('ryuga','metal','RYUGA','L-DRAGO DESTRUCTOR','ATAC',{atk:1.35,def:1.00,sta:.95,spd:1.10},{color:'#d61f1f',color2:'#ffcf3a',accent:'#17171c',hair:'#f0f0f0',skin:'#f0c39a',cloth:'#d61f1f'}, {name:'DRAGON EMPEROR',kind:'absorb',duration:3}, {left:true}),
  fighter('kenta','metal','KENTA YUMIYA','FLAME SAGITTARIO','RESISTENCIA',{atk:.95,def:.95,sta:1.30,spd:1.05},{color:'#ff7a1a',color2:'#ffe08a',accent:'#c21a1a',hair:'#3fcf5a',skin:'#f6c99a',cloth:'#ff7a1a'}, {name:'FLAME CLAW',kind:'fire',duration:2}),
  fighter('chris','metal','CHRIS','PHANTOM ORION','RESISTENCIA',{atk:.85,def:1.05,sta:1.45,spd:.95},{color:'#19a8e0',color2:'#d8f3ff',accent:'#1a2a6b',hair:'#f2d04a',skin:'#f3c8a0',cloth:'#1a2a6b'}, {name:'INFINITE RUIN',kind:'heal',duration:1}),
  fighter('king','metal','KING','VARIARES','ATAC',{atk:1.30,def:.95,sta:.95,spd:1.15},{color:'#e8c21a',color2:'#c0281e',accent:'#ffffff',hair:'#2b2b9a',skin:'#d99a66',cloth:'#c0281e'}, {name:'MARS ATTACK',kind:'shock',duration:1}),
  fighter('aguma','metal','AGUMA','SCYTHE KRONOS','RESISTENCIA',{atk:1.00,def:1.10,sta:1.20,spd:.90},{color:'#4a4a6a',color2:'#9fe3ff',accent:'#ffffff',hair:'#5a2a1a',skin:'#c98a5a',cloth:'#3a3a52'}, {name:'TIME CRUSHER',kind:'slow',duration:3.5}),
  fighter('dynamis','metal','DYNAMIS','JADE JUPITER','EQUILIBRI',{atk:1.05,def:1.10,sta:1.10,spd:1.00},{color:'#18c2a0',color2:'#ffffff',accent:'#7a3ad6',hair:'#b8c4d8',skin:'#f3d0b0',cloth:'#7a3ad6'}, {name:'JUPITER WHEEL',kind:'vortex',duration:2.5}),
  fighter('rago','metal','RAGO','DIABLO NEMESIS','BOSS',{atk:1.35,def:1.30,sta:1.30,spd:1.10},{color:'#4a1a6b',color2:'#ff2a6b',accent:'#ffd400',hair:'#8a1aa0',skin:'#cfb8c8',cloth:'#1a0a24'}, {name:'NEMESIS DESTRUCTION',kind:'nemesis',duration:2.5}, {boss:true,locked:true}),

  fighter('valt','burst','VALT AOI','GOD VALKYRIE / VALTRYEK V3','ATAC',{atk:1.28,def:.88,sta:.98,spd:1.32},{color:'#2572ff',color2:'#f4f8ff',accent:'#ff314e',hair:'#1763d5',skin:'#f3c095',cloth:'#e92f3d'}, {name:'GENESIS REBOOT',kind:'burstDash',duration:1.15}, {burstable:true}),
  fighter('shu','burst','SHU KURENAI','LEGEND SPRIGGAN / SPRYZEN S3','EQUILIBRI',{atk:1.16,def:1.14,sta:1.12,spd:1.10},{color:'#df263b',color2:'#f7f7f7',accent:'#ffd24a',hair:'#e13b43',skin:'#f3c7a1',cloth:'#f0f0f0'}, {name:'COUNTER BREAK',kind:'precision',duration:3.5}, {burstable:true,left:true}),
  fighter('lui','burst','LUI SHIRO SAGI','NIGHTMARE LONGINUS / LÚINOR L3','ATAC',{atk:1.40,def:1.02,sta:.87,spd:1.12},{color:'#f2f2f2',color2:'#6e2aa8',accent:'#d9203f',hair:'#f5f5f5',skin:'#eec39e',cloth:'#391659'}, {name:'DRAGON SCREAM',kind:'upper',duration:1}, {burstable:true,left:true,boss:true}),
  fighter('free','burst','FREE DE LA HOYA','DRAIN FAFNIR F3','RESISTENCIA',{atk:.92,def:1.02,sta:1.43,spd:.96},{color:'#f0c42c',color2:'#1aa79b',accent:'#d73b47',hair:'#f0e9d4',skin:'#e8b888',cloth:'#d9c650'}, {name:'NOTHING BREAK',kind:'absorb',duration:3.4}, {burstable:true,left:true}),
  fighter('xander','burst','XANDER SHAKADERA','SIEG XCALIBUR / XCALIUS X3','ATAC',{atk:1.43,def:1.08,sta:.82,spd:1.04},{color:'#e7302b',color2:'#f1c438',accent:'#13151c',hair:'#cf2029',skin:'#c78961',cloth:'#1b202a'}, {name:'TRIPLE IMPACT',kind:'smash',duration:1}, {burstable:true}),
  fighter('rantaro','burst','RANTARO KIYAMA','BLAZE RAGNARUK / ROKTAVOR R3','RESISTENCIA',{atk:.98,def:1.10,sta:1.29,spd:1.00},{color:'#f28a1b',color2:'#b9e531',accent:'#f2f2f2',hair:'#e98624',skin:'#eab68a',cloth:'#4b7d31'}, {name:'CYCLONE SHIELD',kind:'balance',duration:2.8}, {burstable:true}),
  fighter('daigo','burst','DAIGO KUROGAMI','KILLER DEATHSCYTHER / DOOMSCIZOR D3','ATAC',{atk:1.24,def:.96,sta:1.02,spd:1.15},{color:'#22242c',color2:'#8f48cc',accent:'#e5e5e5',hair:'#18191e',skin:'#d89b72',cloth:'#512a70'}, {name:'DOUBLE STRIKE',kind:'blade',duration:1.8}, {burstable:true}),
  fighter('zac','burst','ZAC THE SUNRISE','GALAXY ZEUS / ZEUTRON Z3','RESISTENCIA',{atk:1.05,def:1.04,sta:1.28,spd:1.13},{color:'#f2c530',color2:'#f8f4de',accent:'#8c45c8',hair:'#e7c12f',skin:'#efbd91',cloth:'#8d4bc3'}, {name:'SOLAR BOOST',kind:'overdrive',duration:3.2}, {burstable:true}),
  fighter('silas','burst','SILAS KARLISLE','KREIS SATAN / KINETIC SATOMB S3','DEFENSA',{atk:.96,def:1.38,sta:1.11,spd:.91},{color:'#32a858',color2:'#642b96',accent:'#e7e9ee',hair:'#27492f',skin:'#d5a079',cloth:'#49336f'}, {name:'CYCLONE LOOP',kind:'zone',duration:3.8}, {burstable:true}),
  fighter('serpent','original','AERIN','WIND SERPENT','EQUILIBRI',{atk:1.08,def:1.12,sta:1.18,spd:1.08},{color:'#22a9c7',color2:'#7d2ed0',accent:'#d9f7ff',hair:'#183d57',skin:'#d9aa83',cloth:'#245b78'}, {name:'SERPENT TEMPEST',kind:'vortex',duration:2.8}, {burstable:true,community:true}),
];

export const STADIUMS = [
  {id:'classic',name:'ESTADI CLASSIC',desc:'TRES SORTIDES · CONTROL TOTAL',bg:'#060a1d',rim:'#7d93d4',rimD:'#354678',floor:'#293d78',floor2:'#172751',fric:.85,pull:1.7,exits:[[-90,13],[30,13],[150,13]],hazard:null,music:'battle'},
  {id:'ice',name:'ESTADI DE GEL',desc:'SUPERFÍCIE MOLT RELLISCOSA',bg:'#031b2b',rim:'#d8f6ff',rimD:'#5594b1',floor:'#71c7e6',floor2:'#4b9fc4',fric:.30,pull:1.5,exits:[[0,15],[120,15],[240,15]],hazard:'ice',music:'battle'},
  {id:'volcano',name:'ESTADI VOLCÀ',desc:'LA LAVA CONSUMEIX SPIN',bg:'#210503',rim:'#c56639',rimD:'#6b2815',floor:'#5b2c20',floor2:'#321712',fric:.90,pull:1.8,exits:[[-45,12],[135,12]],hazard:'lava',music:'battle'},
  {id:'space',name:'ESTADI ESTEL·LAR',desc:'POCA GRAVETAT · QUATRE SORTIDES',bg:'#010108',rim:'#b08cff',rimD:'#49317f',floor:'#1a1248',floor2:'#0f0a2b',fric:.60,pull:1.25,exits:[[45,16],[135,16],[225,16],[315,16]],hazard:'stars',music:'battle'},
  {id:'nemesis',name:'TEMPLE NÈMESI',desc:'FORAT NEGRE CENTRAL',bg:'#09000f',rim:'#ff2a6b',rimD:'#680926',floor:'#270732',floor2:'#14031a',fric:.80,pull:2.0,exits:[[90,13],[270,13]],hazard:'hole',music:'boss',boss:true,locked:true,series:'metal'},
  {id:'evolution',name:'BEYSTADIUM EVOLUTION',desc:'RIELS D’ACCELERACIÓ BURST',bg:'#071024',rim:'#4de8ff',rimD:'#245b91',floor:'#e7eef8',floor2:'#81a7cf',fric:.68,pull:1.55,exits:[[-90,12],[90,12]],hazard:'rails',music:'battle',series:'burst'},
  {id:'snakepit',name:'SNAKE PIT',desc:'ZONA TÒXICA I PARETS ALTES',bg:'#06170d',rim:'#82ed55',rimD:'#285c26',floor:'#284d32',floor2:'#142c1c',fric:.78,pull:1.82,exits:[[0,11],[180,11]],hazard:'poison',music:'battle',series:'burst'},
];

export const SPECIAL_INFO = {
  dash:'Impuls directe i dany ×2,3',wall:'Escut, massa ×4 i defensa reforçada',absorb:'Roba spin de l’adversari',fire:'Tres projectils de foc',heal:'Recupera un 40% de spin',shock:'Ona expansiva de gran retrocés',slow:'Redueix velocitat i acceleració',vortex:'Atrau el rival cap al centre',nemesis:'Absorció i ona destructiva',burstDash:'Reboot explosiu i dany de bloqueig',precision:'Control precís i contraatac',upper:'Cop ascendent amb gran pressió Burst',smash:'Triple impacte de força extrema',balance:'Recuperació i escut ciclònic',blade:'Talls d’energia consecutius',overdrive:'Velocitat solar sostinguda',zone:'Control defensiu de l’espai',
};

export const getBlader = (id) => BLADERS.find((entry) => entry.id === id);
export const getStadium = (id) => STADIUMS.find((entry) => entry.id === id);
