# Bey Battle Ultimate 3D — Metal Fury × Burst Evolution

Joc web 3D de batalles de baldufes amb **19 bladers**, **7 estadis**, física a pas fix, dos torneigs, PvP local, tutorial interactiu, entrenament i supervivència. La partida funciona completament amb models procedurals locals; els models GLB opcionals mai són obligatoris.

## Executar

Requereix Node.js 18 o superior només per servir els mòduls ES.

```powershell
npm.cmd install
npm.cmd run serve
```

Obre <http://localhost:4173>. No obris `index.html` amb `file://`: els mòduls ES i el manifest d'assets requereixen HTTP. Per publicar, puja els fitxers estàtics —inclosa la carpeta `vendor/`— a GitHub Pages. `.nojekyll` ja està inclòs.

## Controls

| | Jugador 1 | Jugador 2 |
|---|---|---|
| Moure | W A S D | Fletxes |
| Llançar / poder | Espai | Enter |

Menús: WASD/fletxes i Espai/Enter · `Esc`/`P`: pausa · `M`: música · `R`: reinicia entrenament.

- Ring out: **1 punt**
- Spin finish: **1 punt**
- Burst finish: **2 punts**
- Guanya qui arriba primer a **3 punts**; cada ronda dura 60 segons.

## Arquitectura

- `js/core/`: aplicació, input, persistència i progressió.
- `js/physics/`: simulació autoritària sobre el pla XZ a 60 Hz.
- `js/3d/`: Three.js, càmera, llums, estadis i partícules; `BeyFactory.js` i `CharacterFactory.js` defineixen 19 dissenys geomètrics específics.
- `js/data/`: 9 bladers Metal Fury, 9 Burst Evolution, 1 blader comunitari i estadis.
- `js/ui/`: interfície DOM accessible sobre el WebGL.
- `js/audio/`: música i SFX originals generats amb Web Audio.
- `js/assets/`: carregador GLB amb fallback procedural.
- `assets/models/`: cache local de models opcionals i contracte de nodes Burst.
- `ASSET_SOURCES.md`: auditoria de llicències i política d'incorporació de recursos.

## Proves

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run test:browser
```

Les proves cobreixen llançament, spin, parets, ring out, Burst, poders, hazards, empats, torneig, 19 dissenys de Bey i 19 perfils de personatge. El smoke test de Chrome valida loader, tutorial, VFX, reconstrucció després de Burst i pausa.

## Models 3D opcionals amb Meshy

La generació és una **eina de desenvolupament manual**. El navegador no rep mai la clau i el joc no crida cap API durant una partida. Copia `.env.example` només com a referència i defineix el secret a la sessió:

```powershell
$env:MESHY_API_KEY="la_teva_clau_privada"
node tools/generate-model.mjs beys gingka
```

L'eina crea una única generació controlada amb preview + refine, espera el resultat, descarrega un GLB, actualitza `assets/models/manifest.json` i no torna a generar un ID existent. Sense clau, tot continua funcionant amb geometria procedural. La generació pot consumir crèdits del teu compte Meshy; executa-la només deliberadament.

Variables:
- `MESHY_API_KEY`: clau privada, obligatòria només per generar.
- `PORT`: port del servidor local, per defecte 4173.

## Persistència i rendiment

`localStorage` conserva Rago, tornejos, rècords, volum i qualitat. També migra el desbloqueig antic `beyfury_rago`. La qualitat baixa desactiva ombres i limita partícules; les geometries instanciades redueixen draw calls. Si falta un GLB o el manifest, el model procedural apareix automàticament.

## Llicències i contingut

Fan game no oficial. No inclou música, models ni imatges oficials. Three.js està fixat a la versió 0.186.1. Els assets que generis amb serveis externs estan subjectes als termes del servei corresponent.

## Model comunitari inclòs

El blader bonus **Aerin — Wind Serpent** utilitza una malla externa real convertida a GLB:

- Font: [Spinning Top - Two Seperate Halves](https://www.3d-printed.org/models/model-960484-spinning-top-two-seperate-halves-requires-glue)
- Autor: spellbound_shipman
- Llicència: CC0 1.0
- GLB optimitzat: `assets/models/beys/serpent.glb` (~880 KB)
- Font verificable: `assets/models/sources/cc0-spinner-half.stl`

La conversió es pot reproduir amb:

```powershell
node tools/convert-stl-to-glb.mjs assets/models/sources/cc0-spinner-half.stl assets/models/beys/serpent.glb
```

Consulta `ASSET_SOURCES.md` per al hash, transformacions i auditoria completa.
