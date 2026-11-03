# Conexión dentro del templo

El objetivo es controlar Proyector LLDM desde la red local del templo. No se contempla el acceso desde internet. Este documento explica lo que ya funciona y distingue las mejoras que aún no están implementadas.

## Lo que ya funciona

La computadora puede estar conectada al router por cable Ethernet y el celular por Wi-Fi. No hace falta que la computadora tenga antena Wi-Fi, que active una zona móvil o que sea una máquina especial de servidor.

```text
                        Router del templo
                       /                 \
              Cable Ethernet             Wi-Fi
                    /                       \
       PC con Proyector LLDM          Celulares y tablets
```

El programa sirve la cabina desde la computadora. Abre en el celular el enlace local que muestra la PC, incluido el puerto y `/control`. No escribas `localhost` en el celular: esa dirección se refiere al propio celular.

La operación local básica puede continuar sin internet si los equipos mantienen comunicación con el router y la computadora sigue ejecutando el programa. La transmisión a plataformas externas sí necesita su propia conexión a internet.

## Si falta cobertura

La opción a estudiar primero es un punto de acceso conectado por cable al router. Colocado cerca de la zona de operación, proporciona Wi-Fi sin depender de la cobertura de la computadora. No es necesario contratar un servidor ni publicar la aplicación.

Configúralo en modo punto de acceso dentro de la misma red local. Si se utiliza otro router, verifica que no cree una red separada. Una red de invitados o el aislamiento de clientes pueden impedir llegar a la PC.

La ubicación, el cableado y la cobertura deben comprobarse en cada templo antes de elegir equipos. No se ha configurado ni comprado ningún dispositivo como parte de esta revisión.

## Conservar el enlace

Una reserva DHCP en el router puede mantener la dirección local de la PC. Quien administre ese router debe reservar la dirección correspondiente; no hay una IP universal para todos los templos.

La PC debe permanecer encendida y sin suspensión durante el uso. Las demás pantallas y controles dependen de ella.

## Límite de acceso

No abrir puertos del router, publicar enlaces mediante túneles ni habilitar control desde internet. Tampoco se han cambiado reglas de firewall ni ajustes del router en esta tarea.

El servidor actual no tiene autenticación de operadores. Por eso debe utilizarse en una red local de confianza. Estar en una red local reduce la exposición, pero no equivale a tener controles de acceso dentro de esa red: un equipo que pueda alcanzar el servicio puede acceder al control.

Si el Wi-Fi del templo se comparte con visitantes, conviene que quien administre la red separe el acceso de visitantes del de operación. La red de los operadores debe permitir llegar a la PC; la de visitantes debe quedar aislada. No es necesario dar acceso a toda la red de visitantes para resolver la conexión del operador.

## Mejoras propuestas para el programa

Estas funciones **todavía no están implementadas**:

1. Cambiar la etiqueta **Wi-Fi** por **Conectar dispositivos**, porque también se usa Ethernet.
2. Mostrar un QR con el enlace local para evitar escribir la IP y el puerto.
3. Permitir seleccionar la tarjeta de red cuando existan varias, por ejemplo Ethernet y adaptadores virtuales. Actualmente se elige una dirección automáticamente y puede no ser la adecuada.
4. Añadir emparejamiento local y permisos para operadores. Requiere proteger tanto las peticiones como la conexión de sincronización, sin impedir la salida de TV y OBS.

La prioridad propuesta es facilitar el enlace local y después incorporar el control de acceso. El QR solo facilita abrir la dirección: por sí mismo no protege el control.

## Referencias

- [TP-Link: utilizar un router como punto de acceso](https://www.tp-link.com/nordic/support/faq/1384/). Describe cómo convertir una red cableada en acceso Wi-Fi.
- [TP-Link: acceso de invitados a la red local](https://www.tp-link.com/us/support/faq/2798/). Explica cómo el aislamiento afecta la comunicación con la red principal. Los nombres de estas opciones varían según el fabricante y modelo.
