# Bey Battle: Metal Fury

Joc retro pixel art de baldufes per a navegador, construït amb HTML, CSS, Canvas 2D i JavaScript sense frameworks. Aquesta edició conserva la jugabilitat original i en poleix la presentació amb una interfície coherent, estadis més detallats i feedback audiovisual reforçat.

## Executar

Pots obrir `index.html` directament al navegador o publicar els fitxers estàtics a GitHub Pages. No cal instal·lar dependències ni executar cap procés de compilació.

## Modes

- **1 jugador — Torneig:** quarts, semifinal, final i repte contra Rago al Temple Nèmesi.
- **2 jugadors — PvP local:** selecció independent de blader i estadi al mateix teclat.

## Controls

| | Jugador 1 | Jugador 2 |
|---|---|---|
| Moure | W A S D | Fletxes |
| Llançar / poder | Espai | Enter |

En torneig també pots utilitzar fletxes i Enter. `Esc`/`P` pausa, `M` activa o desactiva tot l’àudio.

## Regles

- Durant el llançament, prem quan la barra de potència estigui alta.
- Els impactes carreguen el poder especial.
- Ring Out: **1 punt**.
- Spin Finish: **1 punt**.
- Burst Finish: **2 punts**.
- Guanya qui arriba primer a **3 punts**.

## Bladers

Gingka — Cosmic Pegasus · Kyoya — Fang Leone · Ryuga — L-Drago Destructor · Kenta — Flame Sagittario · Chris — Phantom Orion · King — Variares · Aguma — Scythe Kronos · Dynamis — Jade Jupiter · Rago — Diablo Nemesis.

Rago i el Temple Nèmesi es desbloquegen completant el torneig; el desbloqueig es conserva a `localStorage`.

## Estadis

- **Classic:** competició equilibrada amb tres sortides.
- **Gel:** fricció molt baixa.
- **Volcà:** la lava dels marges consumeix spin.
- **Estel·lar:** atracció central reduïda i quatre sortides.
- **Temple Nèmesi:** forat negre central i combat final.

## Poliment visual

La resolució interna continua sent **320 × 240** i s’escala en 4:3 amb píxel nítid. La renovació manté els retrats 12×12, paletes i primitives originals, i afegeix:

- carcassa arcade responsive i controls compactes;
- tema visual compartit, panells bisellats i transicions breus;
- títol, controls, selecció, estadis, bracket, VS, resultats i campió redissenyats;
- HUD amb retrats i barres segmentades de spin/poder;
- Beys diferenciats amb ornaments propis per blader;
- estadis amb textures, marques i ambientació específica;
- cut-ins diferents per als nou atacs especials;
- opcions d’efectes, tremolor i àudio;
- compatibilitat amb `prefers-reduced-motion` i `forced-colors`.

Les opcions visuals no alteren física, IA, controls, puntuació o durada dels combats.

### Catàleg visual

`js/visuals.js` publica `BeyVisuals` com a script clàssic i CommonJS. Inclou una llegenda de nou símbols, validació/fallback segur i un mapa original 12×12 diferent per a cada blader. Els perfils Bey són declaratius i separen **layer**, **disc** metàl·lic i **driver** central:

| Blader | Retrat | Silueta Bey |
|---|---|---|
| Gingka | cabell vermell alat i jaqueta clara | Pegasus: 3 ales i estrella |
| Kyoya | melena verda, mirada marcada i roba terrosa | Leone: 5 urpes de melena |
| Ryuga | cabell blanc llarg i expressió fosca | L-Drago: 3 urpes inverses |
| Kenta | puntes verdes i equip taronja | Sagittario: fletxes amb cua de flama |
| Chris | serrell daurat llarg i roba blava | Orion: anell orbital i coixinets |
| King | cresta blava i armadura vermella | Variares: 6 destrals |
| Aguma | cabell castany llarg i roba fosca | Kronos: 4 dalles de temps |
| Dynamis | cabell argentat, blanc i violeta | Jupiter: 5 orbes guardians |
| Rago | corona violeta i vestit fosc | Nemesis: 4 fulles i 8 puntes |

Les rotacions es quantitzen a 16 frames per mantenir la lectura pixel-art tant al radi de combat (`r=8`) com a les vistes detallades (`r>=14`). Tot l’art és original i es dibuixa amb primitives locals; no hi ha sprites copiats ni recursos externs.

## Àudio

Música de menú, combat i cap final, més efectes de navegació, llançament, impacte, especial, Burst i resultats. Tot es genera localment amb Web Audio; no s’utilitzen fitxers musicals externs. El sistema limita veus simultànies i neteja nodes finalitzats per evitar saturació.

## Arquitectura

- `index.html`: carcassa accessible, Canvas 320×240 i controls.
- `css/style.css`: màquina arcade, escalat, responsivitat i accessibilitat.
- `js/random.js`: PRNG determinista i streams independents d’aleatorietat.
- `js/data.js`: nou bladers i cinc estadis.
- `js/visuals.js`: catàleg original de nou retrats 12×12 i nou perfils de silueta Bey.
- `js/audio.js`: música/SFX chiptune amb Web Audio.
- `js/game.js`: escenes, renderitzat, combat, IA, torneig i persistència.

## Aleatorietat reproduïble

`js/random.js` crea cinc streams deterministes i reiniciables a partir d’una seed comuna: `gameplay` (dany i fases de llançament), `ai`, `burst`, `visual` (partícules, estrelles i tremolor) i `tournament` (rivals i estadis). Cada stream avança independentment; canviar els efectes visuals, el tremolor o la freqüència de renderitzat no altera IA, Burst ni combat. En ús normal la seed prové del sistema. `globalThis.BEY_BATTLE_SEED` només s’aplica quan `globalThis.BEY_BATTLE_TEST === true`.

## Proves

No hi ha dependències externes. Amb Node.js 22 o superior:

```powershell
npm test
npm run check
npm run test:browser
```

`npm test` carrega el codi real (`random.js`, `data.js`, `visuals.js` i `game.js`) dins `node:vm` amb DOM, Canvas i Sound falsos. Caracteritza el catàleg visual i el render real a `r=8`/`r>=14`, independència dels streams, moviment, col·lisions, puntuació, Burst, els nou especials, IA, torneig, desbloqueig i controls. L’API `globalThis.BEY_BATTLE_TEST_API` només existeix amb el flag de test actiu. `npm run test:browser` executa l’smoke existent amb Chrome/Edge.

## Recuperació

La versió original intacta està marcada per la branca local `backup-retro-original-7da3378` i pel commit `7da3378`. També existeixen stashes de les reconstruccions descartades; no cal aplicar-los per jugar aquesta versió.

## Validació opcional

Amb Node.js 22 o superior i Chrome/Edge instal·lat pots executar la prova de navegació completa:

```powershell
npm run test:browser
```

La prova recorre controls, opcions, torneig, PvP, selecció d’estadi, VS, combat i pausa; també verifica moviment reduït i colors forçats. No desa captures ni modifica el progrés del joc.
