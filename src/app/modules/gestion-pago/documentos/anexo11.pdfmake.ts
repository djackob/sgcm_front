import { ExpedientePagoDetalle } from '../models/pago.model';

export const TIPO_ANEXO_11 = 'PAG_ACTA_ANEXO11';
export const CARPETA_ANEXO_11 = 'pago';

const NEGRO = '#000000';
const BORDE = '#000000';

/**
 * Anexo N.° 11 — Acta de Conformidad.
 *
 * RÉPLICA del formato de la Directiva N.° 002-2026-ANIN, página 51. Los
 * rótulos, el orden de los bloques y el párrafo de constancia son los de la
 * Directiva, palabra por palabra. No se le agregan campos ni leyendas porque al
 * sistema le resulten informativos (ESTANDARES §4.7): si el formato no los
 * tiene, no van; y si el formato los tiene y el dato todavía no existe, va la
 * línea en blanco, como en el papel.
 */

export function nombreArchivoAnexo11(detalle: ExpedientePagoDetalle): string {
  return `Anexo 11 - ${detalle.Codigo || 'pago'}.pdf`;
}

export function construirAnexo11(detalle: ExpedientePagoDetalle): any {
  const dias = Number(detalle.DiasAtraso || 0);
  const hayPenalidad = dias > 0 && !detalle.RetrasoJustificado;

  return {
    pageSize: 'A4',
    pageMargins: [56, 48, 56, 44],
    info: {
      title: `Anexo N.° 11 · ${detalle.Codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    footer: (pagina: number, total: number) => ({
      margin: [56, 8, 56, 16],
      text: `Página ${pagina} de ${total}`,
      fontSize: 8,
      alignment: 'right',
      color: NEGRO
    }),
    content: [
      { text: 'ANEXO N° 11', style: 'titulo' },
      { text: 'ACTA DE CONFORMIDAD', style: 'titulo', margin: [0, 2, 0, 14] },

      {
        text: 'Por el presente, el/la que suscribe deja constancia que se ha verificado el cumplimiento '
            + 'de la prestación de conformidad con las condiciones establecidas en términos de '
            + 'referencia/especificaciones técnicas, según corresponda; por consiguiente, se brinda la '
            + 'CONFORMIDAD de la prestación, resultando necesario precisar que los documentos solicitados '
            + 'han sido emitidos de acuerdo a lo señalado en nuestro requerimiento; motivo por el cual firmo '
            + 'la presente. En tal sentido autorizo proceder con el pago correspondiente',
        style: 'cuerpo',
        margin: [0, 0, 0, 16]
      },

      { text: 'CONTRATO', style: 'seccion' },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              cabecera('TIPO: O/S - O/C N°'),
              cabecera('FECHA INICIO'),
              cabecera('FECHA TERMINO'),
              cabecera('MONTO CONTRACTUAL')
            ],
            [
              celda(detalle.NumeroOrdenSiga),
              celda(null),
              celda(null),
              celda(moneda(detalle.MontoContrato))
            ]
          ]
        },
        layout: marco(),
        margin: [0, 4, 0, 0]
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [cabecera('SIAF N°'), cabecera('FECHA EMISION')],
            [celda(detalle.ExpedienteSiaf), celda(null)]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 12]
      },

      {
        table: {
          widths: [200, '*'],
          body: [
            [cabecera('PROVEEDOR'), celda(detalle.NombreLocador)],
            [cabecera('RUC'), celda(detalle.RucLocador)],
            [cabecera('DENOMINACION DE LA CONTRATACION'), celda(detalle.Denominacion)],
            [cabecera('N° ENTREGABLE Y/O PRODUCTO'), celda(detalle.NumeroEntregable)],
            [cabecera('N° DE PAGO'), celda(detalle.NumeroEntregable)],
            [cabecera('MONTO DE ENTREGABLE'), celda(moneda(detalle.MontoEntregable))]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 18]
      },

      { text: 'CONFORMIDAD AREA USUARIA', style: 'seccion' },
      {
        table: {
          widths: ['*', '*', 70, 90],
          body: [
            [
              cabecera('FECHA DE INICIO DE LA PRESTACIÓN'),
              cabecera('FECHA DE PRESENTACIÓN DEL ENTREGABLE O ENTREGA DEL BIEN'),
              cabecera('DÍAS DE ATRASO'),
              cabecera('CORRESPONDE PENALIDAD')
            ],
            [
              celda(null),
              celda(fecha(detalle.FechaPresentacion)),
              celda(dias),
              celda(hayPenalidad ? 'Sí' : 'NO')
            ]
          ]
        },
        layout: marco(),
        margin: [0, 4, 0, 12]
      },

      {
        table: {
          widths: ['*'],
          body: [
            [cabecera('ANOTACIONES/ OBSERVACIONES')],
            [{ text: texto(detalle.ObservacionAu), style: 'valor', margin: [4, 6, 4, 24] }]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 28]
      },

      {
        text: 'FIRMA Y POSTFIRMA DEL RESPONSABLE DEL ÁREA USUARIA',
        style: 'seccion',
        alignment: 'center'
      }
    ],
    styles: {
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 9, bold: true, color: NEGRO },
      cuerpo: { fontSize: 9, alignment: 'justify', color: NEGRO, lineHeight: 1.2 },
      cabecera: { fontSize: 7.5, bold: true, color: NEGRO },
      valor: { fontSize: 9, color: NEGRO }
    },
    defaultStyle: { fontSize: 9, color: NEGRO }
  };
}

/* El formato de la Directiva es una grilla: se replica con marco completo, no
   con líneas horizontales sueltas. */
function marco(): any {
  return {
    hLineColor: () => BORDE,
    vLineColor: () => BORDE,
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6
  };
}

function cabecera(etiqueta: string): any {
  return { text: etiqueta, style: 'cabecera', margin: [3, 4, 3, 4] };
}

function celda(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'valor', margin: [3, 5, 3, 5] };
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

function fecha(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE');
}
