# xolosArmy Network — rediseño 3D y SEO

Fecha: 5 de septiembre de 2026. Base revisada: `d6c7ff69408883d35d3cc8f91eee0838416c8ed9`.

## Resultado propuesto

La portada y `/ecosystem/` incorporan un atlas tridimensional interactivo de Tonalli. Una esfera facetada, órbitas y seis nodos conectan la navegación con Tonalli Wallet, Xolos Explorer, Teyolia, Guardianía RMZ, XoloLegend y Xolos Ramírez. La dirección visual conserva la obsidiana y el oro e incorpora verde jade.

El contenido principal permanece en HTML. Los enlaces, la navegación y la lectura funcionan sin JavaScript y sin WebGL. El atlas mejora esa base con giro por arrastre, flechas del teclado, selección de nodos, pausa y restablecimiento. El portal conserva las rutas existentes y no modifica las operaciones de la wallet, el checkout ni la aplicación compilada de Guardianía.

La jerarquía de la portada ahora es: identidad y atlas; herramientas; censo y registros; capa humana; lecturas; participación. Las once páginas del portal comparten navegación y superficies con profundidad. Los artículos conservan su diseño editorial, con mejoras de metadatos y enlaces de regreso.

## Auditoría y cambios

| Área | Antes | Propuesta |
| --- | --- | --- |
| Páginas HTML, excluidos fragmentos | 130 | 130, sin eliminar URLs |
| Título ausente | 1 | 0 |
| Meta description ausente | 64 | 0 |
| Canonical ausente | 113 | 0 |
| Canonical incorrecto | 8 | 0 |
| Sitemap | 75 URLs, una inexistente | 130 URLs reales y únicas |
| Directorio del blog | 16 artículos enlazados | 116 artículos enlazados |
| Cabecera y pie de portada | Marcadores vacíos, sin código que los cargara | Navegación estática en el documento |
| Contenido cinematic | `.reveal` ocultaba texto antes de JS | Visible desde la primera respuesta HTML |
| Censo | Ceros iniciales y etiqueta “Live On-Chain” para un JSON publicado | Valores desconocidos como “—”, fecha UTC de la observación y aviso de antigüedad |

Se añadieron o corrigieron canonical, descripción, Open Graph, metadatos de X/Twitter y datos estructurados. El contenido de las descripciones nuevas se redactó según cada artículo. Los esquemas originales se conservaron cuando existían, corrigiendo referencias de página inválidas y un logo inexistente. No se inventaron autores, fechas de publicación, valoraciones ni resultados enriquecidos.

El directorio de la bitácora enlaza los 116 artículos en orden alfabético. Se añadieron rutas de regreso al blog y al ecosistema donde faltaban. Se corrigieron enlaces de compartición asociados a aliases inexistentes, el recurso descargable de prensa y el cierre HTML incompleto de `xoloitzcuintli-standard.html`, sin inventar contenido del artículo. Se cambió a párrafo el branding que duplicaba el H1 en cuatro artículos; se respetaron encabezados bilingües y la aplicación de Guardianía.

## 3D, accesibilidad y datos

- WebGL nativo, sin bibliotecas nuevas, CDN de gráficos, modelos descargables ni pasos de compilación.
- Geometría determinista; cinco grupos de dibujo; resolución limitada a DPR 1.5 y renderizado limitado a 30 FPS.
- Carga diferida al acercarse el mapa al área visible. Con movimiento reducido o ahorro de datos, el usuario activa el atlas y este comienza en pausa.
- Suspensión del bucle al ocultar la pestaña, salir de la vista o pausar. Recuperación de pérdida de contexto y liberación de recursos al abandonar la página; se conserva la restauración desde BFCache.
- Botones HTML de 44 × 44 px, posición calculada desde la misma proyección del renderer y separación mínima de objetivos. La selección mediante teclado pausa el giro.
- La escena no captura el desplazamiento vertical táctil.
- Los datos del censo se consultan de manera independiente al 3D. Se conservan los ceros reales, se rechazan valores inválidos y no se presenta una lectura publicada como una conexión en vivo.
- Los nombres y estados de registros se insertan como texto, no como HTML. Las transacciones solo enlazan IDs hexadecimales de 64 caracteres al explorador previsto.

El HTML, CSS y JavaScript propios necesarios para la nueva portada y el atlas suman aproximadamente **58.8 kB sin comprimir / 18.9 kB como estimación gzip**. Esto excluye Google Analytics, el arte SVG reutilizado y los JSON del censo. No es una medición de transferencia del hosting ni un resultado de Core Web Vitals.

## Verificación realizada

- `python3 tools/site_seo.py`: 130 páginas, 11 páginas del portal y 116 artículos; **0 errores** en las reglas comprobadas.
- Se verificaron canonical, identidad Open Graph, metadatos básicos, JSON-LD válido, cobertura y unicidad del sitemap, descubrimiento desde el blog y rutas/anchors/recursos locales de las once páginas del portal.
- `node --test tools/network.test.mjs`: **14/14 pruebas aprobadas**. Incluye perspectiva, normales de geometría, objetivos móviles/escritorio, validación y antigüedad del censo, datos hostiles, fallo de red, montaje y ciclo de vida del renderer con dobles de prueba.
- `node --check` en los cuatro módulos nuevos y `git diff --check`: aprobados.
- Cabecera y pie están escritos en HTML; no se requiere un servicio de componentes ni un build.

**Límites de esta verificación:** no se ejecutó el sitio en un navegador ni en una GPU. Los tests del renderer usan un doble de WebGL: no certifican la compilación de shaders por un driver, la apariencia, la interacción real, los FPS, Lighthouse ni Core Web Vitals. La comprobación visual y de rendimiento en navegador queda pendiente para la revisión del PR. No se desplegó esta propuesta ni se modificó `main`.

## Observaciones preexistentes

El auditor informa 14 páginas con referencias a ocho imágenes sociales locales ausentes. Las referencias ya estaban en la base; se conservaron según la guía de Sites, que indica mantener las imágenes de vista previa existentes cuando no se solicita renovarlas. No se generaron imágenes de compartición ni se sustituyeron por otras no solicitadas.

- `/assets/og-tonalli.jpg`
- `/assets/og/xolosarmy-open-source-stablecoins.jpg`
- `/img/blog/chromatic-spirit-of-crypto.jpg`
- `/assets/og/xolo-digital-spaces.jpg`
- `/img/og/ancestral-fire-rmz.jpg`
- `/assets/telegram-wallet-guide-preview.jpg`
- `/assets/og/xolo-legacy.jpg`
- `/assets/img/xolosarmy-biological-preservation-hero.jpg`

La portada nueva conserva la ausencia de imagen social que tenía la portada original. Las imágenes externas y el contenido histórico de los artículos no se sometieron a una auditoría editorial o de disponibilidad externa completa.

## Fuentes técnicas

Se siguieron las recomendaciones sobre contenido útil, enlaces rastreables y estructura del sitio de la [guía SEO de Google Search Central](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). La preservación del texto y la navegación en HTML se apoya en [JavaScript SEO de Google](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). El control de resolución, recursos y contexto del atlas sigue las [prácticas de WebGL de MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

Estas medidas mejoran la base técnica y el descubrimiento del contenido. No equivalen a garantizar indexación, resultados enriquecidos o posiciones en Google.
