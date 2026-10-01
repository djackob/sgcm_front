import { ExpedientePagoDetalle, OrdenServicioSiga } from '../models/pago.model';

export const TIPO_ANEXO_11 = 'PAG_ACTA_ANEXO11';
export const CARPETA_ANEXO_11 = 'pago';

const NEGRO = '#000000';
const BORDE = '#000000';
const GRIS = '#D9D9D9';
const GRIS_MEDIO = '#CCCCCC';
const GRIS_CALIDO = '#D0CECE';

/**
 * Anexo N.° 11 — Acta de Conformidad.
 *
 * Réplica de «ANEXO 11 - ACTA DE CONFORMIDAD (3).docx»: una sola tabla con el
 * cuadro CONTRATO (dos filas, para contrataciones que cruzan el ejercicio
 * fiscal) y, separado por una columna sin bordes, el cuadro TIPO / NÚMERO /
 * SIAF / FECHA EMISION de la orden; luego el bloque del proveedor y el bloque
 * CONFORMIDAD. Medidas tomadas del Word (twips / 20 = puntos). Los datos de la
 * orden salen de SIGA, no se digitan; si el dato todavía no existe, va en blanco.
 */

export function nombreArchivoAnexo11(detalle: ExpedientePagoDetalle): string {
  return `Anexo 11 - ${detalle.Codigo || 'pago'}.pdf`;
}

