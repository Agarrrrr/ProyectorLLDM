# Proyector LLDM: guía de instalación, uso y solución de problemas

Esta guía explica cómo instalar el programa, preparar el contenido y operar las pantallas y los gráficos de transmisión. No necesitas saber programar.

Los nombres de algunos menús de Windows, macOS, Linux y OBS pueden variar según su versión e idioma.

Desarrollado por **Huri Tolentino**.

![Cabina de Proyector LLDM al terminar la instalación, con pestañas y visor de TV.](capturas/01-cabina-inicial.png)

**Figura 1.** Así se ve la cabina cuando el programa ha iniciado. Las pestañas están arriba y el minivisor Salida a TV está a la derecha en escritorio.

### Cómo utilizar las capturas

Las imágenes muestran la interfaz real de esta versión, capturada en una instalación de prueba con una copia de los datos. Los nombres, fechas, direcciones del entorno de prueba, contenidos preparados y opciones seleccionadas pueden variar respecto a tu instalación. Utiliza la dirección de tu computadora y comprueba tus datos antes de enviar contenido.

La vista general aparece al principio; las demás figuras están junto a los pasos que ilustran. En el manual HTML puedes pulsar una imagen para ampliarla; utiliza **Cerrar** o Escape para volver a la lectura. Las capturas son referencias visuales: los botones de las imágenes no operan las TV ni OBS.

Si un visor de archivos no muestra las capturas, abre el HTML en un navegador. El archivo principal utiliza la carpeta `capturas`; la versión `GUIA_DE_USUARIO_PORTATIL.html` integra las imágenes y puede copiarse por separado.

## Índice

