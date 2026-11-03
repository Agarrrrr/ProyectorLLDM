# Rendimiento del servidor

Las mejoras se concentran en el cálculo de letras, el tráfico de sincronización y las escrituras al disco. El servidor sigue siendo un único proceso de Node.js con archivos locales; no requiere Redis, una base de datos externa ni servicios de nube.

## Cálculo de letras

- Los cantos ya preparados se reutilizan mientras no cambien su título, número, secciones o diseño. Himnario y Coro tienen claves independientes.
- La caché de cantos admite hasta 96 entradas y un presupuesto serializado de 4 MiB. Devuelve copias para evitar que una edición modifique los resultados guardados.
- La paginación de secciones utiliza otra caché de hasta 512 entradas y 4 MiB. Tiene en cuenta texto, fuente, tamaños mínimo y máximo y límite de renglones.
- Las anchuras de texto tienen un máximo de 40 000 entradas y 4 MiB de presupuesto serializado. Se conservan hasta ocho fuentes abiertas, expulsando las menos utilizadas.
- Los límites en bytes corresponden a claves y valores serializados. El uso real de RAM incluye objetos de JavaScript, fuentes, catálogos y memoria de Node.js; no representan un límite total de memoria del proceso.
- El motor de fuentes se carga cuando se necesita medir letras o validar una fuente importada, en lugar de cargarlo obligatoriamente al arrancar.

La primera preparación de un canto nuevo todavía requiere calcular su distribución. Cambiar letra, fuente o tamaños también puede requerir ese cálculo. La caché no modifica las reglas de separación, las repeticiones, el tamaño de letra ni los límites del cuadro.

## Sincronización

La cabina recibe el estado completo necesario para trabajar. Las TV, minivisores, OBS y la aplicación de listas solicitan `/ws?view=output`, que recibe la salida actual, revisión, ajustes y datos mínimos para identificar la vista de lista. Las actualizaciones propias de las listas y los eventos de OBS siguen llegando por su canal de mensajes habitual.

Los índices internos de búsqueda no se envían en las respuestas HTTP ni en los estados WebSocket. Cada versión del estado se serializa una sola vez por difusión y se comparte entre los clientes del mismo tipo.

Una conexión con un envío pendiente conserva únicamente la última instantánea de estado. No acumula una cola de estados intermedios. Si el búfer supera 1 MiB, se cierra la conexión lenta y el navegador puede reconectarse para recibir el estado vigente. Esta política agrupa estados completos; no descarta eventos de listas o banners.

El servidor comprueba cada 30 segundos si las conexiones responden. Las conexiones muertas se retiran. Los mensajes entrantes de WebSocket tienen un máximo de 64 KiB y cada conexión puede enviar hasta 40 acciones por segundo. La compresión de WebSocket permanece desactivada para evitar su coste de CPU y memoria.

La rotación de listas programa un único temporizador para el siguiente cambio. Se retiró la comprobación que se ejecutaba cada 100 ms incluso fuera de las listas. Al pausar, mostrar el fondo o proyectar otro contenido se cancela ese temporizador. Cambiar la duración lo reinicia conservando la vista actual.

## Escrituras y seguridad básica

El área de preparación solo se escribe cuando cambia su contenido persistente. Avanzar por el mismo canto conserva la posición de proyección en su archivo correspondiente, pero no vuelve a escribir innecesariamente los borradores y selecciones. Las escrituras siguen siendo inmediatas y usan archivo temporal y renombrado.

Se retiró CORS abierto. Las peticiones y las conexiones WebSocket validan el destino local y el origen del navegador. La cabina funciona mediante localhost, la IP local de la PC y su nombre local. Si utilizas un proxy o un alias de dominio personalizado, necesitará una configuración explícita; no se acepta cualquier nombre recibido.

Estas comprobaciones no sustituyen una contraseña ni convierten el servidor local en un servicio preparado para publicarse. La aplicación sigue destinada a la red del templo. No abras su puerto en el router. La PC por Ethernet y el móvil por Wi-Fi pueden usar el mismo router sin depender de una zona móvil de Windows.

## Medición reproducible

En una terminal dentro del proyecto ejecuta:

```text
npm run benchmark
```

