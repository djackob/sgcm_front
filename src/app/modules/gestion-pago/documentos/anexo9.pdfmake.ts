import { ChecklistPago, ExpedientePagoDetalle } from '../models/pago.model';

export const TIPO_ANEXO_9 = 'PAG_CHECKLIST_ANEXO9';

const NEGRO = '#000000';

/**
 * Anexo N.° 9 — Check list de control de pagos.
 *
 * RÉPLICA del formato de la Directiva N.° 002-2026-ANIN, páginas 48 y 49: la
 * cabecera del expediente, las doce filas del check list más la de servicios
 * básicos, las observaciones y los dos visados. Las columnas son las tres del
 * formato: SÍ, NO y No aplica.
 *
 * EL MAPA CON NUESTRO CHECKLIST
 * `pago.ChecklistItem` tiene diez ítems y la Directiva trece filas: no son la
 * misma lista. Los que sí se corresponden se marcan con lo que registró la DEC;
 * los que la Directiva pide y nosotros no capturamos salen en blanco, para que
 * se completen a mano, que es exactamente lo que pasa hoy con el formato en
 * papel. Inventar una marca sería peor que dejar la casilla vacía.
 */

/** Fila del formato → código de nuestro checklist, cuando hay equivalencia. */
const MAPA: { [orden: number]: string } = {
  1: 'OS',
  3: 'PENALIDAD_A10',
  4: 'RHE',
  6: 'SUSP_4TA',
  7: 'CCI',
  8: 'RNP',
  9: 'ACTA_A11',
  10: 'ENTREGABLE',
  11: 'CRONOGRAMA'
};

const FILAS: { orden: string; texto: string }[] = [
  { orden: '1', texto: 'OS/OC + Notificación o Contrato' },
  { orden: '2', texto: 'Hoja de liquidación de pagos periódicos' },
  { orden: '3', texto: 'Anexo de Determinación de Penalidades' },
  { orden: '4', texto: 'Comprobante de pago [SUNAT]' },
  { orden: '5', texto: 'Guía de Remisión [con firma y sello de Almacén]' },
  { orden: '6', texto: 'Suspensión de Retenciones de 4ta Categoría' },
  { orden: '7*', texto: 'Consulta de Código de Cuenta Interbancaria [CCI]' },
  { orden: '8*', texto: 'Consulta RUC y RNP' },
  { orden: '9', texto: 'Anexo de Conformidad y documento que la traslada' },
  { orden: '10', texto: 'Entregable y Hoja de Trámite [HT]' },
  { orden: '11*', texto: 'Certificado de Crédito Presupuestario [CCP]' },
  { orden: '12', texto: 'Términos de Referencia [TDR] o Especificaciones Técnicas [EETT]' }
];

export function nombreArchivoAnexo9(detalle: ExpedientePagoDetalle): string {
  return `Anexo 9 - ${detalle.Codigo || 'pago'}.pdf`;
}

export function construirAnexo9(detalle: ExpedientePagoDetalle,
                                checklist: ChecklistPago[]): any {
  const marcas = new Map<string, string>();
  (checklist || []).forEach(c => marcas.set(c.CodigoItem, String(c.Valor || '')));

  const cuerpo: any[] = [
    [
      cabecera('N°'),
      cabecera('TIPO DE DOCUMENTO'),
      { text: '¿Obra en el Expediente?', style: 'cabecera', colSpan: 3, alignment: 'center', margin: [3, 4, 3, 4] },
      {}, {}
    ],
    [
      {}, {},
      cabecera('SÍ', 'center'), cabecera('NO', 'center'), cabecera('No aplica', 'center')
    ]
  ];

  FILAS.forEach((f, i) => {
    const valor = marcas.get(MAPA[i + 1]) || '';
    cuerpo.push([
      celda(f.orden, 'center'),
      celda(f.texto),
      celda(valor === 'SI' ? 'X' : '', 'center'),
      celda(valor === 'NO' ? 'X' : '', 'center'),
      celda(valor === 'NO_APLICA' ? 'X' : '', 'center')
    ]);
  });

  cuerpo.push([
    { text: 'SERVICIOS BÁSICOS', style: 'cabecera', colSpan: 5, margin: [3, 4, 3, 4] },
    {}, {}, {}, {}
  ]);
  cuerpo.push([
    celda('13', 'center'),
    celda('Recibo de Servicios Básicos'),
    celda(''), celda(''), celda('')
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [48, 44, 48, 44],
    info: {
      title: `Anexo N.° 9 · ${detalle.Codigo}`,
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
      { text: 'ANEXO N° 9', style: 'titulo' },
      { text: 'CHECK LIST DE CONTROL DE PAGOS', style: 'titulo', margin: [0, 2, 0, 12] },

      {
        table: {
          widths: [130, '*', 90, '*'],
          body: [
            [cabecera('N° DE EXPEDIENTE SGD'), celda(detalle.Codigo),
             cabecera('DEC'), celda('')],
            [cabecera('FECHA DE ATENCIÓN'), celda(hoy()),
             cabecera('EXP. SIAF N°'), celda(detalle.ExpedienteSiaf)],
            [cabecera('OS'), celda(detalle.NumeroOrdenSiga),
             cabecera('OC'), celda('')],
            [cabecera('PAGO N°'), celda(detalle.NumeroEntregable),
             cabecera('MONTO A PAGAR'), celda(moneda(detalle.MontoEntregable))],
            [cabecera('RAZÓN SOCIAL (CONTRATISTA)'), celda(detalle.NombreLocador),
             cabecera('RUC'), celda(detalle.RucLocador)]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 12]
      },

      {
        table: { widths: [26, '*', 34, 34, 50], body: cuerpo },
        layout: marco()
      },

      {
        table: {
          widths: ['*'],
          body: [
            [cabecera('OBSERVACIONES')],
            [{ text: texto(detalle.ObservacionUc), style: 'valor', margin: [4, 6, 4, 30] }]
          ]
        },
        layout: marco(),
        margin: [0, 12, 0, 30]
      },

      {
        columns: [
          { text: 'UNIDAD DE ABASTECIMIENTO', style: 'firma', alignment: 'center' },
          { text: 'UNIDAD DE CONTABILIDAD', style: 'firma', alignment: 'center' }
        ]
      }
    ],
    styles: {
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
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

function cabecera(etiqueta: string, alignment: string = 'left'): any {
  return { text: etiqueta, style: 'cabecera', alignment, margin: [3, 4, 3, 4] };
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

function hoy(): string {
  return new Date().toLocaleDateString('es-PE');
}