1. [Qué hace el programa y cómo se organiza](#1-que-hace-el-programa-y-como-se-organiza)
2. [Qué necesitas antes de comenzar](#2-que-necesitas-antes-de-comenzar)
3. [Descargar y extraer el programa](#3-descargar-y-extraer-el-programa)
4. [Instalar Node.js](#4-instalar-nodejs)
5. [Abrir el programa por primera vez](#5-abrir-el-programa-por-primera-vez)
6. [Si falta el editor de listas](#6-si-falta-el-editor-de-listas)
7. [Conectar una TV directamente a la computadora](#7-conectar-una-tv-directamente-a-la-computadora)
8. [Conectar un celular, una tablet u otra computadora](#8-conectar-un-celular-una-tablet-u-otra-computadora)
9. [Configurar OBS Studio](#9-configurar-obs-studio)
10. [Conocer la cabina y sus controles](#10-conocer-la-cabina-y-sus-controles)
11. [Usar el himnario y el catálogo del coro](#11-usar-el-himnario-y-el-catalogo-del-coro)
12. [Administrar himnos y cantos del coro](#12-administrar-himnos-y-cantos-del-coro)
13. [Proyectar temas, citas y referencias especiales](#13-proyectar-temas-citas-y-referencias-especiales)
14. [Preparar la lista de oraciones, flores y ventas](#14-preparar-la-lista-de-oraciones-flores-y-ventas)
15. [Descargar listas completas](#15-descargar-listas-completas)
16. [Importar y proyectar presentaciones](#16-importar-y-proyectar-presentaciones)
17. [Usar los gráficos de transmisión](#17-usar-los-graficos-de-transmision)
18. [Personalizar los ajustes](#18-personalizar-los-ajustes)
19. [Respaldar, restaurar y actualizar](#19-respaldar-restaurar-y-actualizar)
20. [Solución de problemas](#20-solucion-de-problemas)
21. [Rutinas de operación](#21-rutinas-de-operacion)
22. [Inicio automático y cierre del programa](#22-inicio-automatico-y-cierre-del-programa)
23. [Configuración adicional de integración con OBS](#23-configuracion-adicional-de-integracion-con-obs)
24. [Glosario y referencias](#24-glosario-y-referencias)

<a id="1-que-hace-el-programa-y-como-se-organiza"></a>

## 1. Qué hace el programa y cómo se organiza

Proyector LLDM tiene una cabina de control y dos salidas distintas. Comprender esa separación evita la mayoría de las confusiones durante un servicio.

### 1.1 La computadora de cabina

Una computadora mantiene abierto el programa y guarda los datos. En esta guía la llamaremos **computadora de cabina**.

El programa puede describir esa computadora como servidor. No necesitas comprar otro aparato: servidor significa, en este caso, que esa computadora atiende las solicitudes de las pantallas, celulares y tablets conectados.

La computadora de cabina debe permanecer encendida y con el programa funcionando mientras se utiliza el sistema. Conectar un celular no sustituye esa computadora.

### 1.2 La cabina de control

Es la página donde buscas cantos, escribes temas, preparas listas y decides qué enviar.

En la computadora de cabina se abre con esta dirección:

```text
http://localhost:4000/control
```

La cabina no es la página que debe quedar a la vista de la congregación.

### 1.3 La salida para las TV

Es la página que muestra el contenido para las pantallas del templo:

```text
http://localhost:4000/pantalla
```

Allí aparecen la letra de los cantos, sus portadas o títulos, los temas, las citas, las listas y las presentaciones que envías.

El minivisor **Salida a TV**, dentro de la cabina, utiliza esta misma salida. Es una referencia del contenido que el sistema está enviando. La TV física también debe estar conectada a la entrada o fuente correcta para que se vea.

### 1.4 La salida de gráficos para OBS

Es otra página, destinada a colocarse sobre las cámaras de la transmisión:

```text
http://localhost:4000/overlay?obs=1
```

Su fondo es transparente. Muestra el logo y los banners que activas para OBS. El añadido `?obs=1` oculta los controles de prueba de esa página.

La emisión o grabación se inicia desde OBS. Proyector LLDM aporta el contenido gráfico; enviar un banner no pone en marcha por sí solo una transmisión a una plataforma.

Un banner es el recuadro que identifica un canto, un tema, una cita o un aviso sobre la imagen de una cámara.

### 1.5 Tres acciones que debes distinguir

| Acción | Qué significa |
| --- | --- |
| Preparar | Buscar o editar algo para usarlo después. |
| Enviar a TV | Mostrar el contenido en las pantallas y activar su identificación en OBS cuando corresponde. |
| Enviar un banner a OBS | Mostrar un gráfico sobre las cámaras de la transmisión. |

Enviar un himno, canto del coro, tema, cita, referencia especial o aviso a TV activa también su banner en OBS. Los envíos de ubicación muestran su cuadro correspondiente. Las listas y las presentaciones conservan su salida propia.

Buscar otro canto, cambiar de pestaña o preparar una lista no equivale a enviarlos a TV. Los botones que dicen **Enviar**, y los cuadros de proyección que pulsas, sí pueden cambiar la salida.

Para retirar el contenido de las TV se muestra el fondo institucional. Para retirar un banner de transmisión se utiliza **Ocultar Banner**. Son controles separados.

<a id="2-que-necesitas-antes-de-comenzar"></a>

## 2. Qué necesitas antes de comenzar

### 2.1 Para la operación básica

- Una computadora con Windows, macOS o Linux capaz de ejecutar Node.js y un navegador moderno. El paquete incluye archivos de inicio preparados para los tres sistemas.
- Permiso para instalar programas en esa computadora.
- Node.js instalado. Es el componente que permite ejecutar el programa localmente.
- La carpeta completa de Proyector LLDM, extraída de su archivo ZIP.
- Un navegador actualizado, por ejemplo el que ya utilizas en la computadora.
- Internet para descargar el programa, instalar Node.js y completar la primera descarga de componentes.

No es necesario instalar Git, un editor de código ni herramientas de programación para operar la cabina.

La composición de TV utiliza proporciones 16:9 y se dibuja al tamaño real de la salida. Letras, márgenes, fondos vectoriales y logos conservan su proporción en 720p, 1080p, QHD y 4K. Una pantalla con distinta proporción muestra márgenes para conservar el contenido completo.

### 2.2 Según lo que vayas a utilizar

| Necesidad | Qué debes tener |
| --- | --- |
| Mostrar contenido en una TV conectada a la PC | Cable y conexión de video adecuados, como HDMI. |
| Controlar desde un celular o tablet | Conexión a la misma red local de la computadora de cabina. |
| Usar banners sobre cámaras | OBS Studio y una fuente Navegador. |
| Importar archivos PPT o PPTX | Microsoft PowerPoint de escritorio (en Windows) o LibreOffice junto con Python 3 y PyMuPDF (en macOS y Linux) instalados en la computadora de cabina. |
| Importar PDF | Python (o Python 3 en macOS/Linux) y PyMuPDF configurados en la computadora de cabina. |
| Importar PNG, JPG, JPEG o WebP | El archivo de imagen; no requiere PowerPoint ni Python. |

PowerPoint y Python son requisitos de formatos concretos. No son necesarios para buscar un canto, proyectar un tema o editar las listas.

### 2.3 Internet y red local no son lo mismo

Internet permite descargar componentes o transmitir a una plataforma. La red local permite que el celular se comunique con la computadora dentro del templo.

Una vez instalados los componentes, la operación básica de Proyector LLDM utiliza archivos locales. Puede continuar sin salida a internet mientras la computadora siga funcionando y los dispositivos conserven comunicación en la red local.

La transmisión a una plataforma externa sí depende de su conexión a internet, aunque los gráficos locales sigan funcionando.

<a id="3-descargar-y-extraer-el-programa"></a>

## 3. Descargar y extraer el programa

### 3.1 Descargar desde GitHub

1. Desde el repositorio, abre **Descarga rápida** y pulsa **Descargar Proyector LLDM (Última versión en ZIP)**. También puedes entrar directamente en [las versiones publicadas](https://github.com/HuriTolentino/ProyectorLLDM/releases).
2. En la versión estable más reciente, baja hasta **Assets** o **Archivos adjuntos**. Descarga el archivo `Proyector-LLDM-<versión>.zip`. Por ejemplo, en la versión 1.4.2 se llama `Proyector-LLDM-1.4.2.zip`.
3. Abre la carpeta **Descargas** de tu computadora cuando termine.

![Enlace Descargar Proyector LLDM en la sección Descarga rápida del repositorio.](capturas/49-descarga-rapida.png)

![La sección Assets con el ZIP de Proyector LLDM en la primera fila, encima de los paquetes Source code.](capturas/50-zip-en-assets.png)

Si recibiste el programa en una memoria USB, puedes comenzar desde el siguiente apartado. Conserva la carpeta completa que te entregaron.

### 3.2 Extraer el ZIP

1. Selecciona el ZIP descargado en el Explorador de archivos.
2. Pulsa **Extraer todo** en la barra superior o en el menú del clic derecho.
3. Elige una carpeta permanente, por ejemplo dentro de **Documentos**, y termina la extracción.
4. Cuando aparezca la carpeta nueva junto al ZIP, ábrela.

![Archivo ZIP seleccionado y botón Extraer todo en la barra del Explorador.](capturas/51-explorador-extraer-todo.png)

![Asistente de Windows con el campo para elegir el destino de la extracción.](capturas/52-elegir-destino-zip.png)

![El archivo ZIP y, debajo, la carpeta descomprimida que debes abrir.](capturas/53-carpeta-extraida.png)

Un ZIP es un paquete comprimido. Abrirlo muestra su contenido, pero eso no significa que ya esté instalado en una carpeta normal. No inicies el programa dentro de la ventana del ZIP.

El nombre de la carpeta descargada puede terminar en `-main`. Ese nombre no cambia la forma de utilizar el programa.

### 3.3 Identificar la carpeta correcta

La carpeta principal contiene, entre otros elementos:

```text
Iniciar Proyector LLDM.bat
Iniciar Proyector LLDM.command
Iniciar Proyector LLDM.sh
server.js
package.json
data
public
src
lista-oraciones
```

Si solo ves otra carpeta con un nombre parecido al del proyecto, entra en ella hasta encontrar esos archivos.

No abras únicamente el contenido de `lista-oraciones`: es una parte del programa, no la instalación completa de la cabina.

### 3.4 Dónde conviene guardar la instalación

Utiliza una carpeta donde tu cuenta de Windows pueda guardar cambios. La carpeta contiene tanto el programa como sus datos de trabajo.

Una ubicación permanente facilita hacer respaldos y crear accesos directos. Si la mueves después de configurar el inicio automático, también tendrás que actualizar el acceso de inicio.

<a id="4-instalar-nodejs"></a>

## 4. Instalar Node.js

### 4.1 Descargar el instalador

1. Abre la [página oficial de Node.js](https://nodejs.org/en/download).
2. Elige tu sistema operativo (Windows, macOS o Linux) y una versión **LTS** compatible.
3. Descarga el instalador para la arquitectura de tu computadora. En una PC común de 64 bits suele corresponder x64; en equipos ARM debes utilizar su opción correspondiente.
4. Abre el instalador y sigue sus instrucciones.
5. Mantén los componentes habituales, incluido npm, y la opción de añadir el programa a la ruta de comandos si aparece.
6. Finaliza la instalación y cierra las ventanas de comandos que ya estuvieran abiertas.

![Página de descargas de Node.js con la selección LTS, la arquitectura de Windows y el botón Windows Installer (.msi).](capturas/54-descarga-node-lts.png)

LTS identifica una versión con soporte prolongado. No necesitas elegir una versión experimental para utilizar este proyecto.

### 4.2 Qué versión necesita este proyecto

El servidor declara Node.js 20 o superior. Las herramientas que reconstruyen el editor de listas necesitan una versión más concreta: 20.19 o superior dentro de la rama 20, o 22.12 o superior.

Para una instalación nueva utiliza una versión LTS vigente compatible, en vez de instalar deliberadamente una versión antigua solo porque alcanza el mínimo.

### 4.3 Comprobar que quedó instalado

Esta comprobación utiliza dos órdenes breves. Copiarlas no requiere saber programar.

1. Pulsa la tecla Windows.
2. Escribe **cmd**.
3. Abre **Símbolo del sistema**.
4. Escribe lo siguiente y pulsa Enter:

```bat
node --version
```

5. Debe aparecer un número que comienza con `v`.
6. Escribe lo siguiente y pulsa Enter:

```bat
npm --version
```

7. Debe aparecer otro número de versión.

Si Windows responde que no reconoce alguna de esas órdenes, consulta [Node.js no se reconoce](#202-nodejs-no-se-reconoce).

<a id="5-abrir-el-programa-por-primera-vez"></a>

## 5. Abrir el programa por primera vez

### 5.1 Iniciar la cabina

1. Abre la carpeta principal del proyecto.
2. Busca el iniciador correspondiente a tu sistema: **Iniciar Proyector LLDM.bat** en Windows (puede mostrarse como **Iniciar Proyector LLDM** si oculta las extensiones), **Iniciar Proyector LLDM.command** en macOS o **Iniciar Proyector LLDM.sh** en Linux.
3. Haz doble clic.
4. Se abrirá una ventana de comandos.
5. Si faltan los componentes del servidor, el archivo intentará descargarlos e instalarlos.
6. Espera a que termine. El tiempo depende de la computadora y la conexión; no hay un tiempo fijo garantizado.
7. El programa revisa las actualizaciones configuradas y, cuando termina de iniciar, abre la cabina en el navegador.

![Archivo Iniciar Proyector LLDM.bat seleccionado dentro de la carpeta descomprimida.](capturas/55-lanzador-windows.png)

El iniciador abre el navegador cuando el servidor ya está listo. Antes puede instalar componentes y consultar actualizaciones de GitHub. Si no hay internet, la consulta fallida no elimina la versión existente. Si el puerto ya está en uso, no inicia otra instancia ni modifica los archivos de la que ya está funcionando.

Si la instalación ya contiene nombres, grupos o semanas preparadas, revisa esos datos con el responsable antes de modificarlos. Descargar o actualizar el programa no sustituye un respaldo.

### 5.2 Dirección de la cabina

Si el navegador no se abrió solo, escribe en su barra de direcciones:

```text
http://localhost:4000/control
```

La barra de direcciones está en la parte superior del navegador. No escribas esa dirección en el buscador de himnos ni en el cuadro del tema.

### 5.3 Qué debes comprobar

1. Aparecen las pestañas Himnario, Temas y citas, Coro, Lista de oraciones, Presentaciones y Transmisión.
2. El visor **Salida a TV** muestra el fondo de reposo.
3. El sistema no mantiene un aviso de **Sin conexión**.
4. La pestaña **Lista de oraciones** carga su editor.
5. Puedes buscar y seleccionar un canto para revisar sus cuadros.

La primera comprobación puede hacerse sin conectar todavía las TV del templo. Aun así, enviar contenido a TV ya modifica la salida del sistema, por lo que debe hacerse con conocimiento de quienes operan las pantallas.


### 5.4 La ventana del programa debe seguir abierta

La ventana de comandos mantiene funcionando la instalación iniciada con el archivo habitual.

Puedes minimizarla. Cerrar esa ventana normalmente detiene ese proceso y deja a los navegadores sin conexión.

Cerrar una pestaña de cabina no equivale a apagar el programa. Mientras el servidor siga abierto, otros dispositivos pueden continuar conectados.

### 5.5 Inicios posteriores

Para volver a utilizarlo, abre la misma carpeta y el mismo archivo de inicio.

No abras dos copias para la misma instalación. Si el programa ya está funcionando, abre directamente la dirección de la cabina en el navegador.

El archivo `iniciar_cabina.bat` es un inicio más simple: no instala componentes ni abre el navegador automáticamente. Para la primera instalación utiliza **Iniciar Proyector LLDM.bat**.

<a id="6-si-falta-el-editor-de-listas"></a>

## 6. Si falta el editor de listas

El programa utiliza una versión ya preparada del editor, situada en `lista-oraciones/dist`. Una descarga completa de esta versión puede incluirla y no necesitar reconstrucción.

El archivo principal de inicio instala los componentes del servidor si faltan, pero no reconstruye automáticamente el editor de listas.

### 6.1 Abrir una ventana de comandos en la carpeta correcta

1. Abre la carpeta principal del proyecto en el Explorador de archivos.
2. Haz clic en la barra superior que muestra la ruta de esa carpeta.
3. Escribe `cmd` y pulsa Enter.
4. Se abrirá Símbolo del sistema dentro de esa ubicación.

Debes estar en la carpeta que contiene `package.json` y `server.js`. Si la ventana está situada en otra ubicación, las órdenes pueden indicar que no encuentran esos archivos.

### 6.2 Preparar el editor

En esa ventana escribe:

```bat
npm run setup:lists
```

Pulsa Enter y espera a que termine. Esta orden descarga los componentes del editor y prepara sus archivos para la cabina.

Si todavía no se han instalado los componentes del servidor, también puedes instalarlos desde esa carpeta con:

```bat
npm ci
```

No cierres la ventana mientras la descarga o preparación continúe trabajando. Si aparece un error, conserva su texto y consulta la sección de problemas.

Al terminar correctamente, inicia o reinicia el programa en un momento adecuado y recarga la cabina con **Ctrl+F5**.

### 6.3 Reconstruir un editor cuyos componentes ya están instalados

Si te indicaron que solo necesitas regenerar el editor después de una actualización:

```bat
npm run build:lists
```

Esta orden prepara los archivos, pero no pone en marcha por sí sola el servidor de cabina.

Los nombres Vite, TypeScript y build pueden aparecer durante el proceso. No necesitas editarlos. Lo importante es que la orden termine sin un error final y que después cargue el editor integrado.

<a id="7-conectar-una-tv-directamente-a-la-computadora"></a>

## 7. Conectar una TV directamente a la computadora

OBS no es obligatorio para mostrar la salida en una pantalla conectada por HDMI.

### 7.1 Conectar y elegir la entrada

1. Conecta la computadora a la TV mediante el cable correspondiente.
2. Enciende la TV.
3. Selecciona en la TV la entrada donde conectaste el cable, por ejemplo HDMI 1.
4. En Windows pulsa **Windows+P**.
5. Elige **Extender** para tener la cabina en la computadora y la salida en la TV.

Si eliges **Duplicar**, ambos aparatos mostrarán el mismo escritorio. Eso puede hacer que la congregación vea la cabina en lugar de la salida dedicada.

### 7.2 Abrir la salida en la TV

1. Mantén la cabina abierta en la pantalla de la computadora.
2. Abre otra ventana del navegador.
3. En esa ventana escribe:

```text
http://localhost:4000/pantalla
```

4. Arrastra la ventana hasta la pantalla extendida de la TV.
5. Pulsa **F11** para usar pantalla completa, si tu navegador utiliza ese atajo.
6. Regresa a la ventana de la cabina para operar.
7. Envía un contenido de prueba y comprueba tanto el minivisor como la TV física.

La página `/control` debe permanecer en la pantalla de operación. La página `/pantalla` es la que se deja en la TV.

### 7.3 Resolución y bordes

Si ves que faltan bordes, revisa el ajuste de imagen de la propia TV. Algunas televisiones amplían la señal de entrada y recortan sus extremos. Busca opciones como ajuste a pantalla, tamaño original o desactivar sobreexploración, según su modelo.

Elige la resolución nativa de la TV en la configuración de pantalla de Windows. No necesitas reducir una TV 4K a 1080p ni cambiar el tamaño de las letras por usar otra resolución. El mismo diseño mantiene sus proporciones.

| Salida 16:9 | Ancho | Alto |
| --- | ---: | ---: |
| HD / 720p | 1280 | 720 |
| Full HD / 1080p | 1920 | 1080 |
| QHD / 1440p | 2560 | 1440 |
| UHD / 4K | 3840 | 2160 |

La salida se adapta automáticamente a la ventana del navegador. Usa pantalla completa en la TV. En pantallas ultrapanorámicas se centra el área 16:9; no se estiran los elementos para ocupar los márgenes. El minivisor conserva esa misma composición.

![Salida real de un himno renderizada a 3840 por 2160 píxeles.](capturas/37-salida-4k.png)

**Figura 2.** Salida 4K del himno 1. El texto y los márgenes conservan la proporción del diseño de 1080p, con renderizado al tamaño real de la TV.

<a id="8-conectar-un-celular-una-tablet-u-otra-computadora"></a>

## 8. Conectar un celular, una tablet u otra computadora

### 8.1 Identificar la dirección de cabina en la red

En la cabina de escritorio aparece un control **Wi-Fi** con la dirección local de la computadora y su puerto.

Un ejemplo de dirección sería:

```text
http://192.168.1.50:4000/control
```

Es solo un ejemplo. Sustituye los números por los que muestra tu computadora. No copies esos números si tu cabina muestra otros.

`localhost` significa «este mismo dispositivo». Escribir `localhost` en el celular hace que busque un servidor en el celular, no en la computadora de cabina.

### 8.2 Abrir el control remoto

1. Mantén abierta la cabina en la PC y conecta el celular a la misma red local.
2. En la PC, abre **Ajustes → Avanzado → Conectar celular por QR** y pulsa **Generar QR**. El código se muestra solo después de pulsar ese botón.
3. Escanea el código con la cámara del celular, abre el enlace y escribe un nombre corto, como «Tablet de cabina».
4. Pulsa **Conectar a esta cabina**. Cada código sirve para un dispositivo y vence a los cinco minutos.
5. En la PC, revisa **Dispositivos enlazados** justo debajo del código. Si hace falta, pulsa **Actualizar dispositivos**. Desde ahí puedes revocar una conexión por su nombre o revocarlas todas. Una sesión dura hasta ocho horas.

![Panel de ajustes con el QR de demostración y la sección Dispositivos enlazados justo debajo.](capturas/56-ajustes-codigo-qr.png)

![Pantalla del celular con el nombre Móvil demo y el botón Conectar a esta cabina.](capturas/57-movil-identificar-dispositivo.png)

La computadora puede estar conectada por Ethernet y el celular por Wi-Fi. Una red de invitados puede bloquear la comunicación aunque use el mismo router. El enlace es directo por la red local; úsalo en una red de confianza. Con datos móviles no funciona.

### 8.3 Qué cambia en la interfaz móvil

- La vista **Salida a TV** aparece flotante para dejar espacio a búsquedas y cuadros de letra.
- Puedes arrastrarla desde su encabezado.
- Puedes minimizarla y volver a expandirla.
- Los controles grandes de **Anterior**, **Siguiente**, secciones y **Fondo** quedan abajo.
- El encabezado de escritorio y el enlace Wi-Fi no se repiten en esa vista.

Si el visor tapa un campo, arrástralo o minimízalo. No necesitas cerrar la cabina para seguir escribiendo.

![Cabina móvil con el visor flotante y controles grandes en la parte inferior.](capturas/26-movil-visor.png)

**Figura 3.** En móvil, el visor flota sobre el contenido. Arrástralo desde su encabezado si tapa el campo que necesitas.

![Cabina móvil con el visor de TV minimizado.](capturas/27-movil-visor-minimizado.png)

**Figura 4.** El control del encabezado permite minimizar el visor y recuperar espacio sin cerrar la cabina.

![Vista de la lista desde el celular con Salida a TV flotante y controles Anterior y Siguiente en el pie.](capturas/58-movil-controles-y-visor.png)

### 8.4 Trabajar entre varios dispositivos

Cada dispositivo conectado puede mantenerse en su propia pestaña o ventana y escribir en sus propios campos de búsqueda de forma asíncrona (con prioridad de persistencia en la PC principal), mientras que la **Salida a TV**, la **Salida a OBS** y todos los campos de la **Lista de oraciones** se sincronizan al 100% en tiempo real entre todos los dispositivos.

Si otra persona envía un canto desde su celular, cambia las mismas TV y banners que controlas desde la PC. Además, al pulsar **Esc** o el botón **Fondo** (en PC o móvil), la proyección vuelve a reposo y se limpian los campos de búsqueda en los dispositivos, con excepción de la Lista de oraciones.

Si dos personas cambian el mismo campo a la vez, puede aparecer un conflicto. Revisa el valor actualizado antes de escribirlo de nuevo; no recargues inmediatamente si aún necesitas copiar un texto no guardado.

La instalación está pensada para una red local de confianza. No necesita publicarse en internet ni abrir el puerto del router para que funcione dentro del templo.

### 8.5 Usar la PC por cable y ampliar la cobertura

La conexión habitual puede ser esta:

```text
Router del templo
  Cable Ethernet -> Computadora con Proyector LLDM
  Wi-Fi          -> Celular o tablet del operador
```

No necesitas activar la zona móvil de la computadora ni conectarla por Wi-Fi. El router comunica los dispositivos de la red local; la PC ejecuta el programa y debe permanecer encendida y sin suspensión.

Si el Wi-Fi no llega al lugar desde el que operas, un punto de acceso conectado por cable al router puede ampliar la cobertura. Debe quedar integrado en la misma red local. Pide que lo configuren en modo punto de acceso; un segundo router con una red separada puede impedir la comunicación.

Para conservar el enlace cuando reinicies los equipos, puedes pedir que se reserve la dirección de la PC en el router. Esta opción suele llamarse **reserva DHCP**. No inventes una dirección fija: usa la que corresponda a esa instalación.

Una red de invitados puede bloquear la comunicación con la PC. Utiliza la red autorizada para los operadores y comprueba el minivisor antes del servicio. Compartir el nombre del Wi-Fi no garantiza por sí solo que los equipos puedan comunicarse.

El control desde fuera del templo queda fuera del uso previsto. No abras puertos del router ni publiques la cabina mediante túneles. La versión actual debe utilizarse en una red local de confianza; no incluye un inicio de sesión para distinguir a cada operador.

Para ampliar esta explicación y conocer las mejoras de conexión propuestas, consulta **CONEXION_LOCAL.md**, en la carpeta `docs` del proyecto.

<a id="9-configurar-obs-studio"></a>

## 9. Configurar OBS Studio

### 9.1 Decidir qué salida necesitas

| Si necesitas | Utiliza |
| --- | --- |
| Capturar el contenido completo de las TV | `/pantalla` |
| Poner un logo y banners sobre las cámaras | `/overlay?obs=1` |

Puedes utilizar ambas en escenas distintas. Poner `/pantalla` encima de una cámara cubrirá la cámara con una página completa; no es el overlay transparente.

### 9.2 Añadir una fuente Navegador

1. Abre OBS Studio.
2. Selecciona la escena donde necesitas la salida.
3. En **Fuentes**, pulsa **+** y elige **Navegador**.
4. Asigna un nombre que identifique su función.
5. Deja desactivado **Archivo local**, porque se utilizará una dirección web local.
6. Introduce la URL correspondiente.
7. Configura el ancho y alto de la fuente Navegador con la resolución del lienzo de OBS: **1920 × 1080** para Full HD, **2560 × 1440** para QHD o **3840 × 2160** para 4K. Configura tanto la fuente de TV como la de banners. No dejes la fuente en 1080p para ampliarla después a un lienzo 4K; modifica sus propiedades de ancho y alto.
8. Acepta los cambios.

![Propiedades de la fuente Navegador de SALIDA TV con los campos URL, Ancho y Alto.](capturas/59-obs-propiedades-pantalla.png)

OBS documenta estas propiedades en su [guía oficial de fuentes Navegador](https://obsproject.com/kb/Browser-Source).

### 9.3 Direcciones según dónde esté OBS

Si OBS está en la misma computadora de cabina:

```text
http://localhost:4000/pantalla
http://localhost:4000/overlay?obs=1
```

Si OBS está en otra computadora de la red, sustituye `localhost` por la IP de la computadora que ejecuta Proyector LLDM. No utilices la IP de la computadora de OBS salvo que esa sea también la que mantiene el servidor.

### 9.4 Colocar correctamente los gráficos transparentes

En la escena de cámaras, sitúa la fuente del overlay **encima** de la fuente de cámara en la lista de Fuentes.

Comprueba que la fuente esté visible y que la escena que estás mostrando sea la correcta. El orden de las fuentes determina qué elemento cubre a otro.

La transparencia se aprecia al ver el gráfico sobre la cámara. Abrir la página sola en un navegador puede mostrar un fondo claro de la propia ventana; eso no demuestra por sí solo que la fuente sea opaca.

Para comprobarlo con una foto, crea una escena aparte en OBS. En **Fuentes**, pulsa **+ → Imagen** y abre una foto de referencia. Añade encima una fuente **Navegador** con `/overlay?obs=1` al final de la dirección de tu cabina. Dale el ancho y el alto del lienzo.

![Escena de prueba en OBS con Overlay clásico encima de Foto de referencia en la lista de fuentes.](capturas/60-obs-foto-y-overlay.png)

### 9.5 Mantener estable la fuente

Recargar o apagar una fuente Navegador vuelve a cargar su página. En el overlay, un banner que ya había sido enviado puede necesitar enviarse otra vez después de esa recarga.

Si OBS tiene una opción para cerrar la fuente cuando no es visible, ten en cuenta que al volver a activarla puede reconectarse desde cero. Para una operación continua, evita recargar o apagar la fuente sin necesidad durante un banner.

### 9.6 Hacer una prueba completa

1. Inicia Proyector LLDM.
2. Abre una escena con cámara y overlay visible.
3. En la cabina busca un canto y pulsa **Banner en OBS**.
4. Comprueba que el banner aparece sobre la cámara.
5. Pulsa **Ocultar Banner**.
6. Comprueba que el banner se retira.
7. Envía una portada a TV y confirma que no cambia por sí sola el gráfico de cámara.

Para repetir el ejemplo, en la cabina elige el estilo **Clásico** en **Ajustes → OBS**, guarda el cambio y pulsa **Banner en OBS** en un canto. El rótulo aparece sobre la foto en la escena de prueba.

![El banner Clásico muestra el número y el título del canto sobre la foto de referencia en OBS.](capturas/61-obs-banner-clasico-en-escena.png)

Para el uso habitual mediante una fuente Navegador no necesitas configurar el enlace adicional de control de OBS del [apartado 23](#23-configuracion-adicional-de-integracion-con-obs).

### 9.7 Crear la escena SALIDA TV en OBS

1. Conecta la TV por HDMI y configura Windows para **Extender** las pantallas.
2. En OBS, crea una escena llamada **SALIDA TV**. En **Fuentes**, agrega una fuente **Navegador** con la URL `http://localhost:4000/pantalla`. Si cambiaste el puerto de la cabina, usa el tuyo.
3. Ajusta el ancho y alto al lienzo de OBS: por ejemplo, **1920 × 1080** para Full HD o **3840 × 2160** para 4K. Ajusta la fuente al lienzo.
4. Haz clic derecho en la escena **SALIDA TV**. Elige **Abrir proyector de escena** o **Proyector de pantalla completa (escena)**, según tu versión de OBS. Selecciona la TV conectada por HDMI en el submenú. OBS puede mostrar el modelo del monitor en lugar de «Pantalla 2».
5. Envía una cita desde la cabina y comprueba que aparece en la TV. Así no necesitas arrastrar ventanas al segundo monitor. Si quieres banners sobre el video de la transmisión, usa una fuente aparte con `/overlay?obs=1`.

![Ventana real de OBS Studio con la escena SALIDA TV seleccionada y su fuente Navegador.](capturas/47-obs-escena-y-fuente.png)

**Escena y fuente.** En la columna izquierda se ven la escena `SALIDA TV` y su fuente Navegador «Proyector LLDM · Pantalla».

![Menú real de OBS Studio con Abrir proyector de escena y dos monitores disponibles.](capturas/48-obs-elegir-pantalla.png)

**Selección de monitor.** Elige la TV por su nombre o resolución. **Nueva ventana** abre un proyector en ventana.

![Captura real de la escena SALIDA TV en OBS mostrando una cita de Proyector LLDM.](capturas/46-obs-escena-salida-tv.png)

**Captura de la salida de escena en OBS Studio.** La fuente Navegador de `SALIDA TV` muestra Juan 14:1 tal como se ve en la TV. La captura se obtuvo de OBS con la escena activa.

### 9.8 Casos de uso

| Si necesitas… | Configura… | Comprueba antes del servicio |
| --- | --- | --- |
| Mostrar cantos o citas en una TV por HDMI | La escena **SALIDA TV**, con una fuente Navegador en `/pantalla`. Abre el proyector de pantalla completa de esa escena en la TV. | Envía una cita y pulsa **Fondo**. Ambos cambios deben verse en la TV. |
| Transmitir la cámara y mostrar el nombre del canto | Una escena de transmisión con la cámara debajo y una fuente Navegador en `/overlay?obs=1` arriba. | Envía un canto. El banner debe aparecer sobre la cámara y desaparecer al vencer su tiempo o al pulsar **Ocultar banner**. |
| Usar la TV y transmitir a la vez | Conserva **SALIDA TV** proyectada por HDMI y selecciona la escena de cámara para la transmisión. | Avanza un cuadro. La TV debe mostrar la letra nueva y la transmisión debe conservar la cámara. |
| Proyectar sin transmitir | Abre `/pantalla` en un navegador, mueve esa ventana a la TV y activa pantalla completa. | Comprueba que el escritorio de control permanezca en el monitor principal. |


<a id="10-conocer-la-cabina-y-sus-controles"></a>

## 10. Conocer la cabina y sus controles

### 10.1 Orden de las secciones

Las secciones principales son:

1. Himnario.
2. Temas y citas.
3. Coro.
4. Lista de oraciones.
5. Presentaciones.
6. Transmisión.

En móvil, Presentaciones puede aparecer como **Diapositivas**.

### 10.2 El minivisor Salida a TV

Muestra la salida real de `/pantalla`. Si allí aparece una estrofa, eso es lo que el sistema está enviando a las TV conectadas a esa salida.

No demuestra que un cable, una entrada HDMI o una escena externa estén bien seleccionados. Si el minivisor funciona pero la TV no, revisa esa conexión física o la configuración de OBS.

El engranaje de este visor abre **Ajustes**.

### 10.3 Preparación de listas y ejemplos de Ajustes

La vista previa dentro del editor de listas es de **preparación**. Cambiar su selector no modifica las TV hasta pulsar **Enviar esta vista a TV**.

Los ejemplos dentro de Ajustes también son de revisión. **Repetir animación**, **Ocultar ejemplo** y **Mostrar ejemplo** no envían banners a la transmisión.

La vista de la pestaña **Transmisión**, en cambio, está vinculada al overlay real. Los botones de esa pestaña sí controlan los gráficos en uso.

### 10.4 Fondo, pausa y reanudación

| Control | Resultado |
| --- | --- |
| Mostrar fondo de reposo / Fondo | La TV vuelve al fondo institucional. |
| Reanudar proyección | Vuelve al contenido que el sistema conserve para reanudar. |
| Pausar, dentro de la lista | Detiene la rotación dejando la vista actual en pantalla. |
| Reanudar, dentro de la lista | Continúa el recorrido de las vistas de la lista. |
| Ocultar Banner | Retira el banner de OBS. |

Pausar una lista no es lo mismo que mostrar el fondo. Tampoco debes confundir **Reanudar proyección**, que recupera contenido conservado, con **Reanudar** la rotación de listas.

### 10.5 Teclado original

| Tecla | Uso |
| --- | --- |
| Espacio o flecha derecha | Siguiente cuadro. |
| Flecha izquierda | Cuadro anterior. |
| Flecha abajo | Siguiente estrofa o sección. |
| Flecha arriba | Estrofa o sección anterior. |
| B | Mostrar fondo o reanudar. |
| O | Ocultar banner de OBS. |
| F1 | Consultar la guía de controles. |
| Escape | Volver al fondo y limpiar campos de la cabina según lo que esté abierto. |
| Ctrl+S | Guardar desde el editor de letras. |

Los atajos de navegación no actúan normalmente mientras escribes en un cuadro o trabajas dentro de un diálogo. Haz clic fuera del campo si quieres volver a navegar con el teclado.

Si tienes el foco dentro del editor integrado de listas, las teclas pueden quedar dentro de ese editor. Para retirar la proyección utiliza **Mostrar fondo** en los controles generales de la lista, o haz clic de nuevo en la cabina antes de utilizar sus atajos.

Escape tiene un comportamiento especial: puede cerrar un diálogo y también mandar la TV al fondo. No lo utilices como una tecla de cancelación sin consecuencias durante una proyección que quieras mantener.

Si las teclas fueron personalizadas, F1 muestra las que estén configuradas en ese momento. En algunos teclados portátiles puede ser necesario pulsar también Fn para utilizar las teclas de función.

<a id="11-usar-el-himnario-y-el-catalogo-del-coro"></a>

## 11. Usar el himnario y el catálogo del coro

### 11.1 Buscar y preparar un himno

1. Abre **Himnario**.
2. Escribe su número o parte de su título.
3. Selecciona el resultado correcto.
4. Comprueba el número y el título antes de enviar.
5. Revisa los cuadros de letra que aparecen debajo.

Seleccionar un canto prepara sus acciones. Para mostrarlo utiliza un botón de envío o un cuadro de proyección.

![Acciones disponibles al seleccionar un himno: portada, letra y OBS.](capturas/02-himnario-acciones.png)

**Figura 5.** Después de seleccionar un himno aparecen los botones para enviar su portada, enviar la letra, mostrar el banner o quitar la selección. La biblioteca está dentro de Opciones avanzadas de Ajustes; también puedes habilitar Editar letra en la interfaz principal. Comprueba el título antes de elegir la acción.

![Detalle del himno 15 seleccionado con las acciones Enviar portada a TV, Enviar letra a TV y Banner en OBS.](capturas/62-himnario-preparar-canto.png)

### 11.2 Mostrar solo la portada

Pulsa **Enviar portada a TV**. Se muestra el número y título del himno, sin entrar directamente a su letra.

### 11.3 Mostrar la letra

Pulsa **Enviar letra a TV**, o pulsa el cuadro concreto que quieras proyectar.

Cada cuadro corresponde a una pantalla de letra. Los indicadores permiten identificar la sección y el cuadro activo. Utiliza **Anterior**, **Siguiente** o las teclas configuradas para avanzar.

Los controles de estrofa o sección saltan por unidades del canto. Los de diapositiva avanzan un cuadro a la vez. Una estrofa larga puede ocupar más de un cuadro.

Enviar la letra no reproduce una grabación musical del canto. Esta función muestra texto y referencias visuales.

![Cuadros de letra con etiquetas de estrofa y coro.](capturas/03-himnario-cuadros.png)

**Figura 6.** Cada cuadro corresponde a una pantalla. Las etiquetas distinguen estrofas y coros; pulsa el cuadro que quieras enviar.

![Salida real de TV mostrando letra grande de un canto.](capturas/04-letra-en-tv.png)

**Figura 7.** Ejemplo de la salida de TV después de enviar letra. La cabina utiliza esta misma salida dentro de su minivisor.

![Minivisor Salida a TV en vivo con la letra del himno y los controles para avanzar.](capturas/63-himno-en-salida-tv.png)

### 11.4 Cómo se distribuye la letra

El programa procura mostrar letra grande y distribuir cada estrofa o coro en la menor cantidad razonable de pantallas, con un límite inicial de seis renglones por cuadro. Puedes escribir cualquier límite entero positivo en **Ajustes → Letras → Letras en las TV**, por separado para Himnario y Coro.

Los saltos internos de las líneas originales pueden redistribuirse para aprovechar el espacio. Las divisiones entre estrofas, coros y otras secciones se conservan.

Una repetición no tiene por qué cambiar de pantalla si cabe completa. Si un bloque es demasiado largo, puede repartirse para mantener la legibilidad y respetar los límites.

### 11.5 Cambiar de canto sin perder la referencia de lo proyectado

Puedes buscar o preparar otro canto mientras revisas el minivisor. El contenido preparado y el que ya está en TV no tienen por qué ser el mismo hasta que envíes el nuevo.

En móvil, si la lista se oculta al seleccionar un canto, utiliza **Mostrar Lista de Himnos / Cambiar Canto**, o el control equivalente del coro, para volver a buscar.

**Quitar selección** limpia la selección de trabajo. Para retirar el contenido de las TV utiliza **Fondo** o Escape.

### 11.6 Utilizar Coro

Abre **Coro** y realiza el mismo proceso de búsqueda y revisión.

Este catálogo es independiente del himnario. Sus botones incluyen **Enviar título a TV**, **Enviar letra a TV**, **Banner en OBS**. La biblioteca está dentro de Opciones avanzadas de Ajustes; el botón Editar letra de la interfaz principal se puede habilitar desde esa pestaña.

No busques únicamente en Himnario un canto que pertenece al catálogo del coro.

![Controles del catálogo del coro con acciones de título, letra y OBS.](capturas/06-coro-acciones.png)

**Figura 8.** El coro tiene su propio catálogo y sus propias acciones. Revisa que estés trabajando en Coro cuando el canto pertenece a esa sección.

![Búsqueda de amigo en el catálogo Coro con las coincidencias debajo del campo.](capturas/64-coro-buscar-canto.png)

### 11.7 Enviar un banner del canto

Al enviar el canto a TV se muestra también su identificación en OBS. **Banner en OBS** permite mostrar esa identificación por separado, sin cambiar las TV.

Si también quieres mostrar la letra, envíala con su botón correspondiente.

<a id="12-administrar-himnos-y-cantos-del-coro"></a>

## 12. Administrar himnos y cantos del coro

### 12.1 Abrir el editor

1. Pulsa el engranaje de **Ajustes**, junto al minivisor.
2. Selecciona la pestaña **Avanzado**, abre **Opciones avanzadas** y despliega ese apartado.
3. Abre **Administrar biblioteca de cantos**.
4. Elige **Himnario** o **Coro** y busca el canto por número o título.
5. Pulsa **Editar canto** en su fila.
6. Comprueba el título del canto en la ventana que se abre.
7. Revisa si estás trabajando en **Secciones** o **Texto Completo**.

El campo **Título del canto** permite cambiar su nombre completo. Al guardar, el nombre se actualiza en el catálogo y en las búsquedas de los dispositivos conectados. La edición está fuera de los controles diarios para evitar cambios accidentales durante el servicio.

Abrir este editor no envía su contenido a TV.

También puedes habilitar un acceso directo desde **Ajustes → Avanzado → Interfaz principal**. Activa **Mostrar «Editar letra» en Himnario y Coro** y pulsa **Guardar ajustes**. El botón aparecerá junto a las acciones del canto seleccionado en ambas pestañas. El cambio se guarda en esta instalación y se comparte con los demás dispositivos conectados. Puedes desactivarlo desde el mismo lugar; inicialmente está apagado.

![Interruptor para mostrar Editar letra en la interfaz principal.](capturas/38-editar-letra-visible.png)

**Figura 9.** El interruptor controla la presencia del botón en Himnario y Coro. Se aplica al guardar; el editor sigue disponible desde la biblioteca de cantos.

### 12.2 Editar por secciones

Utiliza esta vista cuando necesites corregir una estrofa o un coro concreto.

1. Localiza la sección.
2. Corrige su etiqueta o texto cuando corresponda.
3. Conserva las divisiones reales del canto.
4. Utiliza **Agregar Estrofa** o **Agregar Coro** si falta una sección completa.
5. Comprueba que las secciones contengan letra.

No es necesario crear una sección nueva por cada renglón de pantalla. El sistema redistribuye la letra dentro de la sección.

![Editor de letra con secciones, controles de edición y guardado.](capturas/05-editor-de-letra.png)

**Figura 10.** El editor permite corregir las secciones del canto. Revisa también la casilla Actualizar contenido en TV antes de guardar.

### 12.3 Editar en Texto Completo

Esta vista permite trabajar con toda la letra. Las etiquetas de sección, como `[Estrofa 1]` y `[Coro]`, identifican los bloques.

Conserva esas etiquetas y revisa el resultado antes de guardar. Cambiar o eliminar los encabezados puede alterar la separación de las secciones.

### 12.4 Guardar sin modificar la TV actual

1. Revisa el título y la letra.
2. Deja desmarcada **Actualizar contenido en TV** si quieres aplicar la corrección después.
3. Pulsa **Guardar cambios**, o Ctrl+S dentro del editor.
4. Espera la confirmación de guardado.
5. Comprueba los cuadros actualizados en la cabina.

La corrección queda guardada en los archivos de la computadora de cabina. Si la TV conserva una versión anterior, vuelve a enviar el canto cuando corresponda.

### 12.5 Actualizar lo que se está proyectando

Marca **Actualizar contenido en TV** solo cuando quieras que la operación de guardado o restauración pueda afectar al canto activo correspondiente.

Hazlo coordinadamente con la persona que lleva el canto. Aunque la intención sea corregir una palabra, se está actualizando contenido de la proyección.

### 12.6 Restaurar el original

**Restaurar original** reemplaza la letra personalizada de ese canto por su copia de fábrica disponible en la instalación.

Revisa el canto que indica la confirmación. Si necesitas conservar la corrección anterior, haz un respaldo antes de restaurarla.

La copia de fábrica viene con cada versión. En el coro, la proyección sigue el orden del catálogo, omite las secciones de respuestas y termina al llegar a **Final**. Las repeticiones delimitadas con barras salen en un solo cuadro. Si el bloque necesita más espacio, el programa puede usar una letra menor o más renglones solo en ese cuadro.

### 12.7 Encontrar la administración de biblioteca

Dentro de la pestaña **Avanzado**, **Opciones avanzadas** y **Administrar biblioteca de cantos** comienzan cerrados cada vez que abres Ajustes. Debes desplegar ambos para acceder. Esta ubicación reduce las pulsaciones accidentales; no constituye un inicio de sesión ni una contraseña.

El selector de catálogo mantiene separados los himnos y los cantos del coro. Cambiar una letra o agregar un canto en uno no lo agrega automáticamente al otro.

![Biblioteca avanzada con selector de catálogo, búsqueda y acciones de edición.](capturas/30-biblioteca-cantos.png)

**Figura 11.** La biblioteca permite buscar, agregar, editar el título y la letra o iniciar la eliminación de un canto.

### 12.8 Agregar un himno o un canto del coro

1. Entra en la administración de biblioteca y elige el catálogo correcto.
2. Pulsa **Agregar canto**.
3. Si elegiste Himnario, escribe un **Número del himno** entre 1 y 99999 que todavía no esté ocupado. El catálogo del coro no exige un número.
4. Escribe el **Título del canto**, con un máximo de 200 caracteres.
5. Completa la primera estrofa o sección.
6. Agrega las estrofas y coros que falten. También puedes utilizar **Texto Completo** y los encabezados entre corchetes.
7. Revisa el orden y utiliza las flechas de cada sección para corregirlo.
8. Pulsa **Guardar cambios** y espera la confirmación.
9. Busca el canto en su catálogo habitual. Selecciónalo, revisa sus cuadros y envíalo cuando corresponda.

No se permite guardar un canto sin título, sin letra o con un número de himno repetido. Si cancelas antes de guardar, no se agrega al catálogo. Agregar un canto no lo envía automáticamente a las TV.

![Editor preparado para agregar un himno con número, título y secciones.](capturas/34-agregar-himno.png)

**Figura 12.** Al agregar un himno aparecen los campos de número y título. La letra se organiza en secciones; para un canto del coro se conserva el título y la letra sin exigir número.

### 12.9 Eliminar un canto: tres confirmaciones

Eliminar un canto lo quita del catálogo compartido de esta instalación. No utilices esta acción para retirar una imagen de las TV: para eso utiliza **Fondo** o Escape.

1. En la biblioteca avanzada, comprueba el catálogo y localiza el canto exacto.
2. Pulsa **Eliminar** en su fila.
3. En **Confirmación 1 de 3**, revisa el título y confirma que quieres continuar.
4. En **Confirmación 2 de 3**, lee el alcance de la eliminación y confirma otra vez.
5. En **Confirmación 3 de 3**, escribe el título exacto, incluidas mayúsculas, espacios y acentos. Después pulsa **Eliminar definitivamente**.
6. Espera la confirmación y comprueba que el canto ya no aparece en la búsqueda.

![Primera confirmación de eliminación mostrando el canto elegido.](capturas/31-eliminar-canto-1.png)

**Figura 13.** La primera confirmación identifica el canto y el catálogo. Cancelar cierra la operación sin eliminarlo.

![Segunda confirmación que explica el efecto sobre el catálogo compartido.](capturas/32-eliminar-canto-2.png)

**Figura 14.** La segunda confirmación recuerda que el cambio afecta a los dispositivos de esta instalación.

![Tercera confirmación con el campo para escribir el título exacto.](capturas/33-eliminar-canto-3.png)

**Figura 15.** La última confirmación exige escribir el título exacto. El servidor rechaza la eliminación si faltan pasos, el título no coincide o el canto cambió durante la confirmación.

Si tardas más de dos minutos o alguien modifica el canto mientras confirmas, cancela y vuelve a empezar. **Cancelar** permite abandonar cualquiera de los tres pasos. Escape también cancela la ventana y, como en el resto de la cabina, muestra el fondo de reposo en las TV.

Si el canto ya estaba en las TV, se conserva su imagen actual hasta que envíes otro contenido o muestres el fondo. Eliminarlo no debe cortar inesperadamente la proyección.

### 12.10 Copias de respaldo del catálogo

Al guardar un cambio, agregar un canto o eliminarlo, el servidor conserva una copia anterior del catálogo en `data/backups`. Mantiene hasta diez copias por catálogo; operaciones posteriores pueden reemplazar las más antiguas.

No hay un botón para deshacer una eliminación. Si fue un error, evita seguir modificando la biblioteca y pide apoyo para recuperar la copia adecuada. **Restaurar original** sirve para un canto que todavía existe y tiene copia de fábrica; no recupera por sí solo un canto eliminado de la biblioteca. Conserva además el respaldo completo explicado en el capítulo 19.

### 12.11 Importar o exportar catálogos

1. En **Ajustes → Avanzado → Opciones avanzadas**, abre **Importar o exportar catálogos**.
2. Selecciona **Coro** o **Himnario**. Para guardar una copia editable o compartir el catálogo elegido, pulsa **Descargar JSON**.
3. Para importar, elige un JSON de hasta 8 MiB y selecciona **Añadir cantos** o **Reemplazar catálogo de trabajo**.
4. Pulsa **Importar cantos**. Se valida todo el archivo y se guarda una copia del catálogo anterior antes de escribir el nuevo. Los identificadores repetidos se rechazan. En el Himnario también se revisan los números repetidos.

![Importación de un catálogo JSON desde Ajustes.](capturas/41-importar-coro.png)


<a id="13-proyectar-temas-citas-y-referencias-especiales"></a>

## 13. Proyectar temas, citas y referencias especiales

### 13.1 Preparar un tema

1. Abre **Temas y citas**.
2. Escribe el título del tema.
3. Revisa la ortografía.
4. Pulsa **Enviar tema a TV**.
5. Comprueba el resultado en el minivisor.

El tema utiliza los datos de iglesia configurados y una fecha. Si cambias esos datos después, vuelve a enviar el tema para generar su vista actualizada.

Para mostrarlo en transmisión utiliza **Banner en OBS** en la sección del tema.

![Tema y cita bíblica en la misma pestaña, con un ejemplo Juan 3:16.](capturas/07-temas-y-citas.png)

**Figura 17.** Tema y cita tienen controles independientes dentro de la misma pestaña. En el ejemplo está preparada la referencia Juan 3:16.

### 13.2 Preparar una cita bíblica

1. En la misma pestaña localiza los campos **Libro**, **Capítulo** y **Versículo**.
2. Escribe el nombre del libro y selecciona la sugerencia correcta.
3. Escribe el capítulo.
4. Escribe el versículo o rango. Para proyectar el capítulo completo en modo texto, deja vacío el campo de versículo.
5. En **Versión**, elige la traducción. La selección inicial es **Reina Valera 1960**.
6. En **Modo en TV**, elige **Solo Cita** para mostrar la referencia o **Cita + Texto** para mostrar también el pasaje.
7. Pulsa **Enviar cita a TV** o **Enviar cita y texto a TV**, según el modo elegido, y comprueba el resultado en el minivisor.

Ejemplo de referencia: libro Juan, capítulo 3 y versículo 16. Para un rango puedes escribir un formato como `4-7` en el campo de versículo.

Para practicar con varias diapositivas, usa **Juan 14:1–2**. Escribe `Juan` en Libro, `14` en Capítulo y `1-2` en Versículo. Selecciona **Cita + Texto**. Debajo de los campos aparecen las tarjetas del pasaje. Pulsa una tarjeta para saltar a ella o usa las teclas de avance y retroceso que tengas configuradas.

![Selector de traducción y modo, campos de cita y tarjetas del pasaje.](capturas/44-cita-con-texto-cabina.png)

En TV, la referencia aparece centrada sobre el texto. Los números de versículo se resaltan y la insignia identifica las traducciones distintas de Reina Valera 1960. **Cita + Texto** sigue los tamaños de letra y el límite de renglones del Himnario en **Ajustes → Letras**. Si hace falta espacio, el pasaje se reparte entre varias diapositivas.

![Salida a TV con la referencia centrada y el número de versículo resaltado.](capturas/45-cita-con-texto-tv.png)

El mismo pasaje se ve de dos maneras en **Salida a TV**. **Solo Cita** muestra la referencia y **Cita + Texto** añade el versículo.

![Solo Cita muestra Salmos 23:1 sin el texto del versículo.](capturas/66-cita-sin-texto.png)

![Cita más Texto muestra Salmos 23:1 junto al texto del versículo.](capturas/67-cita-con-texto.png)

Tras instalar el programa y sus dependencias, las traducciones incluidas funcionan sin internet. Si una cita se rechaza, revisa el libro, el capítulo y el rango de versículos para la traducción seleccionada.

### 13.3 Introducir la cita con Enter

El recorrido de teclado permite pasar del libro al capítulo, del capítulo al versículo y, desde el versículo, enviar la referencia.

Comprueba primero el libro seleccionado. En el último campo, Enter puede enviar a TV: no lo uses solo para abandonar el cuadro si todavía no quieres proyectar.

### 13.4 Mantener preparado el tema mientras se muestran citas

El tema y las citas están en la misma pestaña para facilitar una operación como la escuela dominical.

Enviar una cita reemplaza el contenido de TV por esa referencia. El campo del tema puede conservar su preparación para volver a enviarlo después; no significa que el tema y la cita se mezclen automáticamente en una sola pantalla.

### 13.5 Carta Apostólica y Presentación Apostólica

En el campo de búsqueda de referencia puedes elegir **Carta Apostólica** o **Presentación Apostólica**.

Los otros campos cambian su función: el de capítulo pasa a utilizarse para la fecha y el de versículo para la ubicación opcional.

1. Selecciona el tipo correcto.
2. Escribe la fecha si corresponde.
3. Escribe la ubicación si corresponde.
4. Utiliza el botón de TV o el de OBS según la salida deseada.

Esta función genera una identificación o referencia. No importa ni transcribe automáticamente el documento completo de una carta.

![Campos de Carta Apostólica con fecha y ubicación en lugar de capítulo y versículo.](capturas/08-referencia-carta.png)

**Figura 18.** Al elegir Carta Apostólica, los campos se utilizan para fecha y ubicación. El botón de TV y el de OBS siguen siendo destinos diferentes.

### 13.6 Historiales y limpieza

Los historiales permiten recuperar temas y referencias utilizados. Revisa los campos recuperados y el destino antes de volver a enviar.

**Limpiar** vacía el campo o sección correspondiente. **Limpiar Todo**, dentro de un historial, elimina ese historial. **Escape** tiene además el efecto de volver la TV al fondo.

<a id="14-preparar-la-lista-de-oraciones-flores-y-ventas"></a>

## 14. Preparar la lista de oraciones, flores y ventas

### 14.1 Entrar al editor integrado

Abre **Lista de oraciones**. Arriba están los controles de proyección y duración; debajo aparece el editor de la semana y su vista previa.

El editor tiene cuatro secciones: **Oraciones**, **Aviso**, **Flores** y **Ventas**.

![Editor de oraciones con encargada de 9:00 AM y tarjetas por día.](capturas/12-oraciones-editor.png)

**Figura 19.** Parte del formulario de oraciones: arriba está la encargada de 9:00 AM y debajo las tarjetas de los días. Desplázate para revisar el resto de la semana.

### 14.2 Elegir la semana

En **Domingo de cierre**, selecciona el domingo con el que termina la lista. El rango empieza el domingo anterior. Por ejemplo, para preparar la lista del 1 al 8 de noviembre de 2026, selecciona el domingo 8.

Cambiar la fecha puede recuperar una semana guardada si ya existe para esa fecha. Si no existe, el programa puede recalcular fechas y conservar parte de la preparación actual. No utilices el cambio de fecha como sustituto de **Nueva semana** cuando necesitas una lista vacía.

Después de cambiar de semana revisa siempre nombres, fechas y turnos antes de proyectar.

### 14.3 Llenar las oraciones

1. Selecciona **Oraciones**.
2. Revisa la **Encargada de Oración de 9:00 AM**. Puedes dejarla vacía si no corresponde.
3. Localiza cada tarjeta de día.
4. Escribe los responsables en el horario correspondiente.
5. En los días con doble información de tarde, distingue **Servicio** y **P. Doct.**.
6. Revisa la consagración.
7. Comprueba el domingo inicial y el domingo final: son tarjetas diferentes.

No rellenes un campo con un nombre provisional solo para que no quede vacío. Los campos que dejes vacíos permanecen vacíos en la salida que corresponda.

Los cambios de los formularios se guardan en el documento de trabajo compartido. Si aparece un error de sincronización, compruébalo antes de dar el cambio por guardado.

### 14.4 Editar flores y preparar un aviso

En **Flores**, pulsa **Programar entrega de flores**. Escribe los responsables y usa **Cambiar fecha** para elegir un día especial. En **Información adicional** puedes pulsar **Agregar detalle** para indicar la ocasión o el horario. Desmarca **Incluir en la lista** si quieres conservar la entrega fuera de la proyección y de las imágenes. Las fechas que edites permanecen fijas cuando cambias de semana; las fechas automáticas se ajustan.

![Editor de flores con fecha editable y campo de ocasión.](capturas/14-flores-editor.png)

**Figura 20.** Una fecha de flores puede caer en cualquier día del calendario y tener campos propios.

En **Aviso**, escribe el texto que quieres mostrar en TV. Usa Enter para separar líneas y párrafos, y escribe `*Horario especial*` para resaltar esas palabras. Ajusta la alineación, posición y tamaño. Selecciona **Aviso** en la vista previa para revisarlo o enviarlo a TV.

![Aviso independiente con texto resaltado, saltos de línea y opciones de disposición.](capturas/40-aviso-personalizado.png)

**Figura 21.** El aviso se proyecta en una diapositiva con la misma cabecera institucional que las listas. Puedes activarlo o excluirlo en **Incluir en TV**.

### 14.5 Configurar los grupos base de ventas

1. Selecciona **Ventas**.
2. Abre **Configurar grupos base**.
3. Cada turno corresponde a una posición dentro del ciclo de ventas.
4. Escribe en renglones separados los grupos que sirven juntos en ese turno.
5. Usa **Añadir turno** si necesitas más posiciones.
6. Usa **Eliminar** junto al turno que quieres quitar.
7. Pulsa **Guardar grupos base**.

Puedes tener entre 1 y 24 turnos. Cada turno debe contener al menos un grupo.

Guardar los grupos base actualiza los grupos de las fechas existentes según el ciclo. Si ya escribiste excepciones manuales en esos domingos, revísalas después de guardar porque pueden recalcularse.

![Configuración de turnos de grupos base para las ventas.](capturas/15-grupos-de-venta.png)

**Figura 22.** Abre Configurar grupos base para editar los turnos. Los grupos que sirven juntos se escriben en renglones separados dentro del mismo turno.

### 14.6 Editar fechas y turnos de venta

En **Turno de la primera venta**, elige cómo comienza el ciclo. Los grupos de las fechas existentes se asignan a partir de ese turno. Pulsa **Programar venta** para incorporar otra entrada. Usa **Cambiar fecha** para editar el día y **Información adicional → Agregar detalle** para registrar el horario o el lugar. Desmarca **Incluir en la lista** si quieres ocultar esa venta y conservar sus datos.

![Fecha editable, grupos responsables y campo de horario en Ventas.](capturas/16-domingos-ventas.png)

**Figura 23.** Cada venta puede tener fecha propia y campos adicionales.

La TV reparte las fechas de flores y ventas en páginas cuando hay varias entradas. En **Incluir en TV**, desmarca las páginas que quieras excluir del selector y de la rotación. Las imágenes descargables reúnen las entradas incluidas en la lista y se distribuyen según el espacio disponible.

### 14.7 Elegir las vistas que participan

Abre **Incluir en TV** y marca las vistas que deben estar disponibles:

- Oraciones 5:00 AM.
- Oraciones 9:00 AM.
- Oraciones de la tarde.
- Flores.
- Venta de comida.

El aviso aparece como una vista independiente si tiene texto y está habilitado en **Incluir en TV**.

Si no hay ninguna vista disponible, el sistema no puede iniciar la lista. Activa al menos una y revisa su contenido.

![Casillas para incluir horarios de oración, flores y ventas en TV.](capturas/17-incluir-en-tv.png)

**Figura 24.** Puedes activar o desactivar Flores y Ventas completas, o marcar sus páginas individualmente.

### 14.8 Preparar una vista y dejarla fija en las TV

1. Dentro de **Vista previa**, selecciona **Para TV**.
2. Abre **Vista a preparar**.
3. Elige el horario o lista que necesitas.
4. Revisa la imagen de preparación.
5. Pulsa **Enviar esta vista a TV**.

Esa vista se queda fija. El selector de preparación, por sí solo, no cambia la salida.

La duración de rotación no hace avanzar una vista enviada de esta forma. Para empezar a rotar utiliza el control general de la lista.

![Vista previa de una lista y botón Enviar esta vista a TV.](capturas/13-vista-fija.png)

**Figura 25.** Elige la vista en el selector, revísala y pulsa Enviar esta vista a TV para mantenerla fija. Cambiar el selector no la envía.

![Vista fija de las 9:00 a. m. con la vista previa a la izquierda y el resultado a la derecha.](capturas/68-lista-vista-fija-0900.png)

![Vista fija de las 5:00 a. m. tras volver a pulsar Enviar esta vista a TV. Los nombres de los ejemplos son ficticios.](capturas/69-lista-vista-fija-0500.png)

### 14.9 Iniciar la versión rotativa

1. Revisa las vistas incluidas y sus datos.
2. En los controles generales de la lista, pulsa **Enviar a TV**.
3. Observa el minivisor.
4. Las vistas incluidas irán cambiando siguiendo el reloj de la computadora de cabina.

Los dispositivos no mantienen recorridos independientes: el servidor determina la vista para todos.

![Controles generales de listas con duración, envío y pausa de la rotación.](capturas/09-lista-rotacion.png)

**Figura 26.** Estos son los controles de la versión rotativa. La duración se expresa en segundos y el botón Pausar mantiene la vista actual.

### 14.10 Cambiar la duración

1. Localiza **Duración por vista (seg)**.
2. Selecciona el número actual y escribe un número entero entre 1 y 600.
3. Sal del campo, por ejemplo haciendo clic fuera o pulsando Tab.
4. Espera la confirmación de guardado.
5. Comprueba el valor desde otro dispositivo si también está conectado.

La unidad es segundos. El valor inicial es 15 segundos. Cambiarlo conserva la vista actual y reinicia la cuenta con el nuevo tiempo.

Si la lista está pausada, cambiar el tiempo no la reanuda. Si solo hay una vista habilitada, no habrá otra vista a la cual avanzar aunque el tiempo esté configurado.

Si aparece **Reinicia el servidor para activar el tiempo configurable**, consulta [La duración no se guarda](#207-la-duracion-no-se-guarda-o-aparece-campo-de-lista-no-valido).

### 14.11 Pausar, avanzar y terminar

- **Pausar** detiene el avance automático y conserva la vista visible.
- **Reanudar** vuelve a poner la lista en rotación.
- **Anterior** y **Siguiente** permiten cambiar manualmente de vista cuando están disponibles.
- **Mostrar fondo** retira la lista de las TV y muestra el fondo institucional.

Las vistas fijas y las rotativas utilizan un fundido breve al cambiar. No se necesita enviar una pantalla negra entre ellas.

![Controles de una lista pausada con el botón Reanudar.](capturas/10-lista-pausada.png)

**Figura 27.** Al pausar, el botón cambia a Reanudar. La vista permanece en la TV mientras la rotación está detenida.

### 14.12 Guardar esta semana

**Guardar esta semana** conserva una copia de la semana actual en **Semanas guardadas**.

Esto se diferencia del guardado automático de los campos de trabajo: puedes conservar el borrador actual sin que eso signifique que ya existe una copia de esa fecha dentro del historial de semanas.

1. Revisa la fecha y el contenido.
2. Pulsa **Guardar esta semana**.
3. Abre **Semanas guardadas**.
4. Comprueba que aparece la fecha correspondiente.

Si vuelves a guardar sobre la misma fecha, actualizas la copia correspondiente a esa fecha; no se crea un historial ilimitado de versiones de la misma semana.

![Selector de semana con los botones Guardar esta semana y Nueva semana.](capturas/11-semana-guardar.png)

**Figura 28.** Revisa la fecha y pulsa Guardar esta semana para conservar su copia. Nueva semana es una acción diferente.

### 14.13 Cargar, eliminar y crear una semana

Para recuperar una semana, abre **Semanas guardadas** y pulsa su fecha. Eso la carga en la preparación actual: revisa los datos antes de utilizarlos.

**Eliminar**, junto a una fecha guardada, elimina esa copia del historial después de la confirmación. No debe confundirse con quitar temporalmente una vista de la rotación.

**Nueva semana** prepara una semana vacía. Guarda antes la semana que quieras conservar. Su fecha de partida se calcula con la semana actual del equipo; si vas a trabajar otra fecha, revísala después de crearla.

![Historial de semanas guardadas con controles de carga y eliminación.](capturas/19-semanas-guardadas.png)

**Figura 29.** Las fechas guardadas se consultan en este historial. Pulsar una fecha carga su preparación; Eliminar retira esa copia después de confirmar.

<a id="15-descargar-listas-completas"></a>

## 15. Descargar listas completas

### 15.1 Revisar la imagen antes de descargar

1. Completa los datos de la semana.
2. En **Vista previa**, pulsa **Descargar listas completas**.
3. En el selector **Imagen**, elige la lista que quieres revisar.
4. Comprueba nombres, fechas y colonia.
5. Revisa si hay registros que debían estar habilitados o excluidos.

La imagen se genera con los datos guardados de trabajo. No se completan nombres inexistentes para llenar espacios.

![Previsualización de una lista completa con sus botones de descarga.](capturas/18-listas-descargables.png)

**Figura 30.** En Descargar listas completas puedes revisar el archivo generado y descargar una imagen o el conjunto en ZIP.

### 15.2 Descargar una sola imagen

Selecciona la imagen y pulsa **Descargar imagen**. El navegador descargará un archivo PNG.

La carpeta de destino depende de tu navegador. Normalmente se guarda en **Descargas**, aunque también puede preguntarte dónde hacerlo.

### 15.3 Descargar todas las imágenes

Pulsa **Descargar todas (ZIP)**. El ZIP reúne los archivos PNG generados.

Para revisarlos o enviarlos desde la computadora, extrae el ZIP como cualquier carpeta comprimida. No es necesario enviar el ZIP completo a los destinatarios si solo necesitan ver las imágenes.

### 15.4 Tamaño y diseño

Los archivos tienen hasta 3840 píxeles en su lado más largo. Eso no significa que todos midan 3840 por 2160 ni que deban ser 16:9.

La altura se adapta a los nombres y filas. Si el contenido necesita dividirse, pueden generarse varias imágenes.

La cabecera incluye nombre de iglesia, colonia y rango de fechas; el pie utiliza el logo del centenario. La fuente y las medidas de la imagen se calculan para el archivo final, no mediante una captura de la pantalla del editor.

### 15.5 Compartir los archivos descargados

Puedes compartir el PNG desde la carpeta de descargas del celular, o transferirlo desde la computadora.

Comparte el PNG original como archivo si el medio de envío reduce la calidad de las imágenes.

<a id="16-importar-y-proyectar-presentaciones"></a>

## 16. Importar y proyectar presentaciones

### 16.1 Qué formatos se admiten

| Formato | Cómo lo utiliza el programa |
| --- | --- |
| PPT y PPTX | PowerPoint de escritorio (en Windows) o LibreOffice junto con Python 3 y PyMuPDF (en macOS y Linux) exportan las diapositivas como imágenes. |
| PDF | Python (o Python 3 en macOS/Linux) y PyMuPDF convierten las páginas en imágenes. |
| PNG, JPG, JPEG y WebP | Se incorporan como diapositivas de imagen. |

La importación no reproduce animaciones, transiciones de PowerPoint, videos, narraciones ni audio incluidos en el archivo original.

El servidor tiene un límite de 300 MB por archivo y recibe hasta 100 archivos por envío. No es una recomendación de tamaño: archivos grandes o documentos extensos pueden tardar o agotar el tiempo de conversión.

### 16.2 Preparar PowerPoint o LibreOffice

En Windows, Microsoft PowerPoint de escritorio debe estar instalado en la computadora que ejecuta el servidor, aunque subas el archivo desde un celular u otra PC. En macOS y Linux, el servidor utiliza LibreOffice (`soffice` o `libreoffice`) junto con Python 3 y PyMuPDF para convertir archivos `.ppt` y `.pptx`.

Abre PowerPoint directamente al menos una vez, completa su activación o configuración y comprueba que puede abrir el archivo. La versión web de PowerPoint no sustituye la aplicación de escritorio que utiliza este conversor.

Para conservar una composición cercana a la salida del templo, prepara las diapositivas en formato 16:9.

### 16.3 Preparar la importación de PDF

Este apartado es opcional si no vas a importar PDF. Puedes pedir apoyo para realizarlo una sola vez.

1. Instala Python desde su [sitio oficial](https://www.python.org/downloads/).
2. Abre una ventana nueva de Símbolo del sistema.
3. Comprueba que `python --version` devuelve una versión de Python.
4. Instala el componente de conversión:

```bat
python -m pip install --upgrade pymupdf
```

5. Comprueba que se puede cargar:

```bat
python -c "import fitz; print('PDF disponible')"
```

6. Reinicia Proyector LLDM cuando corresponda y prueba un PDF pequeño.

El programa busca `python` (en Windows) o `python3` (en macOS y Linux), salvo que el responsable técnico haya configurado otra ruta mediante `PYTHON_PATH`. Tener únicamente una orden `py` funcional no garantiza que el conversor encuentre `python`.

Consulta la [documentación oficial de Python en Windows](https://docs.python.org/3/using/windows.html) y la [instalación de PyMuPDF](https://pymupdf.readthedocs.io/en/latest/installation.html) si el instalador o las órdenes difieren en tu equipo.

### 16.4 Subir un archivo

1. Abre **Presentaciones**.
2. Pulsa **+ Subir**, o utiliza el área para arrastrar el archivo.
3. Selecciona el documento.
4. Espera a que termine la importación.
5. Comprueba el título y el número de diapositivas guardadas.
6. Selecciona la presentación para revisar sus miniaturas.

Al subir PowerPoint o PDF, trabaja con un documento por importación. Si seleccionas imágenes, pueden formar una presentación de varias diapositivas; revisa el orden de las miniaturas antes de proyectarla.

No cierres el programa durante la conversión. El conversor tiene un tiempo máximo de trabajo, por lo que un documento complejo puede fallar aunque su tamaño esté por debajo del límite de archivo.

![Área de Presentaciones con botón Subir, zona para arrastrar archivos y filtro.](capturas/20-presentaciones.png)

**Figura 31.** Importa desde Subir o desde el área para arrastrar. Esta captura muestra la sección sin presentaciones cargadas; no es un error.

Las nuevas importaciones de PDF y PowerPoint conservan la proporción de cada página o diapositiva y se generan con hasta 3840 píxeles en su lado más largo. Un documento vertical o 4:3 se muestra completo, con márgenes cuando corresponde. Las imágenes importadas conservan su resolución original. Si una presentación antigua fue convertida a 1080p y necesitas más detalle, importa de nuevo el archivo original; ampliar una imagen existente no recupera detalle. La conversión 4K puede tardar más y ocupar más espacio.

### 16.5 Enviar a TV

Pulsa **Enviar primera a TV** para comenzar desde el principio, o pulsa la miniatura de la diapositiva concreta que necesitas.

Después utiliza **Anterior** y **Siguiente**. Revisa el minivisor para confirmar que estás en la diapositiva correcta.

Seleccionar la presentación para revisar sus miniaturas no es lo mismo que enviarla.

### 16.6 Presentaciones guardadas y eliminación

Las presentaciones importadas quedan registradas en la instalación. Puedes filtrarlas por su nombre.

Eliminar una presentación retira su registro y sus archivos importados de esa instalación. Conserva el documento original o un respaldo si lo vas a necesitar de nuevo.

<a id="17-usar-los-graficos-de-transmision"></a>

## 17. Usar los gráficos de transmisión

Al enviar contenido a TV, su identificación se muestra automáticamente en OBS. Los botones exclusivos de OBS permiten enviarla de nuevo sin cambiar las pantallas. Avanzar entre cuadros o estrofas del mismo canto no repite el banner; los botones **Enviar título a TV** y **Enviar letra a TV** sí permiten volver a mostrarlo. Se utiliza la duración guardada en **Ajustes → OBS**.

### 17.1 Revisar la salida correcta

Abre **Transmisión** para revisar la salida de gráficos vinculada al overlay.

En OBS debe estar cargada y visible la fuente con `/overlay?obs=1`, situada sobre la cámara.

![Vista del overlay y controles para banners, coro y ubicación en OBS.](capturas/21-transmision.png)

**Figura 32.** La pestaña Transmisión controla los gráficos reales de OBS. Comprueba el ejemplo de salida y utiliza Ocultar Banner cuando corresponda.

### 17.2 Mostrar el canto del coro

1. En el campo de transmisión escribe el título si quieres identificar un canto concreto.
2. Pulsa **Canto Coro (OBS)**.
3. Comprueba el banner sobre la cámara.

También puedes usar el botón **Banner en OBS** desde un canto seleccionado en el catálogo del coro.

### 17.3 Mostrar un aviso

1. Escribe el texto en el campo de transmisión.
2. Pulsa **Generar Banner (OBS)**.
3. Revisa el resultado.

Utiliza textos que puedan leerse como identificación o aviso. Un texto muy largo puede necesitar más líneas o ajuste de tamaño.

### 17.4 Mostrar el cuadro de ubicación

1. Escribe la ubicación que quieres mostrar, si corresponde.
2. Pulsa **Cuadro Dron (OBS)**.
3. Revisa la ubicación y los datos de iglesia.

El nombre del control identifica un gráfico de ubicación; no conecta ni pilota un dron.

### 17.4.1 Mostrar el banner inferior de ministro y ubicación

1. En la pestaña **Transmisión**, ubica el apartado **Ministro y Ubicación (Banner Inferior OBS)**.
2. Escribe el rango y nombre del ministro (por ejemplo, `P.E. ELIAS DÍAZ`, `D.E. ...` o `E.E. ...`). Este campo se guarda automáticamente de forma persistente en la cabina para que no tengas que volver a escribirlo en cada culto ni se borre al pulsar **Esc** o **Fondo**.
3. Pulsa **Ministro (OBS)** (o presiona **Enter** dentro del campo).
4. En la parte inferior centrada de `/overlay` aparecerá el banner con el rango y nombre del ministro en la línea principal y la ubicación de **Ajustes → Iglesia (Ciudad y ubicación)** en la línea inferior, respetando el estilo elegido (**Clásico** o **Paneles angulares**).

### 17.5 Ocultar o reemplazar un banner

**Ocultar Banner** retira el gráfico activo. La tecla original para esa acción es O, salvo que se haya personalizado.

Al enviar otro gráfico mientras hay uno visible, el sistema puede completar la salida anterior antes de mostrar el nuevo. No pulses repetidamente el botón solo porque la transición no termina de inmediato.

La duración se configura en **Ajustes → OBS**. Los valores iniciales son **30 segundos** para banners y **75 segundos** para el cuadro de ubicación. Cada campo admite de **0 a 3600 segundos**: **0** mantiene el gráfico hasta que lo ocultes. Pulsa **Guardar ajustes** para aplicar los tiempos a los siguientes envíos. El gráfico que ya esté visible conserva su tiempo anterior. La duración de las listas se configura por separado.

Ocultar el banner no implica ocultar el logo persistente de cámara. La visibilidad del logo se cambia desde Ajustes.

<a id="18-personalizar-los-ajustes"></a>

## 18. Personalizar los ajustes

### 18.1 Abrir y guardar

1. Localiza el visor **Salida a TV**.
2. Pulsa el botón de engranaje.
3. Elige la pestaña de lo que quieres cambiar: Iglesia, Letras, Fondo de TV, OBS, Teclado o Avanzado.
4. Realiza los cambios en esa pestaña. Puedes pasar a otra sin perder el borrador.
5. Pulsa **Guardar ajustes** para aplicarlos.

Cambiar un ejemplo dentro del diálogo permite revisarlo antes de guardar. Cerrar sin guardar descarta los cambios de ese borrador de Ajustes.

Los créditos a Huri Tolentino aparecen al principio de esta ventana.

| Pestaña | Qué contiene |
| --- | --- |
| Iglesia | Colonia, ciudad y datos de ubicación. |
| Letras | Diseños independientes para Himnario y Coro, fuentes, tamaños, renglones, colores, fondos y vista previa. |
| Fondo de TV | El fondo institucional que aparece en reposo. |
| OBS | Estilo, colores y posición de banners y logo; ejemplos de animación. |
| Teclado | Asignación de controles. |
| Avanzado | Administración de la biblioteca de cantos, dentro de sus apartados desplegables. |

![Ajustes divididos en pestañas y botones de guardar y restablecer fuera de la zona de desplazamiento.](capturas/36-ajustes-pestanas.png)

**Figura 33.** Las pestañas permiten ir directamente a cada grupo de opciones. Guardar ajustes y Restablecer ajustes permanecen en el pie del diálogo.

En la pestaña Letras, los controles se agrupan por distribución y tamaño, fuente, colores y fondo. En escritorio, la vista previa queda a su lado; en tablet o móvil, aparece debajo.

Solo se desplaza el contenido de la pestaña. Los botones del pie permanecen visibles en PC, tablet y móvil. En pantallas estrechas, las seis pestañas se distribuyen en dos filas. Puedes moverte entre pestañas con las flechas izquierda y derecha cuando el botón de una pestaña tiene el foco; Inicio y Fin saltan a la primera y última.

La cabina recuerda en este navegador la última pestaña que utilizaste. Esto no cambia los ajustes compartidos ni la proyección. Todas las pestañas forman un mismo borrador: Guardar ajustes aplica sus cambios y cerrar sin guardar los descarta.


### 18.2 Datos de la iglesia

El nombre se mantiene como **La Luz del Mundo**. Puedes cambiar:

- Colonia o dirección.
- Ciudad y ubicación.

Estos datos se utilizan donde corresponde en temas, gráficos de ubicación e imágenes de listas. No necesitas editar un archivo a mano para cambiarlos.

![Datos de iglesia editables en Ajustes.](capturas/22-ajustes-iglesia.png)

**Figura 34.** El nombre La Luz del Mundo permanece fijo. La colonia y la ciudad se pueden adaptar a la instalación.

### 18.3 Fondo de las TV

Las opciones actuales son:

- **Institucional · logo sobre blanco**.
- **Centenario · líneas doradas**.

La vista previa permite revisar el fondo antes de guardar. La opción afecta al reposo de TV; no significa que cambie automáticamente el diseño de una diapositiva de letras.

![Selector y vista previa del fondo de reposo de las TV.](capturas/23-ajustes-fondo.png)

**Figura 35.** El selector permite revisar el fondo institucional o el del centenario antes de guardar los ajustes.


**Duración de citas y temas en TV.** Abre **Ajustes → Fondo de TV → Duración en TV**. Cada tipo tiene su propio tiempo, con 120 segundos por defecto. Escribe 30, 45 u otro número de segundos y guarda. La duración se aplica al próximo envío. Si la cita tiene varias páginas, pasar de página no reinicia la cuenta. Puedes mostrar el fondo antes pulsando **Fondo** o **Esc**. Usa 0 si prefieres ocultar el contenido siempre a mano. Los tiempos de los banners de OBS se configuran por separado.

### 18.4 Diseño y colores de los banners

Puedes elegir **Clásico** o **Paneles angulares**.

Para los paneles angulares hay paletas **Azul noche y oro**, **Marfil y oro** y **Borgoña y oro**. El clásico conserva su diseño propio; su selector de tono puede quedar deshabilitado.

También puedes elegir la esquina donde aparece el banner.

Los paneles angulares se abren desde el centro y se cierran hacia el centro. Sus líneas diagonales y efectos quedan dentro del contorno.

![Ajustes de estilo, logo y duración de los gráficos de OBS.](capturas/24-ajustes-obs.png)

**Figura 36.** Estas opciones cambian el diseño, la duración del banner y la ubicación del logo. Los botones del ejemplo permiten revisar la animación sin enviarla a la transmisión.

**Configurar cuánto permanece un gráfico:**

1. En **Ajustes**, abre la pestaña **OBS**.
2. En **Duración de banners (segundos)**, escribe el tiempo para himnos, coro, temas, citas y referencias especiales.
3. En **Duración de ubicación (segundos)**, escribe el tiempo del cuadro de ubicación.
4. Usa un número entero entre **1 y 3600** para retirarlo automáticamente, o **0** para mantenerlo visible hasta pulsar **Ocultar banner** o el atajo configurado.
5. Pulsa **Guardar ajustes**. El tiempo queda guardado en la computadora de cabina y se comparte con los dispositivos conectados.
6. Envía un gráfico nuevo para comprobar la duración. Cambiar Ajustes no reinicia el tiempo de uno que ya estaba en pantalla.

Los botones **Repetir animación** y **Ocultar ejemplo** revisan el diseño dentro de Ajustes. Ese ejemplo permanece visible para poder examinarlo y no modifica la transmisión. Para probar el tiempo, utiliza la salida real de OBS antes del servicio.

### 18.5 Logo de OBS

Puedes elegir:

- Dorado oficial.
- Oro luminoso.
- Blanco.
- Azul marino.
- Plata.

El selector de posición permite elegir una de las cuatro esquinas u ocultarlo. El control de tamaño modifica el tamaño del logo de transmisión.

Si logo y banner usan la misma esquina, el diseño reserva espacio para evitar que se monten uno sobre otro. Revisa la combinación en la vista previa.

### 18.6 Probar las animaciones

En **Previsualizar**, elige el tipo de gráfico que quieres revisar.

**Repetir animación** vuelve a mostrar su entrada. **Ocultar ejemplo** y **Mostrar ejemplo** permiten comprobar su salida y regreso.

Estos ejemplos no envían gráficos a OBS. Guardar los ajustes sí aplica la configuración a las salidas conectadas.

Si el dispositivo tiene activada la preferencia de movimiento reducido, algunas animaciones se simplifican. Eso no significa necesariamente que estén averiadas.

### 18.7 Cambiar controles de teclado

1. Abre la pestaña **Teclado** y entra en **Controles de teclado**.
2. Pulsa el botón que muestra la tecla de la acción que quieres cambiar.
3. Cuando solicite una tecla, pulsa la nueva.
4. Revisa que el nombre cambie.
5. Pulsa **Guardar ajustes**.

Una tecla no puede asignarse a dos acciones distintas. Escape y Ctrl+S están reservados.

**Restablecer controles** prepara las asignaciones originales; debes guardar para aplicarlas. La guía de F1 refleja las teclas configuradas.

Si otro dispositivo cambia Ajustes mientras tienes abierto el diálogo, puede aparecer un conflicto al guardar. Cierra y abre Ajustes para cargar la configuración actual y vuelve a revisar tu cambio.

![Asignaciones de teclado con el control para restaurar las teclas originales.](capturas/25-ajustes-teclado.png)

**Figura 37.** Pulsa la tecla de una acción y después la nueva asignación. Para aplicar el cambio debes guardar los ajustes.

### 18.8 Personalizar la letra de Himnario y Coro

1. Abre Ajustes, selecciona la pestaña **Letras** y localiza **Letras en las TV**.
2. En **Aplicar a**, elige **Himnario** o **Coro**. Cada catálogo guarda su propio diseño.
3. Escribe el **Límite de renglones** que quieras: cualquier número entero positivo. Puedes utilizar 1, 3, 7, 12 u otro valor; no estás limitado a una lista de opciones.
4. Define el **Tamaño mínimo de letra** y el **Tamaño máximo de letra**, entre 24 y 400 unidades relativas de diseño. El mínimo no puede superar al máximo. Los valores conservan la referencia habitual de 1080p: 156 equivale a 156 píxeles en Full HD y 312 en 4K. No tienes que duplicar el valor al conectar una TV 4K; la salida lo hace proporcionalmente.
5. Elige una **Fuente**. Inicialmente están disponibles Montserrat, Inter, Outfit y Playfair Display.
6. En **Colores de la letra**, elige los colores de **Estrofas**, **Coro** e **Indicador**.
7. En **Fondo de las letras**, elige el fondo original, un color liso o una imagen importada. **Color del fondo** se utiliza cuando eliges **Color liso**.
8. Activa **Mostrar número o nombre de estrofa** si quieres que aparezca la etiqueta de la sección en las TV. Desactivarlo oculta esa etiqueta de las estrofas; el indicador **CORO** sigue identificando los coros.
9. Revisa varios cuadros en la vista previa antes de pulsar **Guardar ajustes**.

![Controles de renglones, tamaño, fuente, colores y fondo de letras.](capturas/29-ajustes-letras.png)

**Figura 38.** Estos controles personalizan el catálogo elegido en Aplicar a. Cambiar a Coro permite configurar otro diseño sin reemplazar el del Himnario.

El límite de renglones es un máximo, no una obligación de llenar cada cuadro. El programa conserva las divisiones entre estrofas y coros y vuelve a distribuir la letra dentro de cada sección. Cambiar el límite puede aumentar o reducir la cantidad de cuadros.

El programa distribuye la letra entre los tamaños mínimo y máximo solicitados y crea más cuadros cuando hace falta. Un límite de muchos renglones no obliga a reducir la letra por debajo del mínimo para llenarlos. Si necesitas letra mayor, aumenta el mínimo y revisa cuántas pantallas necesita la sección. Si quieres más renglones en un mismo cuadro, permite un mínimo menor. La letra debe mantenerse dentro del cuadro. Las repeticiones se conservan juntas cuando caben.

Estos ajustes corresponden a las letras y al fondo del contenido de cantos. El fondo institucional de reposo se elige en **Fondo de las TV**. El diseño de los banners de OBS tiene sus propios controles.

**Restablecer este diseño** recupera las opciones iniciales del catálogo seleccionado en el borrador de Ajustes. Debes guardar para aplicarlo.

### 18.9 Recorrer la vista previa y aplicar cambios

En **Canto para previsualizar**, selecciona un canto real del catálogo elegido. Utiliza **Anterior** y **Siguiente** para recorrer sus cuadros. El contador identifica la posición y la sección; también puedes revisar su portada.

![Vista previa del himno 1 con un límite de tres renglones e indicador de estrofa.](capturas/35-previsualizar-letras.png)

**Figura 39.** La previsualización utiliza el mismo visor que las TV. Este ejemplo muestra un cuadro del himno 1 preparado con tres renglones y la etiqueta de estrofa activada.

Cambiar opciones y recorrer esta vista previa no cambia lo que está proyectado. **Guardar ajustes** sí aplica el diseño a las TV conectadas y a los cuadros preparados. Si hay un canto activo, revisa el resultado y coordina el cambio con quien lleva el servicio. El programa intenta conservar la sección y parte actual; la nueva distribución puede modificar su posición.

Cerrar Ajustes sin guardar descarta los cambios de diseño. Si otro dispositivo guardó ajustes mientras trabajabas, puede aparecer un conflicto: cierra y vuelve a abrir para cargar la versión vigente antes de repetir tus cambios.

### 18.10 Importar una fuente propia

1. Consigue el archivo de una fuente que puedas utilizar. El nombre escrito de una fuente no sustituye su archivo.
2. En la pestaña Letras, dentro de Letras en las TV, elige el catálogo al que quieres aplicarla.
3. Pulsa **Importar fuente**.
4. Selecciona un archivo **TTF**, **OTF**, **WOFF** o **WOFF2**, de un máximo de **8 MB**.
5. Espera a que termine la importación. La fuente aparecerá seleccionada y se actualizará la vista previa.
6. Revisa acentos, signos, palabras largas, estrofas y coros. La forma y el grosor dependen de la fuente importada.
7. Pulsa **Guardar ajustes** para aplicar su uso.

No es necesario instalar la fuente por separado en cada TV o celular. El archivo queda en la computadora de cabina y se sirve a los dispositivos conectados. Para trasladarla a otra instalación conserva también `data/song-assets`.

Si el archivo no es una fuente de texto compatible, pesa demasiado o no puede leerse, aparece un aviso. Selecciona otra fuente y vuelve a probar. Una fuente que no tiene los caracteres del canto puede mostrar cuadros o símbolos: utiliza una que incluya español y comprueba el resultado antes del servicio.

Importar guarda el archivo en la biblioteca de recursos aunque después cierres Ajustes sin guardar el diseño. La importación por sí sola no cambia el diseño activo. Esta versión no incluye un botón para borrar recursos importados.

### 18.11 Fondos incluidos e imágenes propias

Además del fondo original y del color liso, puedes elegir cuatro fondos vectoriales incluidos:

- **Azul noche · facetas**: planos diagonales discretos y contorno dorado.
- **Borgoña · luz dorada**: tonos vino oscuros y líneas cálidas.
- **Esmeralda · diagonales**: verdes profundos con acentos suaves.
- **Pizarra · ondas**: curvas discretas sobre gris azulado.

Los fondos dejan tranquila la zona central para que la letra se lea con claridad. Son recursos locales y no requieren internet. Puedes utilizar uno para Himnario y otro para Coro.

Para agregar una imagen propia:

1. En la pestaña Letras, dentro de Letras en las TV, elige Himnario o Coro.
2. Pulsa **Agregar fondo**.
3. Selecciona un archivo **PNG**, **JPG** o **WebP**, de un máximo de **8 MB**.
4. Espera a que se importe y aparezca seleccionado en **Fondo de las letras**.
5. Revisa el contraste con el color de las estrofas, los coros y el indicador.
6. Guarda los ajustes cuando hayas comprobado el resultado.

La imagen cubre el lienzo de las TV y puede recortarse por los bordes si tiene otra proporción. Para conservar el encuadre completo, prepara una imagen 16:9. No se admiten SVG ni archivos animados en este selector.

La imagen queda en `data/song-assets`; inclúyela en los respaldos. Como con las fuentes, importar el archivo no envía por sí solo el diseño a las TV: debes guardar los ajustes.

### 18.12 Restablecer si el diseño o los controles quedaron mal

Hay dos opciones de recuperación:

- **Restablecer este diseño**, dentro de Letras, prepara los valores iniciales solo para el catálogo seleccionado en Aplicar a.
- **Restablecer ajustes**, en el pie del diálogo, prepara los valores iniciales de todos los ajustes: datos de iglesia, letras de ambos catálogos, fondo de TV, OBS, teclado y visibilidad del editor en la interfaz principal. Antes de hacerlo aparece una confirmación.

El restablecimiento no elimina los cantos, sus letras, las listas de oraciones ni los archivos de fuentes y fondos importados. Sí sustituye los valores de los campos de Ajustes, incluida la colonia y la ciudad, por los iniciales de la instalación. Revisa la pestaña Iglesia antes de guardar si utilizas otros datos.

1. Pulsa la opción que corresponda.
2. Confirma si elegiste el restablecimiento completo.
3. Revisa las pestañas y las vistas previas.
4. Pulsa **Guardar ajustes** para aplicar y conservar los valores restablecidos.

Las preferencias de actualización tienen su propio guardado y no se modifican con Restablecer ajustes.

Mientras no guardes, el restablecimiento es solo un borrador. Si cambiaste de opinión, cierra Ajustes sin guardar. Restablecer ajustes no recupera un canto eliminado: para eso necesitas la copia de respaldo del catálogo.

<a id="19-respaldar-restaurar-y-actualizar"></a>

## 19. Respaldar, restaurar y actualizar

### 19.1 Dónde se guarda la información

La información se guarda en la computadora de cabina. El celular no guarda una copia completa del servidor por el hecho de abrir la página.

| Ubicación | Qué conserva |
| --- | --- |
| `data/himnario_lldm.json` | Catálogo y letras del himnario de esa instalación. |
| `data/coro_lldm.json` | Catálogo y letras del coro. |
| `data/lista-oraciones.json` | Semana de trabajo, semanas guardadas, grupos de ventas y duración de rotación. |
| `data/settings.json` | Datos de iglesia, controles, gráficos y diseños de letras de Himnario y Coro. |
| `data/song-assets/` | Fuentes e imágenes de fondo importadas y su registro. |
| `data/control-workspace.json` | Preparación compartida, campos, selecciones e historiales. |
| `data/projection-session.json` | Contenido y posición conservados para reanudar. |
| `data/presentations.json` | Registro de presentaciones importadas. |
| `data/update-preferences.json` | Preferencias de consulta e instalación de actualizaciones. |
| `data/factory/` | Copias de fábrica utilizadas para restaurar letras. |
| `public/uploads/presentations/` | Imágenes de las presentaciones importadas. |
| `config/obs.local.json`, si existe | Configuración adicional de integración con OBS. |

No necesitas abrir ni editar estos archivos para operar. Sus nombres sirven para identificar qué debe conservarse en un respaldo.

### 19.2 Descargar un respaldo y restaurarlo

1. En la computadora donde ejecutas Proyector, abre la cabina desde `http://localhost:4000/control`. Si usas otro puerto, cambia el 4000.
2. En **Ajustes → Avanzado → Opciones avanzadas**, abre **Respaldo de la instalación**.
3. Marca **Incluir presentaciones** si quieres llevar sus diapositivas. Pulsa **Descargar respaldo ZIP** y guarda el archivo en un lugar seguro. El límite es de 256 MiB de datos sin comprimir.
4. En la instalación de destino, abre esa misma sección, selecciona el ZIP y pulsa **Revisar respaldo**. Marca solo las secciones que quieras recuperar.
5. Pulsa **Preparar restauración** y confirma. Puedes cancelar desde el mismo panel antes de reiniciar.
6. Cuando termines de operar, cierra Proyector y vuelve a iniciarlo. Los datos anteriores de las secciones reemplazadas quedan en `data/backups/restore-previous`.

![Selección de secciones antes de preparar una restauración.](capturas/42-restaurar-respaldo.png)

El ZIP conserva ajustes de cabina, recursos importados de letras, catálogos y listas con su historial. Para trasladar también credenciales de OBS, borradores de cabina o la posición de proyección, copia sus archivos por separado con Proyector cerrado. Las presentaciones incluyen las diapositivas ya convertidas.

### 19.3 Guardar y trasladar una semana de listas

**Guardar esta semana** crea una copia en **Semanas guardadas**. Para llevar una semana a otra computadora, abre **Importar o exportar una semana** y descarga el JSON de la semana actual. También puedes descargar el JSON de cada semana en **Semanas guardadas**.

En el otro equipo, selecciona el archivo y pulsa **Importar al historial**. Si la fecha ya existe, Proyector pide confirmación antes de reemplazar la copia guardada. Abre la semana desde **Semanas guardadas** cuando quieras editarla. Para compartir una versión visual, usa **Descargar listas completas**.

![Importación de una semana desde el editor de listas en móvil.](capturas/43-transferir-semana.png)

### 19.4 Actualizar sin reemplazar los datos por una descarga limpia

1. Haz primero un respaldo completo.
2. Descarga la versión nueva en una carpeta distinta.
3. Extrae la versión nueva.
4. Detén la instalación antigua antes de utilizar la nueva en el mismo puerto.
5. Conserva y traslada a la nueva instalación los datos de trabajo y archivos importados que correspondan, como los archivos de trabajo de `data`, `public/uploads/presentations` y `config/obs.local.json` si se utiliza. Conserva `data/factory` de la versión nueva.
6. No copies `node_modules` de otra computadora; deja que la nueva instalación prepare sus componentes.
7. Si la actualización trae instrucciones de migración específicas, aplícalas antes de empezar a operar.
8. Inicia la versión nueva y revisa listas, letras, ajustes y presentaciones.
9. Recarga la cabina y las salidas para que carguen la versión nueva.
10. Conserva la carpeta anterior hasta comprobar que todo lo necesario está disponible.

Si quieres conservar correcciones propias a los cantos, copia los catálogos de trabajo. Si prefieres empezar con la letra de la versión nueva, deja que el programa cree esos catálogos a partir de sus copias de fábrica.

No sobrescribas tus archivos locales con los datos de ejemplo o predeterminados de una descarga sin tener un respaldo.

### 19.5 Pasar a otra computadora

Además de los datos, prepara en la nueva PC los programas que uses: Node.js, PowerPoint para importar PPT/PPTX y Python con PyMuPDF para PDF.

La IP local puede cambiar. Actualiza las direcciones guardadas en celulares, otras computadoras y fuentes de OBS que apunten a la PC anterior.

Verifica las presentaciones desde sus miniaturas. Copiar solo `presentations.json` sin su carpeta de imágenes deja registros que no pueden mostrar sus archivos.

### 19.6 Restaurar un respaldo

1. Detén el programa.
2. Conserva aparte una copia de la carpeta actual, aunque esté fallando.
3. Coloca la copia de respaldo completa en su ubicación de trabajo.
4. Comprueba que el acceso de inicio apunta a esa carpeta.
5. Inicia el programa y revisa la información.

Restaurar una copia antigua también devuelve los datos a la fecha de esa copia. Los cambios posteriores no aparecerán a menos que se recuperen de otra fuente.

### 19.7 Actualizaciones automáticas desde GitHub

La cabina busca una versión publicada al iniciar. Si encuentra una posterior, abre **Ajustes → Avanzado → Actualizaciones de GitHub** para ver las novedades y usar **Descargar nueva versión**. Puedes desactivar la búsqueda con **Buscar versiones al iniciar el programa** y guardar la preferencia.

![Consulta de versiones publicadas en Ajustes.](capturas/39-actualizaciones-github.png)

**Figura 40.** Consulta de versiones al iniciar desde Ajustes.

1. Descarga el ZIP de la nueva versión. En Windows, pulsa **Extraer todo** y selecciona una carpeta diferente de la anterior.
2. Termina la proyección y cierra el programa anterior. Conserva esa carpeta como respaldo.
3. Para trasladar los datos, copia los archivos locales de `data` a la nueva carpeta `data`, incluidos los catálogos si tienen cambios propios. Conserva la carpeta `data/factory` de la versión nueva. Si quieres comenzar con sus catálogos de fábrica, deja que el programa los copie al iniciar.
4. Si utilizas fuentes, fondos o presentaciones importadas, copia también `data/song-assets` y las carpetas correspondientes de `public/uploads`. Si configuraste la integración con OBS, copia tu `config/obs.local.json`.
5. Abre **Iniciar Proyector LLDM.bat** (Windows), **Iniciar Proyector LLDM.command** (macOS) o **Iniciar Proyector LLDM.sh** (Linux) en la nueva carpeta y revisa tus ajustes, listas y cantos antes de usarla.

Puedes volver a abrir la carpeta anterior si necesitas recuperar su estado. Instalar o actualizar con el ZIP no requiere Git.

<a id="20-solucion-de-problemas"></a>

## 20. Solución de problemas

### 20.1 El navegador dice que no puede acceder al sitio

**Qué revisar en la computadora de cabina:**

1. Comprueba que el programa esté abierto.
2. Revisa si la ventana de comandos terminó la instalación o muestra un error.
3. Abre exactamente `http://localhost:4000/control`.
4. Si acabas de iniciar, espera y recarga.
5. Si otra persona cambió el puerto de instalación, utiliza el que indique la ventana del programa.

Si la PC abre la cabina pero el celular no, continúa en [El celular no conecta](#204-el-celular-no-conecta-pero-la-computadora-si).

<a id="202-nodejs-no-se-reconoce"></a>

### 20.2 Node.js no se reconoce

**Mensaje habitual:** `node no se reconoce` o un aviso de que no se encontró Node.js.

1. Instala Node.js como se explica en esta guía.
2. Cierra y abre otra vez la ventana de comandos.
3. Comprueba `node --version` y `npm --version`.
4. Vuelve a abrir el archivo de inicio.

Si sigue fallando, reinicia Windows y comprueba que la instalación de Node.js se completó con npm y acceso desde la ruta de comandos.

No se resuelve copiando `server.js` a otra carpeta sin el resto del proyecto.

### 20.3 Falla la descarga o preparación de componentes

**Mensajes posibles:** errores de npm, módulos no encontrados, permisos o incompatibilidad de versión.

1. Comprueba la conexión a internet.
2. Revisa que estás en la carpeta con `package.json`.
3. Confirma la versión de Node.js.
4. Abre **Símbolo del sistema** en esa carpeta.
5. Ejecuta `npm ci` para el servidor.
6. Si el problema es el editor de listas, ejecuta `npm run setup:lists`.

Si Windows indica que `npm.ps1` no puede ejecutarse por la directiva de scripts, utiliza **Símbolo del sistema** en lugar de PowerShell. No necesitas cambiar la política de ejecución de toda la computadora para seguir estas instrucciones.

Si aparece un error de certificado, proxy o conexión corporativa, pide al responsable de esa red que revise el acceso a las descargas. No desactives comprobaciones de seguridad de npm como solución general.

<a id="204-el-celular-no-conecta-pero-la-computadora-si"></a>

### 20.4 El celular no conecta pero la computadora sí

1. Mantén funcionando el servidor en la PC.
2. Confirma que usas la IP de la computadora, no `localhost`.
3. Revisa que la dirección incluya `http://`, `:4000` y `/control`.
4. Comprueba que el celular y la PC están en la misma red local.
5. Evita la red de invitados o consulta si tiene aislamiento entre dispositivos.
6. Comprueba si una VPN está desviando la comunicación local.
7. Revisa la configuración de Firewall de Windows para Node.js en la red privada que utilizas.

Para revisar el permiso del firewall, busca en Windows **Permitir una aplicación a través del Firewall** e identifica Node.js o su entorno de ejecución. Si necesitas crear una regla y no sabes hacerlo, solicita que se permita la conexión local al puerto de la cabina en la red privada. No es necesario desactivar todo el firewall ni abrir el router hacia internet.

Una IP puede cambiar después de reconectar la computadora o cambiar de router. Vuelve a consultar el enlace mostrado en cabina.

### 20.5 Aparece Sin conexión o los dispositivos dejan de sincronizar

1. Revisa si la computadora entró en suspensión.
2. Comprueba la conexión de red y que siga abierto el servidor.
3. Espera unos segundos para permitir la reconexión.
4. Revisa si cambió la IP.
5. Recarga la página si la conexión ya volvió pero el navegador no se recuperó.

Si utilizabas otro servidor en otra computadora, comprueba que todos los dispositivos apuntan a la misma dirección. Dos instalaciones distintas no comparten datos automáticamente.

Si un campo muestra un error de guardado, no asumas que quedó guardado solo porque se ve escrito. Copia su contenido si lo necesitas antes de recargar.

### 20.6 Lista de oraciones no disponible o editor vacío

1. Comprueba que la carpeta completa del proyecto incluye `lista-oraciones`.
2. Revisa si existe `lista-oraciones/dist/index.html`.
3. Si falta o está incompleto, sigue el [apartado de preparación del editor](#6-si-falta-el-editor-de-listas).
4. Reinicia el programa y recarga la cabina.

Esta versión integra la lista dentro del proyecto. Una instalación antigua que solo contenía un enlace a otra aplicación no equivale a esta distribución completa.

<a id="207-la-duracion-no-se-guarda-o-aparece-campo-de-lista-no-valido"></a>

### 20.7 La duración no se guarda o aparece Campo de lista no válido

Ese mensaje puede aparecer cuando el navegador ya cargó el control nuevo, pero el servidor sigue ejecutando una versión anterior que no reconoce la duración.

1. Guarda lo que necesites y acuerda un momento para reiniciar si hay una proyección en uso.
2. Detén el servidor antiguo de esa instalación.
3. Asegúrate de iniciar la carpeta actualizada y no una copia anterior.
4. Inicia de nuevo Proyector LLDM.
5. Recarga la cabina con Ctrl+F5.
6. Prueba un número entero entre 1 y 600 y sal del campo.
7. Espera la confirmación.

La cabina actual detecta un servidor sin esa función y deshabilita el campo con un aviso de reinicio. Si el error persiste después del reinicio, comprueba que no sigue funcionando otra copia antigua en segundo plano.

No borres `lista-oraciones.json` para intentar activar el campo: ese archivo contiene las semanas y otros datos de la lista.

![Aviso de reinicio necesario para activar el tiempo configurable de listas.](capturas/28-aviso-version-servidor.png)

**Figura 41.** Reproducción del aviso cuando la cabina detecta un servidor anterior. Reinicia la instalación actualizada; no borres los datos de las semanas.

### 20.8 La lista no rota o cambia demasiado rápido

1. Revisa si enviaste **Enviar esta vista a TV**, que es una vista fija.
2. Para rotación utiliza **Enviar a TV** en los controles generales.
3. Comprueba que no esté pausada.
4. Revisa la duración y su unidad en segundos.
5. Comprueba que haya más de una vista habilitada.
6. Revisa si otra persona está avanzando desde otro dispositivo.

Cambiar la duración reinicia la cuenta de la vista actual. No tienes que volver a empezar la lista desde la primera vista para aplicar el nuevo tiempo.

### 20.9 Botones antiguos, sin estilo o funciones nuevas que no aparecen

1. Recarga con **Ctrl+F5** en la computadora.
2. En el celular, vuelve a cargar la página; si es necesario, cierra esa pestaña y abre de nuevo la dirección.
3. Si lo que cambió fue el programa del servidor, reinícialo también. Recargar solo el navegador no actualiza un proceso de servidor ya abierto.
4. Si afecta al editor integrado, verifica que se haya preparado la versión actual de `lista-oraciones/dist`.
5. Si afecta a OBS, actualiza su fuente Navegador y vuelve a enviar el banner que necesites.

No elimines todos los datos del navegador como primer paso: comienza por una recarga completa y por confirmar la carpeta que estás ejecutando.

### 20.10 El minivisor funciona pero la TV no muestra lo mismo

1. Comprueba la entrada HDMI o fuente de video de la TV.
2. Comprueba que en la pantalla extendida está abierta `/pantalla`, no `/control`.
3. Si utilizas OBS, comprueba la escena y la fuente activas.
4. Si la TV abre la página desde otro dispositivo, revisa que utilice la IP de la misma cabina.
5. Revisa si hay varias instalaciones ejecutándose en computadoras distintas.

El minivisor confirma la salida del programa, pero no puede comprobar físicamente un cable o la entrada elegida en una TV.

### 20.11 OBS no muestra el banner

1. Confirma que el servidor está funcionando.
2. Revisa la URL de la fuente y su puerto.
3. Comprueba que utilizas `/overlay?obs=1`.
4. Sitúa la fuente por encima de la cámara.
5. Confirma que la fuente y la escena están visibles.
6. Envía de nuevo el banner desde la cabina.
7. Si acabas de recargar la fuente, recuerda que el banner anterior puede necesitar un envío nuevo.

Un banner que desaparece después de su tiempo automático no es necesariamente un error. El logo puede seguir visible aunque el banner ya se haya retirado.

### 20.12 El overlay tapa la cámara o aparecen botones de prueba

Si tapa la cámara con una página completa, revisa si usaste `/pantalla` en lugar del overlay.

Si aparecen controles de prueba, utiliza la dirección con `?obs=1` y revisa que OBS no esté capturando la ventana completa de un navegador de pruebas en lugar de su fuente Navegador dedicada.

Si sigue viéndose opaco, comprueba que no haya un fondo o filtro añadido manualmente en OBS que esté rellenando la transparencia.

### 20.13 El logo no se ve o el banner se coloca en otra esquina

1. Abre Ajustes.
2. Revisa si el logo está en **Oculto**.
3. Comprueba su color respecto al fondo de la cámara.
4. Revisa posición y tamaño.
5. Pulsa **Guardar ajustes**.
6. Recarga la fuente si conservaba una versión anterior.

Un logo blanco sobre una escena muy clara puede tener poco contraste. Eso es distinto de que el archivo no exista.

### 20.14 No funcionan las flechas, Espacio o F1

1. Haz clic fuera de los cuadros de texto.
2. Cierra los diálogos de edición cuando corresponda.
3. Revisa las teclas configuradas en Ajustes o en la guía de controles.
4. Comprueba si tu teclado necesita Fn para las teclas de función.
5. Asegúrate de que la ventana con foco es la cabina.

Mientras escribes, el programa evita utilizar normalmente las teclas de navegación para avanzar diapositivas. Escape sigue teniendo su acción especial.

### 20.15 Una letra no cabe, se corta o se divide de forma extraña

1. Identifica el canto y la sección exacta.
2. Revisa los cuadros de operación y el minivisor.
3. Abre el editor y comprueba que las secciones estén bien identificadas.
4. Revisa palabras pegadas, textos repetidos accidentalmente o cadenas sin espacios.
5. Guarda y vuelve a enviar cuando corresponda.
6. Si el minivisor se ve completo pero la TV recorta bordes, revisa el ajuste de pantalla de la TV.

Si continúa el problema, conserva el número o título y el texto exacto de la sección para reportarlo. No reduzcas toda la letra del sistema ni cambies archivos de diseño sin identificar primero el caso.

### 20.16 Falla un PowerPoint

1. Comprueba que PowerPoint de escritorio esté instalado en la computadora de cabina.
2. Abre el archivo directamente en PowerPoint.
3. Resuelve avisos de activación o configuración inicial de Office.
4. Revisa si el documento está protegido por contraseña o necesita confirmaciones para abrirse.
5. Prueba con una presentación pequeña.
6. Si el archivo sigue fallando, exporta sus diapositivas como imágenes e impórtalas.

PowerPoint en el navegador no sustituye al programa de escritorio para este conversor. Un error de objeto COM o de PowerPoint suele estar relacionado con esa instalación local.

### 20.17 Falla un PDF

1. Comprueba que el PDF abre en un lector.
2. Revisa si está protegido por contraseña.
3. En Símbolo del sistema ejecuta `python --version`.
4. Ejecuta la comprobación de `import fitz` del apartado de PDF.
5. Si aparece `No module named fitz`, instala PyMuPDF en ese mismo Python.
6. Si `python` abre la tienda o no se encuentra, corrige su instalación o solicita configurar la ruta que utiliza el programa.

No instales un paquete llamado solamente `fitz` como sustituto: el componente que utiliza esta función es **PyMuPDF**.

Si no puedes preparar el conversor en ese momento, exporta las páginas como imágenes e impórtalas en Presentaciones.

### 20.18 Faltan fechas en una imagen o en TV

Revisa **Incluir fecha** en cada entrada y el selector de páginas en **Para TV**. En **Descargar listas completas**, elige **Descargar todas (ZIP)** si una lista genera varias imágenes. Las fechas y los campos se conservan en las páginas correspondientes.

### 20.19 No se descarga el PNG o el ZIP

1. Espera a que termine la generación.
2. Revisa el panel de descargas del navegador.
3. Comprueba la carpeta Descargas y los permisos de descarga del sitio.
4. Prueba primero con una sola imagen.
5. Comprueba que la computadora tenga espacio libre.

Si el programa informa de un texto que no cabe, revisa especialmente cadenas muy largas sin espacios. Conserva el mensaje exacto si necesitas ayuda.

### 20.20 Parece que se perdieron listas, ajustes o correcciones

1. Comprueba la carpeta desde la que se inició el servidor.
2. Revisa si abriste una descarga nueva en vez de la instalación habitual.
3. Comprueba la dirección IP que están utilizando los dispositivos.
4. Busca la carpeta anterior y sus respaldos.
5. Revisa `data` y la carpeta de presentaciones sin sobrescribirlas.

Descargar GitHub otra vez no recupera necesariamente la configuración local de tu instalación.

Si aparece un error de lectura de JSON o un archivo de datos dañado, conserva una copia antes de pedir una reparación. No borres la carpeta `data` como intento de limpieza.

### 20.21 El puerto 4000 ya está ocupado

**Mensaje habitual:** `EADDRINUSE` o una indicación de que la dirección ya está en uso.

Lo más común es que otra copia del servidor ya esté funcionando.

1. Prueba abrir `http://localhost:4000/control`.
2. Si ya funciona, no inicies otra copia.
3. Si necesitas cambiar de versión, detén específicamente la instalación anterior antes de iniciar la nueva.
4. Si no identificas qué proceso ocupa el puerto, pide ayuda indicando ese mensaje.

No cierres todos los procesos llamados Node sin identificarlos: la computadora puede utilizar Node para otros programas.

### 20.22 El programa abre pero los cambios no sobreviven al reinicio

1. Comprueba que estás volviendo a abrir la misma carpeta.
2. Revisa si hubo mensajes de permiso denegado o errores de guardado.
3. Comprueba que no se esté ejecutando desde el ZIP, una ubicación de solo lectura o una copia temporal.
4. Revisa el espacio libre del disco.
5. Si utilizas una carpeta sincronizada con otra aplicación, comprueba si esa aplicación está sustituyendo los archivos.

El programa guarda los datos en sus archivos locales. Mantener un campo visible no garantiza que se haya escrito en disco si apareció un error.

### 20.23 Qué información dar al pedir ayuda

Indica:

- Qué estabas intentando hacer.
- Qué botón pulsaste.
- Qué esperabas ver y qué ocurrió.
- El mensaje exacto del error.
- Si ocurrió en PC, celular, TV o fuente de OBS.
- Si el minivisor y la salida física muestran lo mismo.
- Si el problema comenzó después de una actualización o traslado de carpeta.
- En problemas de cantos, el título o número y la sección.
- En problemas de importación, el formato del archivo y si abre en su programa original.

Una captura del error o de la ventana del programa puede ser útil. No compartas contraseñas del archivo de configuración de OBS.

### 20.24 No aparece una actualización

Comprueba **Ajustes → Avanzado → Actualizaciones de GitHub**. Activa **Buscar versiones al iniciar el programa** y guarda la preferencia para el siguiente arranque. Si la consulta falla por falta de conexión, puedes seguir usando la versión instalada. También puedes consultar [las versiones publicadas](https://github.com/HuriTolentino/ProyectorLLDM/releases) desde el navegador.

<a id="21-rutinas-de-operacion"></a>

## 21. Rutinas de operación

### 21.1 Antes de comenzar un servicio

1. Enciende la computadora y verifica que no vaya a suspenderse durante el uso.
2. Inicia una sola instalación de Proyector LLDM.
3. Abre la cabina y comprueba el minivisor.
4. Comprueba la TV física o la escena de salida.
5. Confirma el fondo de reposo correcto.
6. Busca los cantos que vas a utilizar y revisa sus cuadros.
7. Revisa temas y citas previstos.
8. Revisa fecha, nombres y vistas incluidas en las listas.
9. Importa y comprueba las presentaciones antes del momento de utilizarlas.
10. Si hay transmisión, prueba un banner y ocúltalo al terminar la prueba.
11. Acuerda quién enviará contenido desde cada dispositivo.

### 21.2 Durante el servicio

Comprueba el minivisor después de cada envío. Utiliza las acciones de TV para las pantallas y las de OBS para los gráficos de cámara.

Puedes preparar otro contenido sin enviarlo todavía. Si necesitas retirar la letra o una lista, utiliza el fondo institucional.

Si falla la conexión, confirma primero si el contenido visible continúa en las TV antes de enviar varias veces la misma acción.

### 21.3 Al terminar

1. Muestra el fondo en las TV cuando corresponda.
2. Oculta los banners de transmisión que no deben continuar.
3. Guarda la semana si necesitas conservar su copia en el historial.
4. Confirma que no hay errores de guardado pendientes.
5. Haz el respaldo previsto por tu organización.
6. Cierra el programa cuando ya no se necesite su servicio.

<a id="22-inicio-automatico-y-cierre-del-programa"></a>

## 22. Inicio automático y cierre del programa

### 22.1 Inicio manual habitual

Utiliza **Iniciar Proyector LLDM.bat** y conserva su ventana abierta mientras operas.

Si el programa está funcionando en segundo plano, puede no existir esa ventana visible. Abrir o cerrar la cabina del navegador no controla necesariamente ese proceso.

### 22.2 Crear un acceso de inicio de Windows

Una forma de iniciar la instalación al entrar en tu cuenta de Windows es crear un acceso directo:

1. Comprueba que la instalación manual ya funcione.
2. En la carpeta del proyecto, crea un acceso directo de **Iniciar Proyector LLDM.bat**.
3. Pulsa **Windows+R**.
4. Escribe `shell:startup` y pulsa Enter.
5. Coloca allí el acceso directo.
6. Vuelve a iniciar sesión cuando puedas probarlo sin afectar una operación en curso.

Esto actúa al entrar en esa cuenta de Windows, no antes de que alguien inicie sesión. No coloques una copia aislada del archivo de inicio sin su carpeta de trabajo: usa un acceso que apunte a la instalación completa.

### 22.3 Utilidad automática incluida

El proyecto también contiene **Activar Inicio Automatico al Prender PC.bat**. Crea un archivo de inicio para la cuenta actual y guarda la ruta de la instalación.

Esa utilidad tiene una particularidad: si encuentra el administrador de procesos `forever`, utiliza una orden `forever stopall` antes de arrancar el servidor. Si la computadora utiliza ese administrador para otros programas, solicita que el responsable revise esta opción antes de utilizarla. El acceso directo manual del apartado anterior permite un arranque más fácil de identificar.

No necesitas instalar `forever` para la operación normal de esta guía.

### 22.4 Quitar el inicio automático

Abre `shell:startup` y retira únicamente el acceso directo de Proyector LLDM, o el archivo `iniciar_cabina.bat` que esa utilidad haya creado en esa carpeta de inicio.

Retirar el inicio automático no elimina las letras, listas ni configuraciones del proyecto.

Si moviste la instalación, corrige el acceso o vuelve a crear el inicio con la ruta nueva.

### 22.5 Cerrar y reiniciar

En el inicio manual, puedes detener el programa desde su ventana de comandos con **Ctrl+C** y confirmar si Windows lo solicita. Después vuelve a abrir el archivo de inicio para arrancarlo.

Cerrar solo el navegador no reinicia el servidor. Si se inició en segundo plano o mediante un administrador, detén específicamente ese proceso con ayuda de quien configuró el arranque.

Al reiniciar, el sistema recupera el contenido y su posición conservados, pero comienza mostrando el fondo. Utiliza **Reanudar proyección** cuando corresponda. Para una lista, revisa además si necesitas reanudar su rotación.

<a id="23-configuracion-adicional-de-integracion-con-obs"></a>

## 23. Configuración adicional de integración con OBS

Este apartado es opcional y está dirigido a quien da soporte a la instalación. No es necesario para añadir y utilizar la fuente Navegador del overlay.

### 23.1 Qué hace esta integración

Además de servir la página de gráficos, el proyecto puede conectarse al control WebSocket de OBS para trabajar con una escena, grupo y fuente de texto configurados.

Este enlace adicional utiliza una dirección diferente de la cabina. La configuración de ejemplo apunta a `localhost:4455`, mientras que la cabina y sus páginas utilizan normalmente el puerto 4000.

No cambies la dirección del celular al puerto 4455 para intentar abrir la cabina.

### 23.2 Archivo de configuración

La carpeta `config` contiene `obs.example.json`. La configuración local se lee de `obs.local.json` cuando existe.

El responsable puede copiar el ejemplo con ese nombre y ajustar:

| Campo | Qué representa |
| --- | --- |
| `address` | Computadora y puerto del control WebSocket de OBS. |
| `password` | Contraseña configurada en OBS para esa conexión. |
| `scene` | Nombre exacto de la escena. |
| `group` | Nombre exacto del grupo de fuentes. |
| `source` | Nombre exacto de la fuente de texto. |

Los nombres del archivo de ejemplo son valores de partida, no nombres obligatorios para todas las instalaciones. Deben coincidir con los elementos reales de OBS si se utiliza esa integración.

Después de cambiar este archivo se necesita reiniciar el servidor en un momento adecuado. Conserva este archivo en los respaldos si lo usas y no publiques su contraseña.

Si únicamente necesitas los gráficos de la fuente Navegador, comienza por comprobar `/overlay?obs=1` y su posición sobre la cámara antes de modificar esta integración adicional.

<a id="24-glosario-y-referencias"></a>

## 24. Glosario y referencias

### 24.1 Palabras utilizadas en esta guía

| Palabra | Significado en este programa |
| --- | --- |
| Cabina | Página desde la que operas y preparas contenido. |
| Servidor | Programa local que mantiene los datos y atiende a los dispositivos. |
| Salida | Página o señal que recibe la TV o una fuente de OBS. |
| Minivisor | Recuadro Salida a TV dentro de la cabina. |
| Vista previa | Revisión de un contenido; su efecto depende de si es la salida real o una preparación. |
| Banner | Gráfico que identifica contenido sobre una cámara. |
| Overlay | Página transparente de gráficos para OBS. |
| IP | Dirección de la computadora dentro de la red. |
| Puerto | Número que acompaña la dirección del servicio; normalmente 4000 para la cabina. |
| Localhost | Este mismo dispositivo. |
| Diapositiva o cuadro | Una pantalla concreta dentro de una presentación, un canto o una lista. |
| Rotación | Cambio automático entre vistas de las listas. |
| Borrador | Contenido actual de trabajo, distinto de una copia guardada en el historial. |
| PNG | Archivo de imagen utilizado en las descargas. |
| ZIP | Paquete comprimido que puede contener varios archivos. |
| Respaldo | Copia de los archivos que permite recuperar información. |
| Caché | Copia temporal de archivos que conserva un navegador y que puede necesitar una recarga completa tras actualizar. |

### 24.2 Fuentes de consulta

- [Repositorio de Proyector LLDM](https://github.com/HuriTolentino/ProyectorLLDM).
- [README principal de esta instalación](../README.md).
- [Descarga oficial de Node.js](https://nodejs.org/en/download).
- [Fuente Navegador en OBS Studio](https://obsproject.com/kb/Browser-Source).
- [Python en Windows](https://docs.python.org/3/using/windows.html).
- [Instalación de PyMuPDF](https://pymupdf.readthedocs.io/en/latest/installation.html).

Las funciones y limitaciones del proyecto descritas aquí se comprobaron en el código de esta instalación. Los enlaces externos explican los componentes que se instalan aparte.
