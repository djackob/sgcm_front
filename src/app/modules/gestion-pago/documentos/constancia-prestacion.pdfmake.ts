import { ConstanciaPrestacion } from '../models/pago.model';

const NEGRO = '#000000';
const BORDE = '#000000';
const GRIS = '#D9D9D9';

/**
 * Constancia de prestación de la orden, emitida al quedar girado el último
 * entregable. Resume la orden, el proveedor y el cronograma efectivamente
 * pagado, con las penalidades aplicadas.
 */

export function nombreArchivoConstancia(c: ConstanciaPrestacion): string {
  return `Constancia de prestacion ${c.Numero}.pdf`;
}

export function construirConstanciaPrestacion(c: ConstanciaPrestacion): any {
  const tipo = c.TipoOrden === 'OC' ? 'Orden de Compra' : 'Orden de Servicio';
  const tipoCorto = c.TipoOrden === 'OC' ? 'O/C' : 'O/S';
  const entregables = c.Entregables || [];
  const ultimoAbono = entregables
    .map(e => e.FechaAbono || '')
    .filter(Boolean)
    .sort()
    .pop() || null;
  const penalidad = Number(c.MontoPenalidad || 0);

  return {
    pageSize: 'A4',
    pageMargins: [56, 48, 56, 44],
    info: {
      title: `Constancia de prestación ${c.Numero}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    content: [
      { text: 'AUTORIDAD NACIONAL DE INFRAESTRUCTURA', style: 'entidad' },
      { text: 'CONSTANCIA DE PRESTACIÓN', style: 'titulo' },
      { text: `N.° ${c.Numero}`, style: 'titulo', margin: [0, 0, 0, 16] },

      {
        text: [
          'La Autoridad Nacional de Infraestructura deja constancia que el proveedor ',
          { text: texto(c.NombreLocador), bold: true },
          `, identificado con ${c.RucLocador ? 'RUC' : 'DNI'} N.° `,
          { text: texto(c.RucLocador || c.DniLocador), bold: true },
          `, ha cumplido con la prestación a su cargo derivada de la ${tipo} N.° `,
          { text: texto(c.NumeroOrdenSiga) || '—', bold: true },
          ', conforme al detalle siguiente, habiéndose otorgado la conformidad y efectuado el pago de la totalidad de los entregables.'
        ],
        style: 'cuerpo',
        margin: [0, 0, 0, 14]
      },

      {
        table: {
          widths: [170, '*'],
          body: [
            [{ text: 'DATOS DE LA CONTRATACIÓN', style: 'cabecera', alignment: 'center', colSpan: 2, fillColor: GRIS, margin: [3, 4, 3, 4] }, {}],
            [etiqueta('DENOMINACIÓN'), celda(c.Denominacion)],
            [etiqueta(`TIPO / N.° DE ORDEN`), celda(`${tipoCorto} ${texto(c.NumeroOrdenSiga)}`)],
            [etiqueta('N.° DE CONTRATO'), celda(c.NumeroContrato)],
            [etiqueta('REQUERIMIENTO'), celda(c.CodigoRequerimiento)],
            [etiqueta('ÁREA USUARIA'), celda(c.UnidadOrigen)],
            [etiqueta('FECHA DE LA ORDEN'), celda(fecha(c.FechaOrden))],
            [etiqueta('PLAZO DE EJECUCIÓN'), celda(c.PlazoDias ? `${c.PlazoDias} días calendario` : '')],
            [etiqueta('MONTO CONTRACTUAL'), celda(moneda(c.MontoContrato))],
            [etiqueta('MONTO PAGADO (BRUTO)'), celda(moneda(c.MontoPagado))],
            [etiqueta('PENALIDADES APLICADAS'), celda(penalidad > 0 ? moneda(penalidad) : 'Ninguna')],
            [etiqueta('FECHA DEL ÚLTIMO PAGO'), celda(fecha(ultimoAbono))]
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 14]
      },

      {
        table: {
          headerRows: 1,
          widths: [22, '*', 58, 58, 34, 52, 58],
          body: [
            [
              cabeceraCentro('N.°'),
              cabeceraCentro('ENTREGABLE'),
              cabeceraCentro('PRESENTACIÓN'),
              cabeceraCentro('CONFORMIDAD'),
              cabeceraCentro('DÍAS ATRASO'),
              cabeceraCentro('PENALIDAD'),
              cabeceraCentro('MONTO')
            ],
            ...entregables.map(e => [
              celdaCentro(e.NumeroEntregable),
              { text: texto(e.NombreEntregable), style: 'tabla', margin: [3, 3, 3, 3] },
              celdaCentro(fecha(e.FechaPresentacion)),
              celdaCentro(fecha(e.FechaConformidadTecnica)),
              celdaCentro(e.DiasAtraso || 0),
              celdaCentro(Number(e.MontoPenalidad || 0) > 0 ? moneda(e.MontoPenalidad) : '—'),
              celdaCentro(moneda(e.MontoEntregable))
            ])
          ]
        },
        layout: marco(),
        margin: [0, 0, 0, 14]
      },

      {
        text: `Se expide la presente constancia para los fines que el proveedor estime conveniente. Lima, ${fechaLarga(c.FechaEmision)}.`,
        style: 'cuerpo',
        margin: [0, 0, 0, 60]
      },

      {
        stack: [
          { text: '_______________________________________', alignment: 'center' },
          { text: texto(c.NombreEmisor), style: 'firma', alignment: 'center' },
          { text: texto(c.CargoEmisor), style: 'tabla', alignment: 'center' },
          { text: 'Autoridad Nacional de Infraestructura', style: 'tabla', alignment: 'center' }
        ]
      }
    ],
    styles: {
      entidad: { fontSize: 9, bold: true, alignment: 'center', color: NEGRO, margin: [0, 0, 0, 6] },
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      cuerpo: { fontSize: 9, alignment: 'justify', color: NEGRO, lineHeight: 1.2 },
      cabecera: { fontSize: 8, bold: true, color: NEGRO },
      valor: { fontSize: 9, color: NEGRO },
      tabla: { fontSize: 8, color: NEGRO },
      firma: { fontSize: 9, bold: true, color: NEGRO }
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
  return { text: rotulo, style: 'cabecera', alignment: 'center', fillColor: GRIS, margin: [2, 3, 2, 3] };
}

function etiqueta(rotulo: string): any {
  return { text: rotulo, style: 'cabecera', fillColor: GRIS, margin: [3, 4, 3, 4] };
}

function celda(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'valor', margin: [3, 4, 3, 4] };
}

function celdaCentro(valor: string | number | null | undefined): any {
  return { text: texto(valor), style: 'tabla', alignment: 'center', margin: [2, 3, 2, 3] };
}

function texto(valor: string | number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

function moneda(valor: number | null | undefined): string {
  return `S/ ${Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fecha(valor: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'setiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(valor: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
}
