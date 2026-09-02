import { RequerimientoDetalle } from '../models/requerimiento.model';
import {
  ItemAnexo8,
  PostorAnexo8,
  etiquetaDec,
  totalItemPostor,
  totalPostor
} from './anexo8.util';

const NEGRO = '#000000';

export function construirAnexo8(
  detalle: RequerimientoDetalle | any,
  items: ItemAnexo8[],
  postores: PostorAnexo8[],
  idAdjudicado: string,
  criterio: string,
  observaciones: string
): any {
  const ganador = postores.find(p => p.Id === idAdjudicado);
  const monto = ganador ? totalPostor(items, ganador) : 0;
  const fecha = new Date().toLocaleDateString('es-PE');
  const dec = etiquetaDec(detalle?.CodigoDec);

  const cabeceraPostores = postores.map(p => ({
    text: `${p.RazonSocial}\nRUC ${p.Ruc}`,
    style: 'th',
    alignment: 'center'
  }));

  const filasItems = items.map(item => {
    const celdas = postores.map(p => ({
      text: totalItemPostor(item, p).toLocaleString('es-PE', { minimumFractionDigits: 2 }),
      alignment: 'right',
      fontSize: 8
    }));
    return [
      { text: String(item.Orden), alignment: 'center', fontSize: 8 },
      { text: item.Descripcion, fontSize: 8 },
      { text: item.Unidad, alignment: 'center', fontSize: 8 },
      { text: String(item.Cantidad), alignment: 'right', fontSize: 8 },
      ...celdas
    ];
  });

  const filaTotales = [
    { text: 'TOTAL (INC. IGV)', colSpan: 4, bold: true, fontSize: 8, alignment: 'right' },
    {}, {}, {},
    ...postores.map(p => ({
      text: totalPostor(items, p).toLocaleString('es-PE', { minimumFractionDigits: 2 }),
      bold: true,
      alignment: 'right',
      fontSize: 8
    }))
  ];

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 32, 28, 40],
    info: {
      title: `Anexo N.° 08 · ${detalle?.Codigo || ''}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    content: [
      { text: 'ANEXO N.° 08 — CUADRO DE COTIZACIONES', style: 'titulo', alignment: 'center' },
      { text: 'Cuadro de adquisición / indagación de mercado', style: 'subtitulo', alignment: 'center', margin: [0, 0, 0, 12] },
      {
        columns: [
          { text: `Tipo de contratación: Contrato Menor\nFecha: ${fecha}\nÁrea usuaria: ${detalle?.CentroCostoNombre || detalle?.CentroCosto || '—'}\nDEC: ${dec}`, fontSize: 8 },
          { text: `Denominación: ${detalle?.Denominacion || '—'}\nExpediente: ${detalle?.Codigo || '—'}\nSGD: ${detalle?.Ate || detalle?.Codigo || '—'}`, fontSize: 8 }
        ],
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: [22, '*', 36, 36, ...postores.map(() => '*')],
          body: [
            [
              { text: 'Ítem', style: 'th' },
              { text: 'Descripción', style: 'th' },
              { text: 'U.M.', style: 'th' },
              { text: 'Cant.', style: 'th' },
              ...cabeceraPostores
            ],
            ...filasItems,
            filaTotales
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 12]
      },
      {
        text: `Proveedor adjudicado: ${ganador?.RazonSocial || '—'}    Monto a contratar: S/. ${monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
        fontSize: 9,
        bold: true,
        margin: [0, 0, 0, 6]
      },
      { text: 'Criterio para la determinación del monto:', fontSize: 8, bold: true },
      { text: criterio || '—', fontSize: 8, margin: [0, 0, 0, 8] },
      { text: observaciones ? `Observaciones: ${observaciones}` : '', fontSize: 8, margin: [0, 0, 0, 16] },
      {
        columns: [
          { text: '___________________________\nResponsable de la elaboración\n(Especialista DEC)', alignment: 'center', fontSize: 8 },
          { text: '___________________________\nCoordinación / responsable de equipo', alignment: 'center', fontSize: 8 },
          { text: '___________________________\nResponsable de la DEC\n(Jefe Abastecimiento / DAI)', alignment: 'center', fontSize: 8 }
        ]
      }
    ],
    styles: {
      titulo: { fontSize: 12, bold: true, color: NEGRO },
      subtitulo: { fontSize: 9, color: NEGRO },
      th: { fontSize: 8, bold: true, color: NEGRO }
    },
    defaultStyle: { font: 'Roboto', color: NEGRO }
  };
}
