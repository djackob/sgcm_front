import {
  PaqueteAnexo4Cmn,
  SolicitudDelPaqueteCmn,
  ItemSolicitudCmn
} from '../models/cmn.model';

/**
 * Anexo N.° 04 — Aprobación de modificaciones del Cuadro Multianual de Necesidades.
 * Directiva N.° 0007-2025-EF/54.01.
 *
 * UN ANEXO 4 CUBRE VARIOS ANEXOS 3
 * El documento se arma a partir del paquete (`cmn.Paquete`), no de una
 * solicitud: el especialista de Abastecimiento marca uno o varios Anexos 3 ya
 * aprobados —que pueden ser de áreas usuarias distintas— y todos entran en el
 * mismo Anexo 4.
 *
 * Por eso la tabla repite «Fecha de solicitud» y «N.° de Solicitud de
 * Modificación» al empezar cada bloque y trae además el área usuaria: sin esa
 * columna, un Anexo 4 con ítems de cuatro oficinas sería una lista plana en la
 * que nadie podría reconocer lo suyo. Las columnas de fecha y número ya estaban
 * en el formato oficial justamente porque el Anexo 4 siempre pudo consolidar.
 */

const GRIS = '#64748b';
const OSCURO = '#1e293b';
const BORDE = '#cbd5e1';
const FONDO_GRUPO = '#f1f5f9';

export function nombreArchivoAnexo4(paquete: PaqueteAnexo4Cmn): string {
  return `Anexo 4 - ${paquete.Codigo}.pdf`;
}

