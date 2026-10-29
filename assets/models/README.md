# Contracte dels models 3D

El joc funciona sense cap fitxer GLB. Qualsevol model extern és opcional i ha de tenir una llicència compatible amb la redistribució del projecte.

## Entrades del manifest

```json
{
  "beys:gingka": {
    "path": "assets/models/beys/gingka.glb",
    "source": "URL i autor",
    "license": "CC-BY-4.0",
    "attribution": "Text d'atribució",
    "targetSize": 7.4,
    "rotation": [0, 0, 0],
    "offset": [0, 0, 0],
    "parts": {
      "layer": "Bey_Layer",
      "disc": "Bey_Disc",
      "driver": "Bey_Driver"
    }
  }
}
```

- Els Beys es normalitzen a 7,4 unitats de diàmetre i s'alineen amb la punta a `y=0`.
- Els personatges es normalitzen a 17 unitats d'altura.
- Els estadis es normalitzen a 82 unitats de diàmetre.
- Les rotacions del manifest són graus.
- Per tenir un Burst real, els tres nodes canònics han d'existir. Si falten, el GLB s'oculta en el Burst i s'utilitzen les tres peces procedurals.
- No afegeixis models amb llicència desconeguda, no redistribuïble o només per a ús personal.
