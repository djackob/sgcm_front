import { ItemSolicitudCmn, SolicitudDetalleCmn } from '../models/cmn.model';

/**
 * Anexo N.º 03 — formato oficial de la Directiva (MEF).
 * Réplica fiel del formulario: encabezado, tabla ITEM / CANTIDAD Y/O VALORES,
 * sustento, notas 1–4 y firma del responsable del área usuaria.
 */

const NEGRO = '#000000';

/** Nombre visible del archivo. Lleva el código para que se identifique solo. */
export function nombreArchivoAnexo3(solicitud: SolicitudDetalleCmn): string {
  return `Anexo 3 - ${solicitud.Codigo}.pdf`;
}

export function construirAnexo3(solicitud: SolicitudDetalleCmn): any {
  const ahora = new Date();
  const items = solicitud.Items || [];
  const numeroAnexo = (solicitud.Codigo || '').replace(/^CMN-/, '') || solicitud.Codigo || '';
  const area = [solicitud.CentroCostoNombre, solicitud.CentroCosto]
    .filter(x => !!x)
    .join(' — ');
  const anios = aniosConMovimiento(items, solicitud.AnoEje || ahora.getFullYear());
  const fechaImpresion = fechaGuion(ahora);
  const horaImpresion = horaAmPm(ahora);

  const filasDatos = items.map(item => filaItem(item));

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [36, 64, 36, 86],
    info: {
      title: `Anexo N.º 03 · ${solicitud.Codigo}`,
      author: 'Autoridad Nacional de Infraestructura'
    },

    header: (pagina: number, total: number) => ({
      margin: [36, 24, 36, 0],
      columns: [
        { text: '' },
        {
          width: 'auto',
          alignment: 'right',
          fontSize: 9,
          lineHeight: 1.35,
          color: NEGRO,
          stack: [
            { text: `Fecha: ${fechaImpresion}` },
            { text: `Hora: ${horaImpresion}` },
            { text: `Página: ${pagina}/${total}` }
          ]
        }
      ]
    }),

    footer: (pagina: number, total: number) => {
      if (pagina !== total) {
        return { text: '' };
      }
      return {
        margin: [36, 8, 36, 20],
        columns: [
          { text: '' },
          {
            width: 220,
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.8, lineColor: NEGRO }] },
              { text: 'Firma: Responsable del Área usuaria', style: 'firma', margin: [0, 6, 0, 0] },
              solicitud.Responsable
                ? { text: solicitud.Responsable, style: 'firmaNombre', margin: [0, 3, 0, 0] }
                : {}
            ]
          }
        ]
      };
    },

    content: [
      {
        text: `ANEXO Nº 03: SOLICITUD DE MODIFICACIÓN DEL CUADRO MULTIANUAL DE NECESIDADES Nº ${numeroAnexo}`,
        style: 'titulo',
        margin: [0, 0, 0, 12]
      },
      {
        text: [
          { text: 'Área usuaria: ', bold: true },
          area
        ],
        style: 'campo',
        margin: [0, 0, 0, 2]
      },
      {
        text: [
          { text: 'Fecha: ', bold: true },
          fechaGuion(solicitud.FechaSolicitud)
        ],
        style: 'campo',
        margin: [0, 0, 0, 8]
      },

      {
        table: {
          headerRows: 3,
          widths: ['12%', '38%', '12%', '9.5%', '9.5%', '9.5%', '9.5%'],
          body: [
            [
              { text: 'ITEM', style: 'th', colSpan: 3, alignment: 'center' }, {}, {},
              { text: 'CANTIDAD Y/O VALORES', style: 'th', colSpan: 4, alignment: 'center' }, {}, {}, {}
            ],
            [
              { text: 'Código', style: 'th', rowSpan: 2 },
              { text: 'Descripción', style: 'th', rowSpan: 2 },
              { text: 'Unidad de Medida', style: 'th', rowSpan: 2 },
              { text: 'EXCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {},
              { text: 'INCLUSIÓN', style: 'th', colSpan: 2, alignment: 'center' }, {}
            ],
            [
              {}, {}, {},
              { text: 'Cantidad Total', style: 'th' },
              { text: 'Valor Total S/', style: 'th' },
              { text: 'Cantidad Total', style: 'th' },
              { text: 'Valor Total S/', style: 'th' }
            ],
            ...filasDatos
          ]
        },
        layout: rejillaOficial()
      },

      {
        margin: [0, 10, 0, 0],
        stack: [
          lineaSustento(
            'Sustento para la aprobación de modificaciones del CMN, al día hábil siguiente de su presentación (numeral 32.7 del artículo 32 de la Directiva):',
            solicitud.Sustento || ''
          ),
          lineaSustento(
            'De ser el caso, indicar el/los año(s) que corresponda(n) realizar la inclusión o exclusión de la programación',
            anios
          ),
          { text: '1/ La información registrada en el presente Anexo corresponde a campos mínimos y obligatorios que pueden ser ampliados por la Entidad del Sector Público.', style: 'nota' },
          { text: '2/ La información registrada en los campos de "exclusión" e "inclusión" considera la cantidad y/o valor acumulado de todos los años de la programación.', style: 'nota' },
          { text: '3/ El campo de "cantidad total" se completa solo en el caso de bienes.', style: 'nota' },
          { text: '4/ La presente información tiene carácter de Declaración Jurada; por lo que, en señal de conformidad y en representación del Área usuaria, se suscribe:', style: 'nota' }
        ]
      }
    ],

    styles: {
      titulo: { fontSize: 11, bold: true, alignment: 'center', color: NEGRO },
      campo: { fontSize: 10, color: NEGRO },
      th: { fontSize: 9, bold: true, color: NEGRO, margin: [2, 3, 2, 3] },
      td: { fontSize: 9, color: NEGRO, margin: [2, 4, 2, 4] },
      nota: { fontSize: 9, color: NEGRO, margin: [0, 0, 0, 4], lineHeight: 1.3 },
      firma: { fontSize: 10, alignment: 'center', color: NEGRO },
      firmaNombre: { fontSize: 9, alignment: 'center', color: NEGRO }
    },

    defaultStyle: { font: 'Roboto' }
  };
}

