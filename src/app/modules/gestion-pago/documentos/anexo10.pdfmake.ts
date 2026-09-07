import { ExpedientePagoDetalle } from '../models/pago.model';

export const TIPO_ANEXO_10 = 'PAG_PENALIDAD_ANEXO10';

const NEGRO = '#000000';

/**
 * Anexo N.° 10 — Determinación de penalidades.
 *
 * RÉPLICA del formato de la Directiva N.° 002-2026-ANIN, página 50: cabecera del
 * contrato, cálculo de la penalidad por mora [A], cálculo de otras penalidades
 * [B], el monto límite penalizable con lo penalizado en pagos anteriores, el
 * total [A+B], observaciones y los tres visados.
 *
 * Los importes salen de lo que ya calculó `pago.paLiquidarExpediente`, que es
 * quien aplica la fórmula de la Directiva: penalidad diaria = 0.10 × monto del
 * entregable ÷ (0.40 × plazo). El PDF no vuelve a calcular nada; si lo hiciera,
 * dos cuentas que dicen lo mismo terminarían diciendo cosas distintas.
 *
 * «Otras penalidades [B]» queda en blanco: son los supuestos del TDR y el
 * sistema no los captura todavía.
 */

export function nombreArchivoAnexo10(detalle: ExpedientePagoDetalle): string {
  return `Anexo 10 - ${detalle.Codigo || 'pago'}.pdf`;
}

export function construirAnexo10(detalle: ExpedientePagoDetalle): any {
  const limite = Number(detalle.MontoContrato || 0) * 0.10;
  const anteriores = Number(detalle.MontoPenalidadAcumulada || 0)
                   - Number(detalle.MontoPenalidad || 0);

  return {
    pageSize: 'A4',
    pageMargins: [48, 44, 48, 44],
    info: {
      title: `Anexo N.° 10 · ${detalle.Codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    footer: (pagina: number, total: number) => ({
      margin: [48, 8, 48, 16],
      text: `Página ${pagina} de ${total}`,
      fontSize: 8,
      alignment: 'right',
      color: NEGRO
    }),
    content: [
      { text: 'ANEXO N° 10', style: 'titulo' },
      { text: 'DETERMINACIÓN DE PENALIDADES', style: 'titulo', margin: [0, 2, 0, 12] },

      {
        table: {
          widths: [120, '*', 120, '*'],
          body: [
            [cabecera('O/S'), celda(detalle.NumeroOrdenSiga),
             cabecera('EXP SIAF'), celda(detalle.ExpedienteSiaf)],
            [cabecera('O/C'), celda(''),
             cabecera('DEC'), celda('')],
            [cabecera('MONTO CONTRATADO'), celda(moneda(detalle.MontoContrato)),
             cabecera('MONTO DEL PAGO'), celda(moneda(detalle.MontoEntregable))],
            [cabecera('NÚMERO DE PAGO'), celda(detalle.NumeroEntregable),
             cabecera('DE'), celda('')],
            [cabecera('DENOMINACIÓN DE LA CONTRATACIÓN'),
             { text: texto(detalle.Denominacion), style: 'valor', colSpan: 3, margin: [3, 4, 3, 4] }, {}, {}],
            [cabecera('RAZÓN SOCIAL (CONTRATISTA)'), celda(detalle.NombreLocador),
             cabecera('RUC'), celda(detalle.RucLocador)]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 14]
      },

      { text: 'CÁLCULO DE LA PENALIDAD POR MORA [A]', style: 'seccion' },
      {
        table: {
          widths: ['*', 130],
          body: [
            [cabecera('PLAZO DEL ENTREGABLE (días calendario)'), celda(detalle.PlazoDias, 'right')],
            [cabecera('FECHA LÍMITE DE PRESENTACIÓN DEL ENTREGABLE'), celda(fecha(detalle.FechaLimiteCronograma), 'right')],
            [cabecera('FECHA EN LA QUE SE PRESENTÓ EL ENTREGABLE'), celda(fecha(detalle.FechaPresentacion), 'right')],
            [cabecera('DÍAS DE RETRASO'), celda(detalle.DiasAtraso || 0, 'right')],
            [cabecera('PENALIDAD POR MORA DIARIA'), celda(moneda(detalle.PenalidadDiaria), 'right')],
            [cabecera('MONTO TOTAL DE PENALIDAD POR MORA'), celda(moneda(detalle.MontoPenalidad), 'right')]
          ]
        },
        layout: marco(),
        margin: [0, 4, 0, 14]
      },

      { text: 'CÁLCULO DE OTRAS PENALIDADES [B]', style: 'seccion' },
      {
        table: {
          widths: ['*', 130],
          body: [
            [cabecera('SUPUESTO APLICABLE SEGÚN TDR/EETT'), celda('')],
            [cabecera('MONTO TOTAL DE OTRAS PENALIDADES'), celda('', 'right')]
          ]
        },
        layout: marco(),
        margin: [0, 4, 0, 14]
      },

      {
        table: {
          widths: ['*', 130],
          body: [
            [cabecera('MONTO LÍMITE PENALIZABLE'), celda(moneda(limite), 'right')],
            [cabecera('MONTO PENALIZADO EN PAGOS ANTERIORES'), celda(moneda(anteriores), 'right')],
            [cabecera('MONTO TOTAL A PENALIZAR [A+B]'), celda(moneda(detalle.MontoPenalidad), 'right')]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 14]
      },

      {
        table: {
          widths: ['*'],
          body: [
            [cabecera('OBSERVACIONES')],
            [{ text: '', style: 'valor', margin: [4, 6, 4, 26] }]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 30]
      },

      {
        columns: [
          { text: 'Responsable de la elaboración', style: 'firma', alignment: 'center' },
          { text: 'Responsable de la DEC', style: 'firma', alignment: 'center' },
          { text: 'Unidad de Abastecimiento', style: 'firma', alignment: 'center' }
        ]
      }
    ],
    styles: {
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 8.5, bold: true, color: NEGRO },
      cabecera: { fontSize: 7.5, bold: true, color: NEGRO },
      valor: { fontSize: 8, color: NEGRO },
      firma: { fontSize: 8, bold: true, color: NEGRO }
    },
    defaultStyle: { fontSize: 8, color: NEGRO }
  };
}

function marco(): any {
  return {
    hLineColor: () => NEGRO,
    vLineColor: () => NEGRO,
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6
  };
}

function cabecera(etiqueta: string): any {
  return { text: etiqueta, style: 'cabecera', margin: [3, 4, 3, 4] };
}

function celda(valor: string | number | null | undefined, alignment: string = 'left'): any {
  return { text: texto(valor), style: 'valor', alignment, margin: [3, 4, 3, 4] };
}

function texto(valor: string | number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

function moneda(valor: number | null | undefined): string {
  const numero = Number(valor || 0);
  return numero
    ? `S/ ${numero.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '';
}

function fecha(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE');
}
