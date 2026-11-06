# Publicar y actualizar el programa

## Instalador Windows

La cabina consulta si hay un instalador nuevo en GitHub. El aviso lleva a **Ajustes → Avanzado → Actualizaciones del programa**, donde puedes descargarlo. Cierra la cabina y ejecuta el instalador cuando te convenga. Actualiza la copia existente y conserva los datos del usuario. Si falla la consulta, puedes seguir usando la cabina.

El instalador incluye el convertidor y su entorno de ejecución: importar PDF, PPT y PPTX no requiere conexión, Java, Python, PowerPoint ni LibreOffice instalados. La conversión de documentos complejos puede presentar diferencias visuales respecto a la aplicación original.

## Edición ZIP

La edición ZIP consulta las versiones publicadas y enlaza a su descarga. Para actualizarla, descarga y extrae el ZIP nuevo en otra carpeta. Conserva la instalación anterior y sigue el apartado 19.7 de la guía para trasladar los datos que quieras conservar. Esta edición mantiene sus requisitos de Node.js y sus dependencias opcionales para importar documentos. En Windows, el BAT del ZIP 1.5.0 abre la aplicación instalada si esta ya está registrada; crea el respaldo en el ZIP anterior antes de instalarla para migrar sus datos.

## Preparar una publicación

Actualiza la versión estable en `package.json` y `package-lock.json` y compila las listas con `npm run build:lists`. En Windows, con Node.js, Python, JDK 21 o superior y Maven instalados, ejecuta `npm ci`, `npm test`, `npm run build:converter`, `npm run test:converter` y `npm run build:windows`. El instalador y los metadatos se generan en `output/windows`. Para crear también el ZIP, ejecuta `npm run build:release`.

Para publicar, el workflow exige firmas Authenticode válidas del mismo editor y con sello de tiempo en el instalador y la aplicación. Configura `WIN_CSC_LINK` y `WIN_CSC_KEY_PASSWORD` como secretos del repositorio si tu proveedor te dio un certificado compatible con este método. Firma durante la compilación para que el instalador contenga el ejecutable firmado.

Si tu proveedor usa un token o un adaptador de firma en la nube, configura su cliente para que muestre el certificado en el almacén Personal del usuario de Windows. Después de compilar el conversor, ejecuta `pwsh -File scripts/build-windows-signed.ps1 -Thumbprint HUELLA_DEL_CERTIFICADO`. Este comando exige la firma durante la compilación y verifica el sello de tiempo de los dos ejecutables. La huella identifica el certificado, sin incluir su clave privada.

Al subir una etiqueta `vX.Y.Z`, el workflow `.github/workflows/release.yml` comprueba la versión, ejecuta las pruebas y genera el ZIP y el instalador. En el runner de Windows instala y desinstala una copia temporal e importa PDF, PPT y PPTX usando el ejecutable instalado. Solo después de pasar esas comprobaciones y validar la firma crea y publica el release.

Desde **Actions → Publicar Proyector LLDM → Run workflow** puedes generar los artefactos de una rama o etiqueta para revisarlos. Deja desmarcada la opción de publicar para una prueba. Para publicar manualmente, indica una etiqueta existente y marca esa opción. El flujo conserva los releases existentes y genera solamente el ZIP para etiquetas anteriores a la edición de escritorio.

Ambas ediciones consultan el repositorio público indicado en `config/releases.json`. El ZIP contiene los catálogos de fábrica y conserva los datos de trabajo dentro de cada instalación.