/* -------------------------------------------------------------------------- */

function filaItem(item: ItemSolicitudCmn): any[] {
  const exclusion = esExclusion(item.TipoMovimiento);
  const cantidad = totalCantidad(item);
  const valor = totalValor(item);
  const esBien = (item.TipoBien || '').toUpperCase() === 'B';
  const cant = esBien ? numero(cantidad) : '';
  const val = numero(valor);

  return [
    { text: item.CodigoItem || '', style: 'td', alignment: 'center' },
    { text: item.Descripcion || '', style: 'td' },
    { text: item.UnidadAbreviatura || '', style: 'td', alignment: 'center' },
    { text: exclusion ? cant : '', style: 'td', alignment: 'right' },
    { text: exclusion ? val : '', style: 'td', alignment: 'right' },
    { text: exclusion ? '' : cant, style: 'td', alignment: 'right' },
    { text: exclusion ? '' : val, style: 'td', alignment: 'right' }
  ];
}

function lineaSustento(etiqueta: string, valor: string): any {
  return {
    margin: [0, 0, 0, 6],
    fontSize: 9,
    lineHeight: 1.35,
    stack: [
      { text: etiqueta, color: NEGRO },
      {
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 770,
          y2: 0,
          lineWidth: 0.5,
          dash: { length: 2, space: 2 },
          lineColor: NEGRO
        }],
        margin: [0, 1, 0, 0]
      },
      valor
        ? { text: valor, fontSize: 9, color: NEGRO, margin: [0, 2, 0, 0] }
        : { text: ' ', fontSize: 9, margin: [0, 2, 0, 0] }
    ]
  };
}

function esExclusion(tipo: string): boolean {
  return (tipo || '').toUpperCase() === 'EXCLUSION';
}

function totalCantidad(item: ItemSolicitudCmn): number {
  const total = Number(item.CantidadTotal);
  if (total > 0) {
    return total;
  }
  return [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3]
    .reduce((acc, n) => acc + (Number(n) || 0), 0);
}

function totalValor(item: ItemSolicitudCmn): number {
  const total = Number(item.MontoTotal);
  if (total > 0) {
    return total;
  }
  return [item.MontoAno0, item.MontoAno1, item.MontoAno2, item.MontoAno3]
    .reduce((acc, n) => acc + (Number(n) || 0), 0);
}

function aniosConMovimiento(items: ItemSolicitudCmn[], anoEje: number): string {
  const anios = new Set<number>();
  for (const item of items) {
    [item.CantidadAno0, item.CantidadAno1, item.CantidadAno2, item.CantidadAno3]
      .forEach((cantidad, indice) => {
        if (Number(cantidad) > 0) {
          anios.add(anoEje + indice);
        }
      });
  }
  return [...anios].sort((a, b) => a - b).join(', ');
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

function fechaGuion(valor: Date | string | null | undefined): string {
  const d = valor instanceof Date ? valor : (valor ? new Date(valor) : null);
  if (!d || Number.isNaN(d.getTime())) {
    return '';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function horaAmPm(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const sufijo = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) {
    h = 12;
  }
  return `${String(h).padStart(2, '0')}:${m} ${sufijo}`;
}

/** Rejilla negra del formulario oficial. */
function rejillaOficial(): any {
  return {
    hLineWidth: () => 0.8,
    vLineWidth: () => 0.8,
    hLineColor: () => NEGRO,
    vLineColor: () => NEGRO,
    paddingTop: () => 2,
    paddingBottom: () => 2
  };
}
