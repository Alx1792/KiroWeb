# PROMPT DE CONTEXT: BEY BATTLE ULTIMATE 3D

Aquest projecte ja no és el prototip 2D original. És un joc web 3D modular i jugable basat en Three.js. Abans de modificar-lo, llegeix `README.md`, `ASSET_SOURCES.md` i els fitxers indicats aquí.

## Arquitectura actual

- `index.html` i `css/style.css`: shell WebGL, UI moderna i HUD DOM.
- `js/main.js`: inicialització i bucle fix a 60 Hz.
- `js/core/GameApp.js`: escenes, modes, torneigs i flux de partida.
- `js/physics/BattleSimulation.js`: física autoritària sobre el pla XZ, spin, col·lisions, Burst, hazards, IA, poders i puntuació.
- `js/3d/Renderer3D.js`: càmera, llums, estadis, avatars, efectes i sincronització amb la simulació.
- `js/3d/BeyFactory.js`: 19 dissenys procedurals diferenciats, cadascun amb capa, disc i driver.
- `js/3d/CharacterFactory.js`: 19 perfils explícits de cabell, cos, roba i accessoris.
- `js/data/gameData.js`: 9 bladers Metal Fury, 9 Burst Evolution, estadístiques, poders i 7 estadis.
- `js/assets/AssetManager.js`: GLB opcional, normalització, cache, animacions i contracte de peces; sempre conserva fallback procedural.
- `js/audio/AudioManager.js`: música, SFX i gir procedural amb Web Audio.
- `js/ui/UI.js`: menús, selecció, col·lecció, opcions i HUD.
- `assets/models/manifest.json`: registre v2 d'assets GLB amb origen, llicència i transformacions.
- `tools/generate-model.mjs`: generació Meshy manual; mai s'executa durant la partida.
- `tests/simulation.test.js` i `tools/browser-smoke.mjs`: regressió de mecàniques i prova WebGL/PvP.

## Funcionalitats que s'han de conservar

- Combat ràpid, torneig Metal Fury, torneig Burst Evolution, PvP local, entrenament i supervivència.
- Llançament amb barra, moviment, spin, estabilitat, col·lisions, parets i sortides.
- Ring out = 1 punt, spin finish = 1 punt, Burst finish = 2 punts; victòria a 3; rondes de 60 s.
- 18 poders diferenciats connectats amb la física.
- Rago i Temple Nèmesi bloquejats fins a completar Metal Fury; persistència amb `localStorage` i migració de `beyfury_rago`.
- Estadis Classic, Gel, Volcà, Estel·lar, Temple Nèmesi, Evolution i Snake Pit, amb perills reals.
- Models procedurals locals quan falta qualsevol GLB o servei extern.

## Regles d'assets

- No incorporis models, captures, textures o música amb llicència desconeguda.
- Cada asset extern necessita `source`, `license` i atribució al manifest.
- No extreguis malles de jocs o episodis oficials.
- Els Beys GLB han d'usar, idealment, `Bey_Layer`, `Bey_Disc` i `Bey_Driver`; si falten, el Burst usa les peces procedurals.
- La partida normal no pot dependre de Meshy ni exposar `MESHY_API_KEY` al navegador.

## Dissenys procedurals

`BeyFactory.js` diferencia explícitament les 18 baldufes mitjançant ales, urpes, caps de drac, fletxes, coixinets, destrals, dalles, orbes, espases, goma d'absorció, pesos i rodets. No les substitueixis per un únic disc recolorit.

## Validació obligatòria

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run test:browser
```

No declaris una funcionalitat acabada si aquestes proves fallen. Per executar el joc:

```powershell
npm.cmd install
npm.cmd run serve
```

Obre `http://localhost:4173`; no utilitzis `file://`.

## LA MEVA TASCA

> [Escriu aquí el canvi concret que vols implementar.]