El comando lee el catálogo instalado, selecciona un himno largo, prepara sus diapositivas dieciséis veces y calcula el tamaño de los mensajes. No inicia el servidor, modifica archivos ni cambia la salida de las TV. Utiliza el perfil predeterminado de Himnario para que la medición sea comparable.

Una medición realizada con el himno 202, «En Un Tiempo De Aceptación», produjo 21 diapositivas y estos tamaños:

| Mensaje por actualización | Bytes |
| --- | ---: |
| Estado completo con índices internos, equivalente al envío anterior | 54 496 |
| Estado completo actual para la cabina | 46 822 |
| Estado reducido actual para TV | 2 366 |

En este escenario el mensaje de TV se reduce un 95,7 %. La proporción cambia según el canto, las selecciones y los ajustes. No incluye imágenes, fuentes, cabeceras de red ni eventos propios de las listas.

En la revisión más reciente la primera preparación tardó unos 528 ms y las siguientes promediaron 0,12 ms. Son medidas de este equipo, no una garantía para cualquier computadora.

La preparación repetida del mismo canto se midió entre aproximadamente 0,13 y 0,81 ms después de aplicar la caché, según la carga del equipo durante las mediciones; antes se midió alrededor de 160 ms. La primera preparación sigue siendo más costosa, incluye la carga diferida del motor de fuentes y depende del equipo y de otros procesos. Estos tiempos no representan la latencia total entre el dispositivo y la TV.

Los campos `heap` y `rss` del resultado son una instantánea de memoria de ese proceso de medición. No equivalen al consumo de una instalación completa durante un servicio ni incluyen la memoria de OBS o de los navegadores.

## Verificación

`npm test` comprueba, entre otras cosas, límites de caché, agrupación de estados pendientes, cambios de catálogo, igualdad de la salida, persistencia y distribución de todos los cantos del catálogo. `npm run build:lists` reconstruye la aplicación de listas con el nuevo modo de conexión.

Para evaluar una instalación durante un servicio real, observa también CPU y memoria de Node.js, OBS y los navegadores en el Administrador de tareas. La conversión de presentaciones, la primera preparación de un canto y la exportación de imágenes son cargas diferentes de mantener una proyección ya preparada.

## Vistas previas y archivos estáticos

Las vistas previas del fondo y de OBS dentro de Ajustes reciben el borrador directamente de la cabina. No abren conexiones WebSocket ni consultan los ajustes del servidor por su cuenta. La vista previa permanece aislada de los envíos reales a OBS.

Los archivos compilados de listas bajo `/carteleria/assets/` utilizan nombres con una huella de contenido y caché inmutable de un año. Una nueva compilación cambia las direcciones; la página HTML y los archivos de la cabina siguen revalidándose para recibir las actualizaciones. Esto reduce descargas al volver a abrir listas; no reduce el coste de la primera descarga.

Las siguientes áreas para medir son el arranque en equipos modestos, el cálculo inicial de cantos extensos y la exportación de imágenes o presentaciones. No se ha medido todavía una sesión prolongada con el hardware y la red de cada templo. El consumo de OBS y del navegador suele necesitar una evaluación separada del proceso del servidor.

## Prueba local de proyección durante un respaldo

En tres tandas se usó Edge con la salida a TV a 1920 × 1080, una cabina, un editor de listas con viewport móvil y clientes WebSocket de prueba. El servidor llegó a 18 conexiones en la misma PC. Se envió el himno 202 al iniciar y se volvieron a enviar posiciones del mismo canto durante la descarga de un ZIP de entre 1,86 y 1,95 MB con 32 diapositivas de presentación.

| Medición | Resultado observado |
| --- | ---: |
| Primera solicitud hasta detectar la letra en el navegador de TV | 509–712 ms |
| P95 por tanda hasta el último de ocho clientes WebSocket de prueba, con cálculo en caché | 38–142 ms |
| P95 por tanda al iniciar las solicitudes junto a la descarga del respaldo | 67–140 ms |

Cada tanda en caché tuvo 15 solicitudes. Los rangos describen esta prueba corta y las transferencias pueden terminar antes de las últimas solicitudes. La conversión de presentaciones, la exportación de imágenes de listas, el proceso de OBS y la latencia de una red física quedan fuera de estas cifras. El respaldo ZIP se lee y se escribe por flujo para evitar cargar todas sus diapositivas en RAM. Los cambios de las listas se serializan una sola vez por difusión y se comparten entre los clientes conectados.
