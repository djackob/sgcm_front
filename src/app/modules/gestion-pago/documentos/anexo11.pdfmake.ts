import { ExpedientePagoDetalle, OrdenServicioSiga } from '../models/pago.model';

export const TIPO_ANEXO_11 = 'PAG_ACTA_ANEXO11';
export const CARPETA_ANEXO_11 = 'pago';

const NEGRO = '#000000';
const BORDE = '#000000';
const GRIS = '#D9D9D9';

/**
 * Anexo N.° 11 — Acta de Conformidad.
 *
 * Réplica del formato validado en la reunión del 27-09-2026: cuadro CONTRATO
 * (N.°, fechas y monto, para contrataciones que cruzan el ejercicio fiscal)
 * junto al cuadro TIPO / NÚMERO / SIAF / FECHA DE EMISIÓN de la orden, bloque
 * del proveedor y bloque CONFORMIDAD. Los datos de la orden salen de SIGA, no
 * se digitan; si el dato todavía no existe, va la línea en blanco.
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
    pageMargins: [56, 48, 56, 44],
    info: {
      title: `Anexo N.° 11 · ${detalle.Codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    content: [
      { text: 'ANEXO N° 11', style: 'titulo' },
      { text: 'ACTA DE CONFORMIDAD', style: 'titulo', margin: [0, 0, 0, 14] },

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
        columns: [
          {
            width: '*',
            table: {
              widths: [30, '*', '*', '*'],
              body: [
                [
                  { text: 'CONTRATO', style: 'cabecera', alignment: 'center', colSpan: 4, fillColor: GRIS, margin: [3, 3, 3, 3] },
                  {}, {}, {}
                ],
                [
                  cabeceraCentro('Nº'),
                  cabeceraCentro('FECHA INICIO'),
                  cabeceraCentro('FECHA TERMINO'),
                  cabeceraCentro('MONTO CONTRACTUAL')
                ],
                [
                  celda(detalle.NumeroContrato),
                  celda(fecha(detalle.FechaInicioContrato)),
                  celda(fecha(detalle.FechaFinContrato)),
                  celda(moneda(detalle.MontoContrato))
                ]
              ]
            },
            layout: marco()
          },
          { width: 18, text: '' },
          {
            width: 150,
            table: {
              widths: [62, '*'],
              body: [
                [cabeceraCentro('TIPO:'), { text: tipo, style: 'cabecera', alignment: 'center', margin: [3, 4, 3, 4] }],
                [cabeceraCentro('NÚMERO:'), celda(orden?.NumeroOrden || detalle.NumeroOrdenSiga)],
                [cabeceraCentro('SIAF N°:'), celda(orden?.ExpedienteSiaf || detalle.ExpedienteSiaf)],
                [cabeceraCentro('FECHA EMISION:'), celda(fecha(orden?.FechaOrden))]
              ]
            },
            layout: marco()
          }
        ],
        margin: [0, 0, 0, 16]
      },

      {
        table: {
          widths: [150, '*'],
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
        margin: [0, 0, 0, 16]
      },

      {
        table: {
          widths: [150, '*'],
          body: [
            [
              { text: 'CONFORMIDAD', style: 'cabecera', alignment: 'center', colSpan: 2, fillColor: GRIS, margin: [3, 5, 3, 5] },
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
      titulo: { fontSize: 11, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 9, bold: true, color: NEGRO },
      cuerpo: { fontSize: 9, alignment: 'justify', color: NEGRO, lineHeight: 1.15 },
      cabecera: { fontSize: 8, bold: true, color: NEGRO },
      valor: { fontSize: 9, color: NEGRO }
    },
    defaultStyle: { fontSize: 9, color: NEGRO }
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

function cabeceraCentro(rotulo: string): any {
  return { text: rotulo, style: 'cabecera', alignment: 'center', fillColor: GRIS, margin: [3, 3, 3, 3] };
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
