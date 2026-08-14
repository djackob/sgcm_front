import { SolicitudDetalleCmn, ItemSolicitudCmn } from '../models/cmn.model';

/**
 * Anexo N.° 03 — Solicitud de modificación del Cuadro Multianual de Necesidades.
 * Directiva N.° 0007-2025-EF/54.01.
 *
 * Es una función pura: recibe la solicitud y devuelve la definición de pdfmake.
 * No inyecta nada, no llama a nadie y no depende de Angular. Eso permite
 * cambiarle el formato al documento sin tocar la pantalla, y probarlo solo.
 *
 * SOBRE LAS COLUMNAS
 * El formato oficial separa exclusión e inclusión en dos pares de columnas. En
 * el sistema cada ítem lleva UN movimiento (CMN-22), así que la cantidad y el
 * valor se imprimen en el par que corresponde a su TipoMovimiento y el otro
 * queda vacío. Es la misma información, colocada donde el formato la espera.
 */

const GRIS = '#64748b';
const OSCURO = '#1e293b';
const BORDE = '#cbd5e1';

/** Nombre visible del archivo. Lleva el código para que se identifique solo. */
export function nombreArchivoAnexo3(solicitud: SolicitudDetalleCmn): string {
  return `Anexo 3 - ${solicitud.Codigo}.pdf`;
}

