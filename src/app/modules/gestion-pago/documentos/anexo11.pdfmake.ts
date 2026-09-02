import { ExpedientePagoDetalle } from '../models/pago.model';

export const TIPO_ANEXO_11 = 'PAG_ACTA_ANEXO11';
export const CARPETA_ANEXO_11 = 'pago';

const NEGRO = '#000000';

export function nombreArchivoAnexo11(detalle: ExpedientePagoDetalle): string {
  return `Anexo 11 - ${detalle.Codigo || 'pago'}.pdf`;
}

export function construirAnexo11(detalle: ExpedientePagoDetalle): any {
  const monto = Number(detalle.MontoEntregable || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const fechaPres = detalle.FechaPresentacion
    ? new Date(detalle.FechaPresentacion).toLocaleDateString('es-PE')
    : '______________';
  const fechaLim = detalle.FechaLimiteCronograma
    ? new Date(detalle.FechaLimiteCronograma).toLocaleDateString('es-PE')
    : '______________';

  return {
    pageSize: 'A4',
    pageMargins: [56, 52, 56, 48],
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
      { text: 'ANEXO N.° 11', style: 'titulo' },
      {
        text: 'ACTA DE CONFORMIDAD DE LA PRESTACIÓN',
        style: 'subtitulo',
        margin: [0, 6, 0, 14]
      },
      { text: `Expediente de pago: ${detalle.Codigo || ''}`, style: 'dato' },
      { text: `Requerimiento: ${detalle.CodigoRequerimiento || ''}`, style: 'dato' },
      { text: `Orden de servicio: ${detalle.NumeroOrdenSiga || '—'}`, style: 'dato', margin: [0, 0, 0, 12] },

      { text: '1. Datos de la prestación', style: 'seccion' },
      {
        table: {
          widths: [180, '*'],
          body: [
            fila('Locador', detalle.NombreLocador || '—'),
            fila('RUC', detalle.RucLocador || '—'),
            fila('DNI', detalle.DniLocador || '—'),
            fila('Denominación', detalle.Denominacion || '—'),
            fila('N.° de entregable', String(detalle.NumeroEntregable || '')),
            fila('Descripción', detalle.NombreEntregable || '—'),
            fila('Monto del entregable (S/)', monto),
            fila('Plazo del entregable (días)', String(detalle.PlazoDias || ''))
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 12]
      },

      { text: '2. Fechas y atraso', style: 'seccion' },
      {
        table: {
          widths: [180, '*'],
          body: [
            fila('Fecha límite según cronograma', fechaLim),
            fila('Fecha de presentación', fechaPres),
            fila('Días de atraso injustificado', String(detalle.DiasAtraso || 0)),
            fila('Retraso justificado', detalle.RetrasoJustificado ? 'Sí' : 'No')
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 12]
      },

      {
        text: 'El Área Usuaria declara que el entregable cumple con los Términos de Referencia y otorga la conformidad técnica de la prestación, para el trámite de pago ante la DEC, Contabilidad y Tesorería.',
        style: 'cuerpo',
        margin: [0, 8, 0, 20]
      },

      {
        text: '_________________________________\nJefe del Área Usuaria\nFirma digital en el SGCM',
        style: 'firma',
        alignment: 'center',
        margin: [0, 24, 0, 0]
      }
    ],
    styles: {
      titulo: { fontSize: 13, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 10, bold: true, alignment: 'center', color: NEGRO },
      seccion: { fontSize: 11, bold: true, color: NEGRO, margin: [0, 4, 0, 0] },
      dato: { fontSize: 9, color: NEGRO },
      cuerpo: { fontSize: 9, alignment: 'justify', color: NEGRO },
      etiqueta: { fontSize: 8, color: NEGRO },
      valor: { fontSize: 9, color: NEGRO },
      firma: { fontSize: 9, color: NEGRO }
    },
    defaultStyle: { fontSize: 9, color: NEGRO }
  };
}

function fila(etiqueta: string, valor: string): any[] {
  return [
    { text: etiqueta, style: 'etiqueta', bold: true },
    { text: valor, style: 'valor' }
  ];
}
