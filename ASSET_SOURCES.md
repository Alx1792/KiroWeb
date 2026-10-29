# Auditoria de recursos 3D

Data de revisió: 29 d'octubre de 2026.

## Resultat

No s'ha incorporat cap model de tercers. Les cerques de Cosmic Pegasus, Fang Leone, L-Drago Destructor, Drain Fafnir, Legend Spryzen i Nightmare Longinus no van retornar un conjunt complet amb autoria, llicència de redistribució i versions coherents verificables. Els agregadors trobats apuntaven principalment a STLs d'impressió, remakes, variants d'altres temporades o contingut amb condicions no prou clares.

Sketchfab permet que l'autor triï llicències Creative Commons, però cada model s'ha de verificar individualment i cal respectar atribució, no-comercial, no-derivats o share-alike segons el cas. Que un model sigui visible o descarregable no implica que es pugui incloure automàticament en aquest repositori.

## Política aplicada

1. Només incorporar assets amb llicència explícita compatible.
2. Guardar URL, autor, llicència i atribució al manifest.
3. No extreure models de videojocs, episodis o productes oficials.
4. No utilitzar un model d'una temporada diferent com si fos la versió indicada.
5. Mantenir sempre el fallback procedural local.

## Solució actual

`js/3d/BeyFactory.js` construeix 18 dissenys diferenciats amb geometria pròpia: ales, urpes, caps de drac, fletxes, coixinets, destrals, dalles, orbes, espases, goma d'absorció i rodets. Són interpretacions procedurals per a aquest fan game, no còpies de malles oficials.

## Fonts consultades

- Sketchfab, guia de llicències Creative Commons: https://sketchfab.com/blogs/community/an-introduction-to-creative-commons-licenses/
- Sketchfab, suport glTF: https://sketchfab.com/features/gltf
- The Models Resource: https://www.models-resource.com/
- Meshy Text to 3D API: https://docs.meshy.ai/en/api/text-to-3d

Abans d'afegir un futur GLB, revisa de nou la pàgina concreta del model perquè les condicions poden canviar.

## Verificació directa del catàleg (29 d'octubre de 2026)

S'ha consultat l'API pública de Sketchfab amb `downloadable=true`, no només els resultats del cercador:

- `cosmic pegasus`: 0 resultats.
- `drain fafnir`: 0 resultats.
- `l-drago destroy`: 0 resultats.
- `spryzen`: 0 resultats.
- `longinus beyblade`: 0 resultats.
- `phantom orion beyblade`: 0 resultats.

### Candidat rebutjat

- **Wonder Valtryek Beyblade**, autor **101NOTFOUND**, llicència **CC BY 4.0**, 14.152 cares, descarregable: https://sketchfab.com/3d-models/wonder-valtryek-beyblade-d0dca57faa7540e8a33fd7ccb6b867e0
- Motiu del rebuig: és Wonder Valtryek V4, una variant posterior i sense textures, no God/Victory Valkyrie de Burst Evolution.

També s'han localitzat un remake Beyblade X de L-Drago Destructor i un STL de Phantom Orion a Cults. No s'han incorporat perquè no són el model/format demanat o no s'ha pogut verificar la llicència de redistribució: el servidor ha retornat HTTP 403 en consultar-ne les condicions.

Conclusió: no hi ha cap dels 18 models exactes disponible al conjunt consultat amb identitat, versió, descàrrega i llicència verificables alhora. Per incorporar una malla oficial o una còpia exacta cal que el titular o l'autor proporcioni el fitxer i un permís compatible, o que l'usuari aporti un GLB adquirit amb drets de redistribució.

## Asset lliure integrat: Wind Serpent / CC0 Spinner

- Model font: **Spinning Top - Two Seperate Halves (Requires Glue)**.
- Autor original: **spellbound_shipman**.
- Llicència declarada: **Creative Commons CC0 1.0**.
- Pàgina i descàrrega allotjada: https://www.3d-printed.org/models/model-960484-spinning-top-two-seperate-halves-requires-glue
- Fitxer font: `assets/models/sources/cc0-spinner-half.stl`.
- SHA-256 verificat: `e70485e104ed596c71d7723c56d0d3e946f9d699ffed373d0919c0ec172c3cd5` (coincideix amb el publicat per l'allotjador).
- Derivat de joc: `assets/models/beys/serpent.glb`.
- Transformació: soldadura de vèrtexs, simplificació, duplicació simètrica de les dues meitats, materials propis, normalització i incorporació de `Bey_Layer`, `Bey_Disc` i `Bey_Driver`.
- Ús al joc: blader bonus fictici **Aerin — Wind Serpent**. No substitueix ni es presenta com un model oficial de Beyblade.

També s'han verificat dos models Sketchfab CC BY 4.0 potencials —Wind Serpent de kayla fox i Beyblade Model and Animation de meeww— però no s'han descarregat perquè l'API de descàrrega requereix autenticació (`401`) i no s'han intentat eludir els controls de la plataforma.
