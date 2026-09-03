# Instrucciones para sesiones de IA — frontend

**El documento de entrada del proyecto es `INIT.md`, en el repositorio
`sgcm_script`** (`../sgcm_script/INIT.md` si los tres repos están clonados en la
misma carpeta). Ahí están las reglas, el estado de cada módulo y los defectos
abiertos. Los estándares completos, en `../sgcm_script/ESTANDARES.md` §4.

Lo que hay que saber para tocar este repositorio:

- **La pantalla no decide qué se puede hacer: lo pregunta.** Los botones de
  acción salen del arreglo `Transiciones` que la base devuelve en cada fila.
  Deducir la acción a partir del estado es reimplementar la máquina de estados
  en TypeScript y confiar en que las dos copias no se separen.
- **No se agrega texto informativo que nadie pidió** (`ESTANDARES.md` §4.7). En
  una pantalla van campos, etiquetas y mensajes de error, nada más: ni notas
  explicativas bajo un campo, ni ayudas que cuentan las consecuencias de cada
  opción. **La explicación va en un comentario del código.**
- **Toda llamada pasa por `MetodoService`**, y el servicio del módulo no tiene
  lógica: un método por endpoint.
- **Los modelos llevan los nombres de la base**, en PascalCase, sin traducir.

## El sistema visual es global

Vive en `src/styles/components/`. El `.scss` del componente es para lo que sólo
existe ahí. Antes de inventar una clase, comprobar que no exista ya:

| Para | Clase |
|---|---|
| Tabla de bandeja | `table scm-table` dentro de `.table-responsive`, con `data-column-name` en cada `<td>` para la vista de tarjetas |
| Estado | `status-pill status-pill--{success\|warning\|info\|neutral}` |
| Celda de dos líneas | `cell-title` + `cell-subtitle` |
| Botón cuadrado de acción | `btn-icon-outline` dentro de `.action-cell`, en un `<td class="td-acciones">` |
| Ventana | `modal-fondo` › `modal-app-dialog` › `modal-app` › `modal-cabecera` / `modal-cuerpo` / `modal-footer` |

**Una clase que no existe no da error, sólo se ve mal.** La bandeja de pagos
usaba `tabla-app` —que no está definida en ninguna parte— y por eso salía sin
estilos: sin fondo de cabecera, sin separadores y sin responsive.

## Criterio de pantalla

- El detalle de un expediente **abre en modal**, en los tres módulos. Es el mismo
  gesto y el mismo resultado.
- Las acciones del flujo van **con su nombre** cuando hay sitio —el pie de un
  modal— y como **icono con `title`** cuando compiten por el ancho de una celda.
- La bandeja muestra todo lo de la unidad y **marca** lo que le toca a este
  perfil (`MeToca`), que la base devuelve ordenado primero. No hay check de
  «Solo mi bandeja».
