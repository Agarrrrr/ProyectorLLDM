---
name: Proyector LLDM
description: Sistema visual de la cabina de operación y sus editores.
colors:
  canvas: "#0b1019"
  surface: "#152130"
  field: "#0e1724"
  control: "#213249"
  control-hover: "#2c415b"
  line: "#465e79"
  text: "#edf3fb"
  secondary: "#b7c7da"
  accent: "#e5c276"
  accent-hover: "#f0d59a"
  accent-ink: "#152130"
  danger: "#ffc3c0"
  focus: "#98c5ff"
typography:
  body:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  control: "8px"
  panel: "14px"
spacing:
  compact: "8px"
  related: "12px"
  group: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.control}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
---

## Overview

La cabina es una superficie de operación: debe facilitar encontrar un canto, identificar lo que está en TV y ejecutar una acción sin distracciones. El diseño conserva la identidad azul oscuro y dorada existente. Las reglas se aplican a los controles, Ajustes y editores; los lienzos de TV y los gráficos de OBS conservan sus propios diseños y preferencias del usuario.

## Colors

Los tokens `--ui-*` de `public/styles/operator-controls.css` son la referencia de los controles compartidos de la cabina y la lista de oraciones. El dorado identifica acciones principales y selecciones. Los controles secundarios utilizan azul. Las acciones de eliminación se identifican con rojo suave y texto explícito. El estado real de TV mantiene su señal verde existente.

## Typography

Una sola familia, Montserrat, mantiene la interfaz coherente. Los títulos del diálogo, leyendas de sección, etiquetas y controles tienen pesos diferenciados. No utilizar las fuentes de proyección como tipografía del editor: son elecciones del contenido, no del sistema de navegación. Las etiquetas y mensajes deben seguir siendo legibles al ampliar el navegador.

## Layout

Ajustes tiene encabezado, pestañas, contenido desplazable y pie persistente. Solo el contenido se desplaza. Seis pestañas se distribuyen en una fila en escritorio y dos filas en móvil. En Letras, configuración y vista previa comparten dos columnas cuando hay espacio; por debajo de 850 px pasan a una columna.

Agrupar distribución y tamaños, fuente, colores y fondo. No encerrar cada grupo en otra tarjeta. Mantener el visor real de TV y su comportamiento flotante en móvil. Conservar todos los controles de operación y sus identificadores.

## Elevation & Depth

Los paneles utilizan un borde fino para separarse. Los botones son planos, con contraste de fondo y borde, sin brillo decorativo. Los diálogos usan su fondo de oscurecimiento para expresar profundidad. Reservar el movimiento para apertura, cierre y respuesta a una acción; respetar movimiento reducido.

## Shapes

Controles rectangulares con esquinas suaves. Tamaño táctil mínimo de 44 px donde se opera con el dedo. Los campos numéricos, selectores, casillas y selectores de color conservan sus mecanismos nativos. No ocultar el foco del teclado ni recortar controles para hacerlos caber.

## Components

Guardar es la acción principal; restablecer y cancelar son secundarias. Las pestañas tienen estado seleccionado explícito, navegación por teclado y una sola región visible. La vista previa de Letras permanece junto a sus parámetros en escritorio. Las acciones de biblioteca están dentro de Avanzado. La eliminación conserva sus tres confirmaciones.

## Do's and Don'ts

- Mantener contraste, jerarquía, foco y estados deshabilitados consistentes.
- Conservar la funcionalidad y la terminología aprobadas; una revisión visual no cambia la lógica de proyección.
- Utilizar los datos reales del catálogo en ejemplos y capturas.
- Verificar escritorio 1080p, tablet, móvil estrecho y zoom del navegador.
- No rediseñar el banner clásico de OBS ni aplicar estilos de controles a los lienzos de salida.
- No agregar etiquetas decorativas, métricas inventadas o explicaciones repetidas en el flujo de operación.

## Salidas de TV y OBS

La composición es proporcional 16:9 y se renderiza a la resolución nativa del navegador. Los valores de referencia del diseño se expresan en unidades relativas mediante `output-viewport.css` y `OutputViewport`; 1920 × 1080 es una referencia de coordenadas, no un límite de resolución. Mantener las proporciones, los cortes de letra y el diseño clásico aprobado. Las coordenadas internas de SVG permanecen en su `viewBox`. Los previsualizadores usan su tamaño disponible y los mismos documentos de salida.

El acceso directo Editar letra se controla mediante Ajustes → Avanzado → Interfaz principal. Está oculto por defecto y la preferencia se persiste en `operator.showLyricsEditor`.
