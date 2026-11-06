# Notas de cambios

## Versión 1.4.6

### Conexión Wi-Fi para celulares sin fricción y Hotspot de PC

- **Pestaña dedicada Wi-Fi y botón directo**: se sustituyó la IP numérica visible del encabezado por el botón **Wi-Fi (QR)**, que abre directamente la pestaña **Wi-Fi** en Ajustes y genera el código QR al instante.
- **Actualización automática en tiempo real**: al escanear el QR desde el celular y pulsar «Entrar a la cabina», la ventana en la computadora se actualiza sola al momento (oculta el código QR, muestra la confirmación en verde con el nombre del celular y lo incorpora a la lista de dispositivos enlazados).
- **Detección automática de celular**: el formulario móvil autodetecta el modelo del dispositivo (ej. `iPhone`, `iPad`, `Celular Android`) para acceder sin necesidad de escribir texto si no se desea.
- **Solución Hotspot para templos sin router**: nuevo botón **📶 Compartir Wi-Fi desde esta PC (Hotspot)** en Ajustes que abre con un clic la configuración nativa de Windows o macOS para emitir Wi-Fi directamente desde la computadora sin requerir internet.

### Selectores de color nativos y estilizados

- En **Ajustes → Letras en las TV**, todos los controles de color (estrofas, coro, indicador, fondo y citas bíblicas) son ahora selectores nativos estilizados. Cuentan con un marco oscuro integrado, muestra de color de alta definición, efecto luminoso dorado y el valor HEX visible en mayúsculas (`#FFFFFF`), abriendo la paleta nativa del sistema operativo con un solo clic.

### Rediseño integral de la pestaña Transmisión (Centro de Control OBS)

- **Monitor en vivo y alarma de estado «En el Aire»**: el monitor superior ahora incorpora un badge dinámico con pulso visual (`● EN EL AIRE: [Texto]` frente a `○ EN REPOSO (Solo Logo)`) que indica en tiempo real qué gráfico está superpuesto sobre las cámaras en OBS.
- **Acción rápida de ocultar banner**: botón de emergencia `Ocultar Banner` situado junto al monitor para retirar el banner al aire con un solo clic.
- **Centro de control por módulos independientes**: se reemplazó el campo genérico compartido por cuatro módulos dedicados con su propio campo, descripción y botón de lanzamiento directo:
  1. **Ministro y Ubicación**: persistente, proyecta centrado abajo el rango, nombre y ciudad.
  2. **El Coro Canta**: identifica al coro y opcionalmente el título del canto especial.
  3. **Ubicación y Dron**: cuadro animado para tomas aéreas y exteriores.
  4. **Aviso o Titular Especial**: banner libre para anuncios especiales, bienvenidas o menciones.
- **Panel de enlaces de salida de video**: tarjetas rediseñadas con botones de un clic para copiar la URL al portapapeles (`/pantalla` y `/overlay`) o abrirlas directamente en el navegador.

### Buscador de texto bíblico

- Corregido: el buscador por texto siempre mostraba los pasajes de Reina Valera 1960 aunque eligieras otra traducción. Ahora los resultados salen de la versión seleccionada y se actualizan al cambiarla.

## Versión 1.4.5

### PDF sin instalar nada a mano

- Si Python ya está en la PC, PyMuPDF se instala automáticamente al abrir la cabina (con internet) y se reintenta si un PDF lo necesita. Sin Python no se pueden importar PDF, pero todo lo demás funciona; las diapositivas también se pueden subir como imágenes PNG/JPG.

## Versión 1.4.4

### Dispositivos conectados que se actualizan solos

- La cabina, los celulares enlazados, `/pantalla`, `/overlay` y el fondo de TV se recargan automáticamente cuando el servidor se reinicia o se actualiza a una nueva versión, sin tener que refrescar a mano.
- Se retiró el enlace «Abrir enlace de conexión» bajo el QR de **Ajustes → Avanzado**; el celular se conecta únicamente escaneando el código.
- Python queda documentado como **opcional**: solo se usa para importar PDF (o PowerPoint en macOS/Linux). Si falta, la cabina muestra un mensaje claro con la alternativa de subir imágenes PNG/JPG.

