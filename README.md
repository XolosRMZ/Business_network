# xolosArmy Network / Civilización Tonalli

Sitio estático de [xolosarmy.xyz](https://xolosarmy.xyz/): identidad, herramientas del ecosistema, censo del linaje, artículos y documentos de la comunidad.

## Estructura

- `index.html`: portada, accesos al ecosistema y censo.
- `ecosystem/index.html`: atlas 3D y directorio de herramientas.
- `js/network-scene.mjs` y `js/network-math.mjs`: renderer WebGL nativo y geometría.
- `js/portal.mjs`: carga progresiva del atlas y del censo.
- `js/census.mjs`: lectura y presentación segura de los datos publicados.
- `css/network.css`: tema compartido de las once páginas del portal.
- `components/`: fuentes de la cabecera y pie compartidos; sus copias están incluidas en el HTML para no depender de JavaScript.
- `blog/`: artículos; su índice enlaza todos los documentos existentes.
- `data/`: archivos publicados por el Oráculo. No se generan en el navegador.

No hay instalación de dependencias ni paso de build. El hosting debe servir esta carpeta desde la raíz y los `.mjs` con un tipo MIME de JavaScript. Se conserva el dominio configurado en `CNAME`.

Para revisar localmente, cualquier servidor estático es suficiente, por ejemplo `python3 -m http.server 8000`. Abrir HTML como `file://` no permite cargar los módulos y JSON de la misma forma que el hosting.

## Verificación

Requiere Python 3.9+ y Node.js 20+; no usa paquetes externos ni GitHub Actions.

```sh
python3 tools/site_seo.py
node --test tools/network.test.mjs
node --check js/network-scene.mjs
node --check js/network-math.mjs
node --check js/portal.mjs
node --check js/census.mjs
git diff --check
```

Cuando se añade o elimina una página, actualizar sus metadatos y el directorio correspondiente, y regenerar el sitemap:

```sh
python3 tools/site_seo.py --write-sitemap
```

El auditor excluye fragmentos de `components/` y no inventa fechas `lastmod`. Distingue errores de las imágenes sociales ausentes que ya existían en el repositorio.

El detalle del rediseño, su auditoría, las pruebas realizadas y las comprobaciones pendientes en navegador están en [docs/3d-seo-review.md](docs/3d-seo-review.md).
