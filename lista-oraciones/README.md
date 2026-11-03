# Editor de listas de Proyector LLDM

Esta carpeta contiene el editor integrado de oraciones, avisos, flores y ventas. Forma parte de la instalación completa de Proyector LLDM.

Para instalar y utilizar el programa, comienza en el [README principal](../README.md) o en la [guía de usuario](../docs/GUIA_DE_USUARIO.md).

También puedes abrir con doble clic [el manual en HTML](../docs/GUIA_DE_USUARIO.html), que se lee en un navegador sin iniciar el programa.

## Uso normal

Inicia el programa desde la carpeta principal y abre la pestaña **Lista de oraciones** de la cabina. No es necesario iniciar un segundo programa dentro de esta carpeta para la operación habitual.

## Preparar el editor si falta la distribución

Abre Símbolo del sistema en la carpeta principal del proyecto y ejecuta:

```bat
npm run setup:lists
```

Para reconstruirlo cuando sus componentes ya están instalados:

```bat
npm run build:lists
```

La guía principal explica estos pasos y los requisitos de Node.js. Las órdenes se ejecutan desde la carpeta que contiene el archivo de inicio de Proyector LLDM, no desde una carpeta elegida al azar.

## Mantenimiento

Los archivos preparados se guardan en `dist`. Las semanas, los grupos de ventas y los demás datos compartidos pertenecen al servidor principal y se conservan en la carpeta `data` del proyecto.

No elimines los datos de la instalación para intentar reconstruir el editor.

## Aportaciones

Las fechas del calendario se calculan en `src/calendar.ts`. Los formularios viven en `src/components/Editor`, las vistas de TV en `src/components/SignagePlayer` y las imágenes en `src/images`.

Al revisar un cambio, prueba una semana que cruce de mes o año, una fecha especial fuera de domingo y una lista con varias páginas. Usa datos de ejemplo en las capturas. Ejecuta `npm run build:lists` desde la raíz y `npm run lint` desde esta carpeta.

Las semanas pueden descargarse como JSON editable e importarse al historial desde **Importar o exportar una semana**. Las imágenes siguen disponibles en **Descargar listas completas**.