## Versión 1.4.3

### Fondo de reposo personalizable e importable en TV y modo Transparente (canto → cámaras → canto)

- En **Ajustes → Fondo de TV**, ahora puedes importar cualquier fondo de reposo propio: imágenes (**PNG, JPG, WebP, GIF**), videos en bucle (**MP4, WebM**) o fondos animados vectoriales y web (**SVG, HTML** como el fondo oficial animado).
- Nuevo modo **Transparente · cámaras en TV (canto → cámaras → canto)**: al volver a reposo (**Esc** o botón **Fondo**), la salida `/pantalla` se vuelve completamente transparente mediante transición suave para dejar visibles las cámaras colocadas debajo en OBS, y al proyectar el siguiente canto vuelve a cubrir la pantalla automáticamente.
- Los fondos de reposo importados se incluyen y validan dentro de los respaldos ZIP de configuración.

### Arranque autoverificado y reconexión automática con OBS

- Los iniciadores (`Iniciar Proyector LLDM.bat`, `iniciar_cabina.bat`, `Activar Inicio Automatico al Prender PC.bat`, `.command` y `.sh`) ahora verifican todas las dependencias de `package.json` antes de iniciar el servidor. Si una actualización agrega paquetes nuevos, los instalan automáticamente sin fallar en el arranque.
- Al conectar con OBS vía WebSocket, el puente refresca automáticamente las fuentes de navegador (`Navegador` y `FondoTv`) por si OBS inició antes que el servidor.

## Versión 1.4.2

### Compatibilidad con macOS y Linux

- Se incorpora soporte oficial multiplataforma en el paquete de distribución (`Proyector-LLDM-1.4.2.zip`) para **Windows**, **macOS** y **Linux**.
- Nuevos iniciadores de doble clic: `Iniciar Proyector LLDM.command` para macOS y `Iniciar Proyector LLDM.sh` para Linux, empaquetados con permisos de ejecución Unix (`0755`) y saltos de línea `LF`.
- Apertura automática de la cabina en el navegador predeterminado en macOS (`open`), Linux (`xdg-open`) y Windows (`rundll32`).
- Conversión de presentaciones (`.ppt`, `.pptx` y `.pdf`) compatible con macOS y Linux mediante detección automática de LibreOffice (`soffice` / `libreoffice`) y Python 3 (`pymupdf`).

### Operación entre dispositivos y limpieza con Esc / Fondo

- Cada dispositivo conectado puede permanecer en su propia pestaña o ventana y utilizar sus propios campos de búsqueda de forma independiente (con prioridad de persistencia para la PC principal), mientras que la **Salida a TV**, la **Salida a OBS** y todos los campos de la **Lista de oraciones** permanecen 100% síncronos en tiempo real.
- Al pulsar **Esc** o el botón **Fondo** (tanto en PC como en dispositivos móviles), se retira la proyección a reposo y se limpian los campos de búsqueda en los dispositivos, conservando intactos los datos de la Lista de oraciones.
- Nuevo **Banner Inferior de Ministro y Ubicación (OBS)** en la pestaña **Transmisión**: permite escribir el rango y nombre del ministro (ej. `P.E. ELIAS DÍAZ`, `D.E.`, `E.E.`) en un apartado propio que se guarda de forma persistente (sin borrarse al pulsar `Esc` / `Fondo` ni al reiniciar) y proyecta en la parte inferior centrada de `/overlay` el nombre del ministro junto con la ubicación configurada en **Ajustes → Iglesia**, adaptándose tanto al estilo **Clásico** como a **Paneles angulares**.
- Búsqueda por texto bíblico integrada en **Temas y citas** y guías actualizadas en Markdown, HTML y PDF.

## Versión 1.4.1

### Personalización de la proyección

