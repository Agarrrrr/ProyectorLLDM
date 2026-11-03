# Salida proporcional 16:9

TV, OBS, fondos y previsualizadores utilizan las mismas proporciones. La salida se dibuja al tamaño real de la ventana del navegador; no se amplía una página fija de 1080p mediante una transformación CSS.

| Resolución | Ancho | Alto |
| --- | ---: | ---: |
| HD | 1280 | 720 |
| Full HD | 1920 | 1080 |
| QHD | 2560 | 1440 |
| UHD / 4K | 3840 | 2160 |

En una TV, selecciona su resolución nativa en Windows y abre la salida en pantalla completa. En OBS, configura el ancho y alto de cada fuente Navegador con la resolución del lienzo. Arrastrar una fuente de 1080p para llenar un lienzo 4K no equivale a configurar esa fuente como 3840 × 2160.

Las fuentes de TV y de banners se configuran por separado. Si la resolución de salida final de OBS es menor que su lienzo, OBS realiza su propia reducción al transmitir o grabar.

## Composición y tamaños

Se conservan las medidas de referencia del diseño aprobado como coordenadas lógicas, no como límite de resolución. `output-viewport.css` define la unidad relativa de cada documento de salida; 1 rem corresponde a 16 unidades del diseño. `output-viewport.js` comparte la conversión para las mediciones de texto y centra el área 16:9.

Los estilos de TV, OBS y reposo utilizan estas unidades. Los textos generados en JavaScript, los límites de ajuste, los logos y sus separaciones siguen la misma escala. Los iframes de fondo y listas reciben el tamaño nativo de la salida. Los previsualizadores trabajan directamente con su espacio disponible.

Las coordenadas internas de un SVG permanecen en su propio `viewBox`; no se escalan de nuevo sus animaciones. Los banners y el logo se anclan al área 16:9, también cuando hay márgenes en una pantalla ultrapanorámica.

Los valores de tamaño de letra guardados siguen siendo compatibles. Por ejemplo, 156 representa 156 píxeles en Full HD, 208 en QHD y 312 en 4K. El operador mantiene el mismo valor para conservar la proporción. Cambiar la resolución no cambia las estrofas, sus divisiones, los renglones ni los cuadros seleccionados.

Los fondos y logos SVG mantienen su definición al variar la resolución. Las imágenes de mapas de bits y las presentaciones convertidas tienen el detalle de sus archivos de origen.

## Nuevas importaciones

PowerPoint y PDF se convierten con un lado máximo de 3840 píxeles, respetando la proporción original. Un documento 4:3 o vertical se encaja completo dentro de la salida, sin estirarlo a 16:9. Las imágenes subidas conservan sus dimensiones originales.

Para aprovechar esta conversión en una presentación guardada anteriormente a 1080p, importa de nuevo el original. No se regeneran automáticamente los archivos ya guardados.

La conversión 4K requiere más memoria temporal, espacio y tiempo que una de 1080p. Solo se realiza al importar. Si una instalación necesita reducir esa carga, el responsable técnico puede definir `PRESENTATION_MAX_EDGE=1920` o `2560` antes de iniciar Node.js. El rango admitido es de 1280 a 7680 píxeles; no es un selector de resolución para las TV.

## Comprobaciones realizadas

- Igualdad de las medidas del diseño anterior y actual a 1920 × 1080 para letra, banner clásico y banner angular.
- Proporciones de texto, logo y banners a 720p, 1080p, QHD y 4K, además de minivisores y una ventana 2560 × 1080.
- Himnario, Coro, Biblia, Temas, referencias especiales, fondos y listas con iframes nativos a 1080p, QHD y 4K.
- Minivisor y dos TV sincronizados, listas fijas y rotativas, pausa y transiciones.
- Conversión PDF real con páginas 16:9, 4:3, verticales y cuadradas. `tests/presentation-resolution.test.js` requiere Python con PyMuPDF y utiliza `PYTHON_PATH` cuando está definido.

La exportación mediante PowerPoint COM requiere PowerPoint de escritorio en Windows. Se verificó con PowerPoint instalado: una diapositiva 16:9 produjo 3840 × 2160 y una 4:3 produjo 3840 × 2880. El conversor desactiva macros al abrir el archivo y evita cerrar una aplicación de PowerPoint que ya estuviera abierta.
