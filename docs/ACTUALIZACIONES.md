# Publicar y actualizar el programa

La cabina usa el número de versión de package.json y consulta una vez al iniciar la última versión estable publicada de Proyector LLDM. Muestra las notas de esa publicación y enlaza a su descarga. Una consulta fallida deja disponible la cabina.

Para actualizar una PC de proyección, descarga el ZIP de la versión nueva y extráelo en una carpeta separada. Conserva la instalación anterior y sigue el apartado 19.7 de la guía para trasladar los datos que quieras conservar.

Para preparar una publicación, actualiza la versión en package.json y package-lock.json, ejecuta las pruebas y compila las listas con npm run build:lists. Genera el ZIP con python scripts/package-release.py. Publícalo en Releases con una etiqueta que coincida con la versión, por ejemplo v1.1.0, y añade las notas de cambios.

Para que la búsqueda y la descarga funcionen sin iniciar sesión, publica en un repositorio público. Puedes guardar el código en un repositorio privado y publicar los ZIP en otro repositorio. Escribe el nombre del repositorio de descargas en config/releases.json antes de preparar el ZIP.

El ZIP incluye los catálogos de fábrica. Cada instalación crea sus catálogos de trabajo a partir de ellos en el primer arranque. Los datos de congregación, las sesiones, las listas guardadas y los archivos importados se conservan en la instalación donde se crearon.