export function construirAnexo4(paquete: PaqueteAnexo4Cmn): any {
  const solicitudes = paquete.Solicitudes || [];
  const numeroAnexo = (paquete.Codigo || '').replace(/^A4-/, '') || paquete.Codigo || '';
  const consolidado = solicitudes.length > 1;

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 32, 28, 42],
    info: {
      title: `Anexo 4 - ${paquete.Codigo}`,
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
          widths: ['22%', '28%', '22%', '28%'],
          body: [
            [
              { text: 'Entidad del Sector Público', style: 'etiqueta' },
              { text: 'Autoridad Nacional de Infraestructura', style: 'valor' },
              { text: 'Nro de Identificación', style: 'etiqueta' },
              { text: 'ANIN', style: 'valor' }
            ],
            [
              { text: 'Ejercicio', style: 'etiqueta' },
              { text: String(paquete.AnoEje || ''), style: 'valor' },
              { text: 'Tipo de modificación', style: 'etiqueta' },
              {
                text: paquete.TipoInclusion === 'EXTRAORDINARIA' ? 'Extraordinaria' : 'Ordinaria',
                style: 'valor'
              }
            ],
            [
              { text: 'Solicitudes que comprende', style: 'etiqueta' },
              {
                text: consolidado
                  ? `${paquete.TotalSolicitudes} Anexos N.° 03 de ${areasDistintas(solicitudes)} área(s) usuaria(s)`
                  : '1 Anexo N.° 03',
                style: 'valor'
              },
              { text: 'Ítems comprendidos', style: 'etiqueta' },
              { text: String(paquete.TotalItems ?? 0), style: 'valor' }
            ]
          ]
        },
        layout: lineasSuaves()
      },
      {
        margin: [0, 14, 0, 0],
        table: {
          headerRows: 3,
          widths: [58, 66, 78, 56, '*', 36, 46, 50, 46, 50],
          body: [
            [
              { text: 'Fecha de solicitud', style: 'th', rowSpan: 3 },
              { text: 'N.° de Solicitud de Modificación', style: 'th', rowSpan: 3 },
              { text: 'Área usuaria', style: 'th', rowSpan: 3 },
              { text: 'Código Ítem N.°', style: 'th', rowSpan: 3 },
              { text: 'Descripción del ítem', style: 'th', rowSpan: 3 },
              { text: 'Unidad de Medida', style: 'th', rowSpan: 3 },
              { text: 'CANTIDAD Y/O VALORES', style: 'th', colSpan: 4, alignment: 'center' },
              {}, {}, {}
            ],
            [
              {}, {}, {}, {}, {}, {},
              { text: 'EXCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {},
              { text: 'INCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {}
            ],
            [
              {}, {}, {}, {}, {}, {},
              { text: 'Cantidad Total', style: 'th' },
              { text: 'Valor Total S/', style: 'th' },
              { text: 'Cantidad Total', style: 'th' },
              { text: 'Valor Total S/', style: 'th' }
            ],
            ...filasDelPaquete(solicitudes)
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

      /* Dos espacios de firma: a la izquierda el jefe y a la derecha el
         encargado de la Unidad de Abastecimiento. */
      {
        margin: [0, 34, 0, 0],
        columns: [
          bloqueFirma('Firma', 'Jefe de la Unidad de Abastecimiento'),
          bloqueFirma('Firma', 'Encargado de la Unidad de Abastecimiento')
        ]
      },
      {
        margin: [0, 18, 0, 0],
        text: `Anexo N.° 04 ${paquete.Codigo} generado por ${paquete.GeneradoPor || ''} · ${formatearFecha(paquete.FechaGeneracion)}`,
        style: 'nota',
        alignment: 'center'
      }
    ],

    styles: {
      titulo: { fontSize: 11, bold: true, alignment: 'center', color: OSCURO },
      etiqueta: { fontSize: 8, bold: true, color: GRIS, margin: [4, 3, 4, 3] },
      valor: { fontSize: 8, color: OSCURO, margin: [4, 3, 4, 3] },
      th: { fontSize: 7, bold: true, color: OSCURO, margin: [2, 3, 2, 3] },
      td: { fontSize: 7.5, color: OSCURO, margin: [2, 3, 2, 3] },
      grupo: { fontSize: 7.5, bold: true, color: OSCURO, margin: [3, 3, 3, 3] },
      subtotal: { fontSize: 7.5, bold: true, color: OSCURO, margin: [2, 3, 2, 3] },
      nota: { fontSize: 7.5, color: OSCURO, margin: [0, 2, 0, 0] },
      firmaEtiqueta: { fontSize: 8, bold: true, color: OSCURO, alignment: 'center', margin: [8, 0, 8, 4] },
      firmaCargo: { fontSize: 7.5, color: GRIS, alignment: 'center', margin: [8, 6, 8, 0] }
    },

    defaultStyle: { font: 'Roboto' }
  };
}

/**
 * Las filas de todos los Anexos 3, en bloques.
 *
 * Cada bloque abre con una banda que nombra el área usuaria y su Anexo 3, y
 * cierra con el subtotal de ese bloque. La banda existe porque el área usuaria
 * que recibe el Anexo 4 tiene que poder encontrar su parte de un vistazo, y el
 * subtotal porque es lo que va a comparar contra su Anexo 3.
 *
 * Con un solo Anexo 3 no se imprime ninguna de las dos: el documento es igual al
 * de antes y agregar una banda de grupo sobre un único grupo es ruido.
 */
function filasDelPaquete(solicitudes: SolicitudDelPaqueteCmn[]): any[] {
  const consolidado = solicitudes.length > 1;
  const filas: any[] = [];

  solicitudes.forEach(solicitud => {
    const items = solicitud.Items || [];

    if (consolidado) {
      filas.push([
        {
          text: `${solicitud.SiglaArea || solicitud.AreaUsuaria || ''} — ${solicitud.AreaUsuaria || ''} · Anexo N.° 03 ${solicitud.Codigo} · Centro de costo ${solicitud.CentroCosto || ''}`,
          style: 'grupo',
          colSpan: 10,
          fillColor: FONDO_GRUPO
        },
        {}, {}, {}, {}, {}, {}, {}, {}, {}
      ]);
    }

    items.forEach((item, i) => filas.push(filaItem(item, solicitud, i === 0)));

    if (consolidado) {
      filas.push(filaSubtotal(items, solicitud));
    }
  });

  return filas;
}

function filaItem(item: ItemSolicitudCmn, solicitud: SolicitudDelPaqueteCmn, esPrimero: boolean): any[] {
  const exclusion = (item.TipoMovimiento || '').toUpperCase() === 'EXCLUSION';
  const cant = esBien(item) ? numero(cantidadDe(item)) : '';
  const val = numero(montoDe(item));

  return [
    { text: esPrimero ? formatearFecha(solicitud.FechaSolicitud) : '', style: 'td', alignment: 'center' },
    { text: esPrimero ? (solicitud.Codigo || '') : '', style: 'td', alignment: 'center' },
    { text: esPrimero ? (solicitud.SiglaArea || solicitud.AreaUsuaria || '') : '', style: 'td', alignment: 'center' },
    { text: item.CodigoItem || '', style: 'td', alignment: 'center' },
    { text: item.Descripcion || '', style: 'td' },
    { text: item.UnidadAbreviatura || '', style: 'td', alignment: 'center' },
    { text: exclusion ? cant : '', style: 'td', alignment: 'right' },
    { text: exclusion ? val : '', style: 'td', alignment: 'right' },
    { text: exclusion ? '' : cant, style: 'td', alignment: 'right' },
    { text: exclusion ? '' : val, style: 'td', alignment: 'right' }
  ];
}

function filaSubtotal(items: ItemSolicitudCmn[], solicitud: SolicitudDelPaqueteCmn): any[] {
  const suma = (filtro: (i: ItemSolicitudCmn) => boolean, valor: (i: ItemSolicitudCmn) => number) =>
    items.filter(filtro).reduce((acc, i) => acc + valor(i), 0);

  const esExclusion = (i: ItemSolicitudCmn) => (i.TipoMovimiento || '').toUpperCase() === 'EXCLUSION';
  const esInclusion = (i: ItemSolicitudCmn) => !esExclusion(i);

  return [
    { text: `Subtotal ${solicitud.Codigo}`, style: 'subtotal', colSpan: 6, alignment: 'right' },
    {}, {}, {}, {}, {},
    { text: numero(suma(i => esExclusion(i) && esBien(i), cantidadDe)), style: 'subtotal', alignment: 'right' },
    { text: numero(suma(esExclusion, montoDe)), style: 'subtotal', alignment: 'right' },
    { text: numero(suma(i => esInclusion(i) && esBien(i), cantidadDe)), style: 'subtotal', alignment: 'right' },
    { text: numero(suma(esInclusion, montoDe)), style: 'subtotal', alignment: 'right' }
  ];
}

function bloqueFirma(etiqueta: string, cargo: string): any {
  return {
    width: '*',
    stack: [
      { text: etiqueta, style: 'firmaEtiqueta' },
      { canvas: [{ type: 'line', x1: 12, y1: 0, x2: 200, y2: 0, lineWidth: 0.7, lineColor: OSCURO }] },
      { text: cargo, style: 'firmaCargo' }
    ]
  };
}

function areasDistintas(solicitudes: SolicitudDelPaqueteCmn[]): number {
  return new Set(solicitudes.map(s => s.AreaUsuaria || s.CentroCosto)).size;
}

/** El total ya viene calculado; la suma por año es el respaldo si no viniera. */
function cantidadDe(item: ItemSolicitudCmn): number {
  return Number(item.CantidadTotal)
    || [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
}

function montoDe(item: ItemSolicitudCmn): number {
  return Number(item.MontoTotal)
    || [item.MontoAno0, item.MontoAno1, item.MontoAno2, item.MontoAno3]
      .reduce((acc, n) => acc + (Number(n) || 0), 0);
}

/** La nota 3/ del formato: la cantidad total sólo se completa para bienes. */
function esBien(item: ItemSolicitudCmn): boolean {
  const tipo = (item.TipoBien || '').toUpperCase();
  return tipo !== 'S' && tipo !== 'O';
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
