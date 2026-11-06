# Proyector LLDM

Sistema local de proyección y transmisión para **La Luz del Mundo**. Diseñado para operar en la cabina de audio y video del templo de forma rápida, moderna y sin complicaciones.

Permite proyectar cantos del **Himnario**, repertorio del **Coro**, **temas y citas bíblicas**, **presentaciones** y **listas semanales** (oraciones, avisos, flores y ventas) en las pantallas del templo, mientras envía automáticamente gráficos y banners transparentes a **OBS Studio** para las transmisiones en vivo.

Desarrollado con dedicación por **Huri Tolentino**.

## Tutorial en video

[Ver el tutorial de instalación y uso en YouTube](https://youtu.be/Z_ffszcXWqo). El video explica cómo iniciar la edición ZIP y usar la cabina, el control móvil y OBS.

---

## Descarga e instalación

### Windows

1. Abre [la versión piloto 1.5.0 en GitHub Releases](https://github.com/HuriTolentino/ProyectorLLDM/releases/tag/v1.5.0-pilot.1) y descarga **`Proyector-LLDM-Setup-1.5.0.exe`**. El instalador piloto no tiene firma digital y Windows puede mostrar una advertencia.
2. Ejecuta el instalador. La opción **Iniciar Proyector LLDM al entrar a Windows** viene marcada. Puedes desmarcarla antes de instalar. Abre **Proyector LLDM** desde el acceso creado o desde el menú Inicio.
3. La cabina se abre en una ventana de escritorio. Puedes importar PDF y presentaciones PPT/PPTX sin conexión y sin instalar Node.js, Python, PowerPoint ni LibreOffice.

La cabina puede avisarte si hay una versión nueva. Descarga el instalador, cierra la cabina y ejecútalo cuando te convenga. El instalador actualiza la copia existente y conserva los datos del usuario.

Si vienes de la edición ZIP, descarga un respaldo de la instalación anterior desde Ajustes, marca la opción de incluir presentaciones si las quieres conservar y restáuralo en la aplicación instalada. El BAT incluido en la versión 1.5.0 también abre la aplicación instalada y usa la misma preferencia de actualización.

### ZIP multiplataforma (Windows, macOS y Linux)

También puedes descargar **`Proyector-LLDM-X.X.X.zip`** desde la misma página. Extrae todo en una carpeta fija y abre `Iniciar Proyector LLDM.bat` en Windows, `Iniciar Proyector LLDM.command` en macOS o `Iniciar Proyector LLDM.sh` en Linux. En Windows, si ya existe una instalación de escritorio registrada, el BAT de la versión 1.5.0 abre esa aplicación y usa sus datos en lugar de iniciar el ZIP. Para migrar, crea el respaldo desde el ZIP anterior antes de instalar la aplicación. Esta edición necesita [Node.js](https://nodejs.org/) y puede necesitar internet al iniciarse por primera vez para instalar dependencias. Python y PyMuPDF son necesarios para importar PDF; para PowerPoint se necesita PowerPoint en Windows, o LibreOffice y Python en macOS y Linux.

---

## Cómo se usa (Pantallas y Direcciones)

Una vez que abres Proyector LLDM, el programa corre de forma local en tu computadora. Puedes abrir estas direcciones en tu navegador web (Google Chrome, Edge, etc.):

| Dirección | Uso | Dónde se abre |
| :--- | :--- | :--- |
| **`http://localhost:4000/control`** | **Cabina de Mando** | En la pantalla del operador (donde buscas cantos y manejas todo). |
| **`http://localhost:4000/pantalla`** | **Salida a TV / Proyector** | En la segunda pantalla (arrastra esta ventana a la TV o proyector del templo y presiona `F11` para pantalla completa). |
| **`http://localhost:4000/overlay?obs=1`** | **Banners para OBS Studio** | Como fuente de **Navegador** en OBS Studio para sobreponer títulos sobre la cámara. |

### Control desde celular o tablet
Conecta el celular y la PC a la misma red del templo. En la PC, abre **Ajustes → Wi-Fi**. Genera un código, escanéalo y dale un nombre corto al dispositivo. Desde ese mismo panel puedes desconectarlo. La PC puede estar conectada por cable Ethernet.

Abre [Proyector LLDM Lite](https://proyector.lldmcoro.com/) para proyectar cantos, citas, temas y listas desde el navegador. Guarda las listas en el navegador y sincroniza la TV entre ventanas del mismo perfil. La personalización avanzada, el enlace de celulares por QR, OBS y la conversión de presentaciones están en la edición de escritorio.

El instalador de Windows incluye la conversión local de PDF y PowerPoint. El ZIP multiplataforma mantiene sus requisitos propios, descritos en la sección de descarga.

Para ajustar cuánto duran las citas y los temas, abre **Ajustes → Fondo de TV → Duración en TV**. Ambos duran dos minutos por defecto y puedes retirarlos antes con **Fondo** o **Esc**.

---

## Vista previa de la Cabina

![Cabina de Proyector LLDM en su ventana de escritorio para Windows](docs/capturas/71-cabina-escritorio.png)

---

## Características principales

* **Himnario Oficial:** Búsqueda ultrarrápida por número o por fragmentos de letra. Separación automática en estrofas y coro, portadas con título y navegación intuitiva.
* **Catálogo del Coro:** Repertorio completo y limpio de fábrica, con métrica poética restaurada, división clara de partes y libre de marcaciones de partituras.
* **Temas y citas bíblicas.** Prepara el tema del servicio y elige **Solo Cita** o **Cita + Texto** para TV. El texto se pagina con los tamaños y el límite de renglones del Himnario. Se incluyen ocho traducciones de uso local, con Reina Valera 1960 como selección inicial. La referencia también puede aparecer como banner de OBS. [Uso de citas bíblicas](docs/GUIA_DE_USUARIO.md#13-proyectar-temas-citas-y-referencias-especiales)
* **Lista de Oraciones y Actividades Semanales:**
  * Editor completo de semana: oraciones, avisos especiales, flores y grupos de ventas.
  * Carrusel rotativo para TV con tiempos configurables.
  * Descarga e impresión de listas en imágenes de alta resolución para compartir por WhatsApp.
* **Presentaciones:** Importa diapositivas desde imágenes (PNG, JPG), documentos PDF o presentaciones de PowerPoint (PPT/PPTX).
* **Integración con OBS Studio:**
  * Gráficos transparentes nativos en 16:9 y soporte hasta 4K.
  * Duración automática de banners configurable (o modo permanente con ocultado manual).
  * Cuadro de ubicación configurable (colonia, ciudad, distrito) y logo institucional sobrepuesto.
* **Seguridad y Respaldos en 1 Clic:**
  * Genera un respaldo ZIP completo de tus ajustes, catálogos y semanas desde la cabina.
  * Restaura datos de manera segura con protección contra fallos o apagones.

---

## Controles rápidos de teclado

Para operar con agilidad durante el servicio:

| Tecla | Acción |
| :---: | :--- |
| **`Espacio`** o **`→`** | Avanzar al siguiente cuadro o estrofa. |
| **`←`** | Retroceder al cuadro anterior. |
| **`↓`** / **`↑`** | Saltar a la siguiente o anterior estrofa completa. |
| **`B`** | Mostrar u ocultar el **Fondo institucional** en las TV. |
| **`O`** | Ocultar inmediatamente el banner en OBS. |
| **`Esc`** | Limpiar la pantalla y regresar al fondo de reposo. |
| **`F1`** | Ver la ayuda de controles en pantalla. |

*(Puedes personalizar todos estos atajos en cualquier momento en el menú de **Ajustes**).*

---

## Manuales completos y documentación

El programa incluye documentación detallada ilustrada paso a paso:

* **[Manual de Usuario en PDF (Descargar)](docs/GUIA_DE_USUARIO.pdf) · [Descargar desde Google Drive](https://drive.google.com/file/d/1au7F9mh7xiqC8EV2xWsfn0bwZXTkRoiT/view?usp=sharing):** Documento listo para imprimir o leer en tu celular, con 24 capítulos, capturas reales y solución a todas las dudas comunes.
* **[Manual Interactivo en HTML](docs/GUIA_DE_USUARIO.html):** Se abre directamente en cualquier navegador con capturas ampliables y animaciones.
* **[Manual Portátil Offline](docs/GUIA_DE_USUARIO_PORTATIL.html):** Un solo archivo con todas las imágenes y animaciones integradas para llevar en una memoria USB.

---

## Cómo actualizar a una nueva versión

En Windows instalado, ve a **Ajustes → Avanzado → Actualizaciones del programa** y pulsa **Descargar instalador** si hay una versión nueva. Cierra la cabina y ejecuta el archivo descargado. Para la edición ZIP, descarga y extrae la nueva versión en una carpeta separada. Crea un respaldo desde la cabina anterior y restáuralo en la nueva. Consulta [Publicar y actualizar el programa](docs/ACTUALIZACIONES.md) para más detalles.

---

## Soporte y Solución de problemas comunes

* **¿El iniciador ZIP se cierra solo al abrir?** Asegúrate de tener instalado [Node.js](https://nodejs.org/) en tu computadora.
* **¿El celular no abre la cabina?** Verifica que tanto la computadora como el celular estén conectados a la misma red WiFi del templo y que el firewall de Windows permita la conexión de Node.js.
* **¿En OBS no se ve transparente?** En la fuente de navegador de OBS Studio, asegúrate de marcar la casilla de verificación *"Apagar la fuente cuando no esté visible"* y dejar el fondo transparente.

Para una guía detallada de más de 20 problemas frecuentes, consulta el capítulo de **[Solución de problemas en la Guía de Usuario](docs/GUIA_DE_USUARIO.md#20-solucion-de-problemas)**.

---

## Licencia

Este proyecto está bajo la licencia [PolyForm Noncommercial 1.0.0](LICENSE).

Se autoriza su uso, copia, modificación y distribución comunitaria de forma totalmente libre y gratuita. **Queda estrictamente prohibida su venta, comercialización, cobro o distribución con fines de lucro.**

---

### Créditos
Desarrollado y mantenido por **Huri Tolentino** para la Iglesia La Luz del Mundo.