export function construirAnexo11(detalle: ExpedientePagoDetalle, orden: OrdenServicioSiga | null = null): any {
  const dias = Number(detalle.DiasAtraso || 0);
  const hayPenalidad = dias > 0 && !detalle.RetrasoJustificado;
  const tipo = detalle.TipoOrden === 'OC' ? 'O/C' : 'O/S';

  return {
    pageSize: 'A4',
    pageMargins: [85, 71, 85, 71],
    info: {
      title: `Anexo N.° 11 · ${detalle.Codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    content: [
      { text: 'ANEXO N° 11', style: 'titulo' },
      { text: 'ACTA DE CONFORMIDAD', style: 'titulo', margin: [0, 0, 0, 18] },

      {
        text: [
          'Por el presente, el/la que suscribe deja constancia que se ha verificado el cumplimiento de la '
          + 'prestación de conformidad con las condiciones establecidas en términos de '
          + 'referencia/especificaciones técnicas, según corresponda; por consiguiente, se brinda la ',
          { text: 'CONFORMIDAD', bold: true },
          ' de la prestación, resultando necesario precisar que los documentos solicitados han sido '
          + 'emitidos de acuerdo a lo señalado en nuestro requerimiento; motivo por el cual firmo la '
          + 'presente. En tal sentido autorizo proceder con el pago correspondiente'
        ],
        style: 'cuerpo',
        margin: [0, 0, 0, 14]
      },

      {
        table: {
          /* Ancho del Word menos los 4 pt de relleno lateral de marcoCompacto(). */
          widths: [28, 80, 54, 74, 22, 59, '*'],
          heights: [15, 15, 15, 15],
          body: [
            [
              cabeceraCentro('CONTRATO', GRIS, 4), {}, {}, {},
              separador(),
              cabeceraCentro('TIPO:'),
              { text: tipo, style: 'cabecera', fontSize: 9, alignment: 'center', margin: [1, 2, 1, 2] }
            ],
            [
              cabeceraCentro('Nº', GRIS_MEDIO),
              cabeceraCentro('FECHA INICIO'),
              cabeceraCentro('FECHA TERMINO'),
              cabeceraCentro('MONTO CONTRACTUAL', GRIS_CALIDO),
              separador(),
              cabeceraCentro('NÚMERO'),
              celdaCentro(orden?.NumeroOrden || detalle.NumeroOrdenSiga)
            ],
            [
              celdaCentro(detalle.NumeroContrato),
              celdaCentro(fecha(detalle.FechaInicioContrato)),
              celdaCentro(fecha(detalle.FechaFinContrato)),
              celdaCentro(moneda(detalle.MontoContrato)),
              separador(),
              cabeceraCentro('SIAF N°:'),
              celdaCentro(orden?.ExpedienteSiaf || detalle.ExpedienteSiaf)
            ],
            [
              celdaCentro(''), celdaCentro(''), celdaCentro(''), celdaCentro(''),
              separador(),
              cabeceraCentro('FECHA EMISION:'),
              celdaCentro(fecha(orden?.FechaOrden))
            ]
          ]
        },
        layout: marcoCompacto(),
        margin: [0, 0, 0, 14]
      },

      {
        table: {
          widths: [146, '*'],
          heights: [18, 18, 22, 22, 18, 18],
          body: [
            [etiqueta('PROVEEDOR'), celda(detalle.NombreLocador)],
            [etiqueta('RUC'), celda(detalle.RucLocador || detalle.DniLocador)],
            [etiqueta('DENOMINACION DE LA CONTRATACION'), celda(detalle.Denominacion)],
            [etiqueta('N° ENTREGABLE Y/O PRODUCTO:'), celda(detalle.NumeroEntregable)],
            [etiqueta('N° DE PAGO'), celda(detalle.NumeroEntregable)],
            [etiqueta('MONTO DE ENTREGABLE:'), celda(moneda(detalle.MontoEntregable))]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 14]
      },

      {
        table: {
          widths: [155, '*'],
          heights: [22, 19, 32, 32, 22, 22, 22],
          body: [
            [
              { text: 'CONFORMIDAD', style: 'cabecera', alignment: 'center', colSpan: 2, fillColor: GRIS_MEDIO, margin: [3, 5, 3, 5] },
              {}
            ],
            [etiqueta('AREA USUARIA:'), celda(detalle.UnidadOrigen)],
            [etiqueta('FECHA DE INICIO DE LA PRESTACIÓN'), celda(fecha(detalle.FechaInicioContrato))],
            [etiqueta('FECHA DE PRESENTACIÓN DEL ENTREGABLE O ENTREGA DEL BIEN'), celda(fecha(detalle.FechaPresentacion))],
            [etiqueta('DÍAS DE ATRASO'), celda(dias)],
            [etiqueta('CORRESPONDE PENALIDAD'), celda(hayPenalidad ? 'SÍ' : 'NO')],
            [etiqueta('ANOTACIONES/ OBSERVACIONES'), { text: texto(detalle.ObservacionAu), style: 'valor', margin: [3, 5, 3, 14] }]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 60]
      },

      {
        text: 'FIRMA Y POSTFIRMA DEL RESPONSABLE DEL ÁREA USUARIA',
        style: 'seccion',
        alignment: 'center'
      }
    ],
    styles: {
      titulo: { fontSize: 10, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 10, bold: true, color: NEGRO },
      cuerpo: { fontSize: 10, alignment: 'justify', color: NEGRO, lineHeight: 1.08 },
      cabecera: { fontSize: 10, bold: true, color: NEGRO },
      valor: { fontSize: 10, color: NEGRO }
    },
    defaultStyle: { fontSize: 10, color: NEGRO }
  };
}

function marco(): any {
  return {
    hLineColor: () => BORDE,
    vLineColor: () => BORDE,
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6
  };
}

/* Columnas angostas del Word: con el relleno normal, «MONTO CONTRACTUAL» y
   las fechas se parten. */
function marcoCompacto(): any {
  return { ...marco(), paddingLeft: () => 2, paddingRight: () => 2 };
}

/* Columna que separa los dos cuadros: sin líneas arriba ni abajo, solo los
   bordes laterales que comparte con las columnas vecinas. */
function separador(): any {
  return { text: '', border: [true, false, true, false] };
}

function cabeceraCentro(rotulo: string, relleno: string = GRIS, colSpan?: number): any {
  return {
    text: rotulo, style: 'cabecera', fontSize: 9, alignment: 'center', fillColor: relleno,
    margin: [1, 2, 1, 2], ...(colSpan ? { colSpan } : {})
  };
}

function celdaCentro(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'valor', fontSize: 9, alignment: 'center', margin: [1, 2, 1, 2] };
}

function etiqueta(rotulo: string): any {
  return { text: rotulo, style: 'cabecera', fillColor: GRIS, margin: [3, 4, 3, 4] };
}

function celda(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'valor', margin: [3, 4, 3, 4] };
}

function texto(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }
  return String(valor);
}

function moneda(valor: number | null | undefined): string {
  const numero = Number(valor || 0);
  if (!numero) {
    return '';
  }
  return `S/ ${numero.toLocaleString('es-PE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })}`;
}

/* Las fechas llegan de SQL sin zona ('2026-09-15' o '2026-09-15T10:20:00');
   se formatean desde el texto para que new Date() no las corra un día al
   interpretarlas como UTC. */
function fecha(valor: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