- En **Ajustes → Fondo de TV**, puedes desactivar por separado el movimiento de las líneas doradas del fondo Centenario, la animación del logo en TV y OBS, y el resplandor del fondo y del logo. Los tres efectos vienen activados en instalaciones nuevas y al actualizar desde una versión anterior.
- En **Ajustes → Letras**, Himnario y Coro tienen controles independientes para la separación entre renglones y la sombra del texto. La separación se toma en cuenta al calcular cuántos renglones caben por diapositiva.
- En la misma pestaña, el perfil **Biblia** permite cambiar el color del texto y el color de la cita y los números de versículo, además de desactivar la sombra. La vista previa muestra los formatos **Solo cita** y **Cita con texto** antes de guardar.
- Los ajustes de proyección se conservan al reiniciar y se incluyen en el respaldo de configuración.

### Cambios incorporados desde 1.4.0

- Conexión de dispositivos por código QR en la red local. La cabina puede ajustar cuánto tiempo se muestran las citas bíblicas y los temas en TV. Con 0 segundos se retiran manualmente.
- Proyector Lite está disponible en el navegador, con una interfaz más cercana a la cabina de escritorio y una guía para usar su salida en OBS.

### Actualización en Windows

- Extrae `Proyector-LLDM-1.4.1.zip` en una carpeta nueva. Conserva la instalación anterior y consulta **Actualizar el programa** en la guía para trasladar tu configuración y tus datos.

## Versión 1.4.0

- Proyección bíblica en modo Solo Cita o Cita + Texto, con ocho traducciones disponibles sin internet.
- El texto sigue los límites de tamaño y renglones del Himnario y se distribuye en diapositivas navegables.
- La cabina, TV, OBS y listas abren desde carpetas de instalación cuyo nombre empieza con punto.
- Guías actualizadas con el selector de traducción, las tarjetas del pasaje y la salida a TV.
- Consulta de actualizaciones y enlaces de descarga bajo HuriTolentino.

## Versión 1.3.1

- Etiquetas visibles en los campos del editor de Oraciones, incluso después de llenarlos.
- Catálogo de cantos del coro de fábrica normalizado y corregido: letras de partituras depuradas, compases e indicaciones de ejecutantes eliminados de la proyección.
- Identidad de instalación y paquetes unificada como Proyector LLDM.
- Captura del editor actualizada en los manuales.

## Versión 1.3.0

- Respaldo ZIP desde Ajustes y restauración por secciones al reiniciar.
- Importación y exportación JSON del Himnario, el Coro y las semanas de listas.
- Cabecera institucional en Aviso, Flores y Ventas, con fechas destacadas y selección de páginas para TV.
- Calendario basado en el domingo de cierre y corrección de fechas automáticas antiguas.
- Validación de respaldos y recursos, protección frente a catálogos vacíos y carga de semanas grandes.
- Manuales actualizados con 43 capturas y tres animaciones en HTML.

## Versión 1.2.0

- Aviso independiente con saltos, énfasis y controles de disposición.
- Fechas editables y campos adicionales en flores y ventas.
- Calendario coherente entre el editor, la cabina y las imágenes de listas completas.
- Importación de un catálogo JSON del coro desde Ajustes con respaldo.
- Guías actualizadas y documentación para aportar al editor de listas.

## Versión 1.1.0

- Descarga de versiones publicadas sin Git en la PC de proyección.
- Instalación limpia con los catálogos actuales como nueva base de fábrica.
- En el coro, Final termina el canto y las secciones de respuesta quedan fuera de la proyección.
- Las repeticiones delimitadas permanecen en un cuadro completo.

- Enviar contenido a TV activa también su identificación de OBS. La navegación entre estrofas del mismo canto no repite el banner.

- Corregido el ajuste de letra del minivisor: conserva el mismo tamaño proporcional que las TV, sin reducciones causadas por redondeos de pantalla.

- Duración configurable de banners de OBS y del cuadro de ubicación; 0 permite ocultarlos manualmente.
- Icono con el logo institucional completo y portada del manual simplificada.
- Guía actualizada con pasos para configurar la duración.
- Vistas previas sin conexiones de sincronización propias y caché para los archivos compilados de listas.

- Comprobación de nuevas versiones únicamente al iniciar el programa.
- Aviso de versión disponible con sus notas y enlace de descarga.
- Salida proporcional en 16:9 para pantallas de distintas resoluciones.
- Editor de letras opcional en la interfaz principal.

## Próximamente

Todavía no hay anuncios publicados para la siguiente versión.