export function construirAnexo3(solicitud: SolicitudDetalleCmn): any {
  const anios = [
    solicitud.AnoEje,
    solicitud.AnoEje + 1,
    solicitud.AnoEje + 2,
    solicitud.AnoEje + 3
  ];

  return {
    // Apaisado: el cuadro lleva cuatro años más los pares de exclusión e
    // inclusión, y en vertical las columnas quedan ilegibles.
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 32, 28, 42],
    info: {
      title: `Anexo 3 - ${solicitud.Codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },

    footer: (pagina: number, total: number) => ({
      margin: [28, 8, 28, 0],
      columns: [
        { text: 'Directiva N.° 0007-2025-EF/54.01 · Anexo N.° 03', fontSize: 7, color: GRIS },
        { text: `Página ${pagina} de ${total}`, fontSize: 7, color: GRIS, alignment: 'right' }
      ]
    }),

    content: [
      {
        text: 'ANEXO N.° 03',
        style: 'titulo'
      },
      {
        text: 'SOLICITUD DE MODIFICACIÓN DEL CUADRO MULTIANUAL DE NECESIDADES',
        style: 'subtitulo'
      },

      /* Ficha de cabecera */
      {
        margin: [0, 14, 0, 0],
        table: {
          widths: ['18%', '32%', '18%', '32%'],
          body: [
            [
              { text: 'Entidad', style: 'etiqueta' },
              { text: 'Autoridad Nacional de Infraestructura', style: 'valor' },
              { text: 'N.° de solicitud', style: 'etiqueta' },
              { text: solicitud.Codigo, style: 'valor' }
            ],
            [
              { text: 'Área usuaria', style: 'etiqueta' },
              { text: `${solicitud.CentroCostoNombre || ''} (${solicitud.CentroCosto})`, style: 'valor' },
              { text: 'Fecha de solicitud', style: 'etiqueta' },
              { text: formatearFecha(solicitud.FechaSolicitud), style: 'valor' }
            ],
            [
              { text: 'Responsable', style: 'etiqueta' },
              { text: solicitud.Responsable || '', style: 'valor' },
              { text: 'Año de ejecución', style: 'etiqueta' },
              { text: String(solicitud.AnoEje), style: 'valor' }
            ],
            [
              { text: 'Tipo de operación', style: 'etiqueta' },
              { text: solicitud.TipoOperacion, style: 'valor' },
              { text: 'Tipo de inclusión', style: 'etiqueta' },
              { text: solicitud.TipoInclusion || '—', style: 'valor' }
            ]
          ]
        },
        layout: lineasSuaves()
      },

      /* Sustento */
      { text: 'SUSTENTO DE LA MODIFICACIÓN', style: 'seccion', margin: [0, 16, 0, 4] },
      {
        table: {
          widths: ['*'],
          body: [[{ text: solicitud.Sustento || '', style: 'valor', margin: [4, 4, 4, 4] }]]
        },
        layout: lineasSuaves()
      },

      /* Ítems */
      { text: 'DETALLE DE LA MODIFICACIÓN', style: 'seccion', margin: [0, 16, 0, 4] },
      {
        table: {
          headerRows: 2,
          // Repetir el encabezado en cada página: el cuadro puede tener decenas
          // de ítems y sin esto la segunda página es ilegible.
          widths: [16, 62, '*', 34, 42, 38, 44, 38, 44, 46],
          body: [
            [
              { text: 'N.°', style: 'th', rowSpan: 2 },
              { text: 'Código', style: 'th', rowSpan: 2 },
              { text: 'Descripción', style: 'th', rowSpan: 2 },
              { text: 'UM', style: 'th', rowSpan: 2 },
              { text: 'P. unit. S/', style: 'th', rowSpan: 2 },
              { text: 'EXCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {},
              { text: 'INCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {},
              { text: 'Total S/', style: 'th', rowSpan: 2 }
            ],
            [
              {}, {}, {}, {}, {},
              { text: 'Cantidad', style: 'th' },
              { text: 'Valor S/', style: 'th' },
              { text: 'Cantidad', style: 'th' },
              { text: 'Valor S/', style: 'th' },
              {}
            ],
            ...(solicitud.Items || []).map((item, i) => filaItem(item, i))
          ]
        },
        layout: lineasSuaves()
      },

      /* Totales por año: lo que la Directiva pide ver del multianual */
      { text: 'RESUMEN MULTIANUAL', style: 'seccion', margin: [0, 14, 0, 4] },
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            anios.map(a => ({ text: String(a), style: 'th', alignment: 'center' })),
            [0, 1, 2, 3].map(i => ({
              text: 'S/ ' + numero(totalAnio(solicitud.Items || [], i)),
              style: 'valor',
              alignment: 'center'
            }))
          ]
        },
        layout: lineasSuaves()
      },

      /* Firma. Un solo firmante en el Anexo 3: el responsable del área usuaria
         (CMN-24). El Anexo 4 lleva dos y por eso tiene su propia plantilla. */
      {
        margin: [0, 40, 0, 0],
        columns: [
          { text: '' },
          {
            width: 240,
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 240, y2: 0, lineWidth: 0.7, lineColor: OSCURO }] },
              { text: solicitud.Responsable || '', style: 'firmaNombre' },
              { text: 'Responsable del Área usuaria', style: 'firmaCargo' },
              { text: solicitud.CentroCostoNombre || '', style: 'firmaCargo' }
            ]
          },
          { text: '' }
        ]
      }
    ],

    styles: {
      titulo:    { fontSize: 14, bold: true, alignment: 'center', color: OSCURO },
      subtitulo: { fontSize: 10, bold: true, alignment: 'center', color: OSCURO, margin: [0, 4, 0, 0] },
      seccion:   { fontSize: 9, bold: true, color: OSCURO },
      etiqueta:  { fontSize: 8, bold: true, color: GRIS, margin: [4, 3, 4, 3] },
      valor:     { fontSize: 8, color: OSCURO, margin: [4, 3, 4, 3] },
      th:        { fontSize: 7.5, bold: true, color: OSCURO, margin: [2, 4, 2, 4] },
      td:        { fontSize: 7.5, color: OSCURO, margin: [2, 3, 2, 3] },
      firmaNombre: { fontSize: 8, bold: true, alignment: 'center', margin: [0, 4, 0, 0] },
      firmaCargo:  { fontSize: 7.5, color: GRIS, alignment: 'center' }
    },

    defaultStyle: { font: 'Roboto' }
  };
}

/* -------------------------------------------------------------------------- */

function filaItem(item: ItemSolicitudCmn, indice: number): any[] {
  const esExclusion = item.TipoMovimiento === 'EXCLUSION';
  const cantidad = numero(item.CantidadTotal);
  const monto = numero(item.MontoTotal);

  return [
    { text: String(indice + 1), style: 'td', alignment: 'center' },
    { text: item.CodigoItem || '', style: 'td' },
    { text: item.Descripcion || '', style: 'td' },
    { text: item.UnidadAbreviatura || '', style: 'td', alignment: 'center' },
    { text: numero(item.PrecioUnitario), style: 'td', alignment: 'right' },
    { text: esExclusion ? cantidad : '', style: 'td', alignment: 'right' },
    { text: esExclusion ? monto : '', style: 'td', alignment: 'right' },
    { text: esExclusion ? '' : cantidad, style: 'td', alignment: 'right' },
    { text: esExclusion ? '' : monto, style: 'td', alignment: 'right' },
    { text: monto, style: 'td', alignment: 'right', bold: true }
  ];
}

function totalAnio(items: ItemSolicitudCmn[], indice: number): number {
  const campos: Array<keyof ItemSolicitudCmn> = ['MontoAno0', 'MontoAno1', 'MontoAno2', 'MontoAno3'];
  return items.reduce((suma, item) => suma + (Number(item[campos[indice]]) || 0), 0);
}

function numero(valor: number | null | undefined): string {
  return (Number(valor) || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return '';
  const d = new Date(valor);
  return isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString('es-PE');
}

/** Rejilla discreta: el formato oficial es una tabla, no una cuadrícula negra. */
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
