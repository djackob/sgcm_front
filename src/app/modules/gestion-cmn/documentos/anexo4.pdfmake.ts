import { SolicitudDetalleCmn, ItemSolicitudCmn } from '../models/cmn.model';

/**
 * Anexo N.° 04 — Aprobación de modificaciones del Cuadro Multianual de Necesidades.
 * Directiva N.° 0007-2025-EF/54.01.
 */

const GRIS = '#64748b';
const OSCURO = '#1e293b';
const BORDE = '#cbd5e1';

export function nombreArchivoAnexo4(solicitud: SolicitudDetalleCmn): string {
  return `Anexo 4 - ${solicitud.Codigo}.pdf`;
}

export function construirAnexo4(solicitud: SolicitudDetalleCmn): any {
  const items = solicitud.Items || [];
  const numeroAnexo = (solicitud.Codigo || '').replace(/^CMN-/, '') || solicitud.Codigo || '';

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 32, 28, 42],
    info: {
      title: `Anexo 4 - ${solicitud.Codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },

    footer: (pagina: number, total: number) => ({
      margin: [28, 8, 28, 0],
      columns: [
        { text: 'Directiva N.° 0007-2025-EF/54.01 · Anexo N.° 04', fontSize: 7, color: GRIS },
        { text: `Página ${pagina} de ${total}`, fontSize: 7, color: GRIS, alignment: 'right' }
      ]
    }),

    content: [
      {
        text: `ANEXO N.° 04: APROBACIÓN DE MODIFICACIONES AL CUADRO MULTIANUAL DE NECESIDADES N.° ${numeroAnexo}`,
        style: 'titulo'
      },
      {
        margin: [0, 12, 0, 0],
        table: {
          widths: ['28%', '72%'],
          body: [
            [
              { text: 'Entidad del Sector Público', style: 'etiqueta' },
              { text: 'Autoridad Nacional de Infraestructura', style: 'valor' }
            ],
            [
              { text: 'Nro de Identificación', style: 'etiqueta' },
              { text: 'ANIN', style: 'valor' }
            ]
          ]
        },
        layout: lineasSuaves()
      },
      {
        margin: [0, 14, 0, 0],
        table: {
          headerRows: 3,
          widths: [70, 70, 62, '*', 40, 50, 55, 50, 55],
          body: [
            [
              { text: 'Fecha de solicitud', style: 'th', rowSpan: 3 },
              { text: 'N.° de Solicitud de Modificación', style: 'th', rowSpan: 3 },
              { text: 'Código Ítem N.°', style: 'th', rowSpan: 3 },
              { text: 'Descripción del ítem', style: 'th', rowSpan: 3 },
              { text: 'Unidad de Medida', style: 'th', rowSpan: 3 },
              { text: 'CANTIDAD Y/O VALORES', style: 'th', colSpan: 4, alignment: 'center' },
              {}, {}, {}
            ],
            [
              {}, {}, {}, {}, {},
              { text: 'EXCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {},
              { text: 'INCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {}
            ],
            [
              {}, {}, {}, {}, {},
              { text: 'Cantidad Total', style: 'th' },
              { text: 'Valor Total S/', style: 'th' },
              { text: 'Cantidad Total', style: 'th' },
              { text: 'Valor Total S/', style: 'th' }
            ],
            ...items.map((item, i) => filaItem(item, solicitud, i === 0))
          ]
        },
        layout: lineasSuaves()
      },
      {
        margin: [0, 14, 0, 0],
        stack: [
          { text: '1/ La información registrada en el presente Anexo corresponde a campos mínimos y obligatorios que pueden ser ampliados por la Entidad del Sector Público.', style: 'nota' },
          { text: '2/ La información registrada en los campos de “exclusión” e “inclusión” considera la cantidad y/o valor acumulado de todos los años de la programación.', style: 'nota' },
          { text: '3/ El campo de “cantidad total” se completa solo en el caso de bienes.', style: 'nota' },
          { text: '4/ La presente información tiene carácter de Declaración Jurada; por lo que, en señal de conformidad y en representación de la Entidad del Sector Público, se suscribe:', style: 'nota' }
        ]
      },
      {
        margin: [0, 36, 0, 0],
        columns: [
          {
            width: '*',
            stack: [
              { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 260, y2: 0, lineWidth: 0.7, lineColor: OSCURO }] },
              { text: 'Firma 1: Responsable de la Oficina de Abastecimiento', style: 'firmaCargo' }
            ]
          },
          {
            width: '*',
            stack: [
              { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 260, y2: 0, lineWidth: 0.7, lineColor: OSCURO }] },
              { text: 'Firma 2: Máxima autoridad administrativa de la Entidad del Sector Público, o a quien se hubiera delegado dicha facultad', style: 'firmaCargo' }
            ]
          }
        ]
      }
    ],

    styles: {
      titulo: { fontSize: 11, bold: true, alignment: 'center', color: OSCURO },
      etiqueta: { fontSize: 8, bold: true, color: GRIS, margin: [4, 3, 4, 3] },
      valor: { fontSize: 8, color: OSCURO, margin: [4, 3, 4, 3] },
      th: { fontSize: 7, bold: true, color: OSCURO, margin: [2, 3, 2, 3] },
      td: { fontSize: 7.5, color: OSCURO, margin: [2, 3, 2, 3] },
      nota: { fontSize: 7.5, color: OSCURO, margin: [0, 2, 0, 0] },
      firmaCargo: { fontSize: 7.5, color: GRIS, alignment: 'center', margin: [8, 6, 8, 0] }
    },

    defaultStyle: { font: 'Roboto' }
  };
}

function filaItem(item: ItemSolicitudCmn, solicitud: SolicitudDetalleCmn, esPrimero: boolean): any[] {
  const exclusion = (item.TipoMovimiento || '').toUpperCase() === 'EXCLUSION';
  const cantidad = Number(item.CantidadTotal)
    || [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
  const valor = Number(item.MontoTotal)
    || [item.MontoAno0, item.MontoAno1, item.MontoAno2, item.MontoAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
  const esBien = (item.TipoBien || '').toUpperCase() !== 'S'
    && (item.TipoBien || '').toUpperCase() !== 'O';
  const cant = esBien ? numero(cantidad) : '';
  const val = numero(valor);

  return [
    { text: esPrimero ? formatearFecha(solicitud.FechaSolicitud) : '', style: 'td', alignment: 'center' },
    { text: esPrimero ? (solicitud.Codigo || '') : '', style: 'td', alignment: 'center' },
    { text: item.CodigoItem || '', style: 'td', alignment: 'center' },
    { text: item.Descripcion || '', style: 'td' },
    { text: item.UnidadAbreviatura || '', style: 'td', alignment: 'center' },
    { text: exclusion ? cant : '', style: 'td', alignment: 'right' },
    { text: exclusion ? val : '', style: 'td', alignment: 'right' },
    { text: exclusion ? '' : cant, style: 'td', alignment: 'right' },
    { text: exclusion ? '' : val, style: 'td', alignment: 'right' }
  ];
}

function numero(valor: number | null | undefined): string {
  const n = Number(valor);
  if (!Number.isFinite(n) || n === 0) {
    return '';
  }
  return n.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatearFecha(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const d = new Date(valor);
  return isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString('es-PE');
}

function lineasSuaves(): any {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => BORDE,
    vLineColor: () => BORDE,
    paddingTop: () => 1,
    paddingBottom: () => 1
  };
}
