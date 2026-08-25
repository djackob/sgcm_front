import {
  PedidoFormularioRequerimiento,
  RequerimientoDetalle
} from '../models/requerimiento.model';
import { extraDatosAdicionales } from './anexo5.pdfmake';
import {
  CONFORMIDAD_PLANTILLA,
  FINALIDAD_COMPLEMENTO,
  FORMA_PAGO,
  INTRO_ENTREGABLES,
  JUSTIFICACION_COMPLEMENTO,
  MARCO_LEGAL,
  OBSERVACION_ENTREGABLES,
  OTRAS_CONSIDERACIONES,
  PENALIDAD_MORA,
  PLAZO_PLANTILLA,
  REQUISITOS_PLANTILLA,
  RESOLUCION_CONTRACTUAL,
  SOLUCION_CONTROVERSIAS,
  TdrLocacion,
  interpolar,
  plazoEntregables
} from './anexo3-tdr.plantilla';

/**
 * Anexo N.° 03 — Términos de referencia para locación de servicios
 * (personas naturales). Se elabora después del Anexo 5 (REQ-08, REQ-13).
 */

export const TIPO_ANEXO_3 = 'REQ_TDR_LOCACION';
export const CARPETA_ANEXO_3 = 'requerimiento';

const NEGRO = '#000000';

export function nombreArchivoAnexo3(detalle: { Codigo?: string }): string {
  return `Anexo 3 - ${detalle.Codigo || 'requerimiento'}.pdf`;
}

export function construirAnexo3Tdr(
  detalle: RequerimientoDetalle | any,
  tdr: TdrLocacion,
  pedidos: PedidoFormularioRequerimiento[]
): any {
  const plazo = plazoEntregables(tdr);
  const unidad = (tdr.UnidadOrganizacional || detalle?.CentroCostoNombre || '').trim();
  const vars = {
    EXPERIENCIA_PROVEEDOR: tdr.PerfilProveedor || '',
    EXPERIENCIA_GENERAL: tdr.ExperienciaGeneral || '',
    EXPERIENCIA_ESPECIFICA: tdr.ExperienciaEspecifica || '',
    UNIDAD_ORGANIZACIONAL: unidad ? `${unidad} ` : '',
    PLAZO: String(plazo || detalle?.PlazoDias || '')
  };

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [42, 48, 42, 64],
    info: {
      title: `Anexo N.° 03 · ${detalle?.Codigo || ''}`,
      author: 'Autoridad Nacional de Infraestructura'
    },

    footer: (pagina: number, total: number) => ({
      margin: [42, 8, 42, 18],
      columns: [
        {
          width: 220,
          stack: pagina === total
            ? [
                { canvas: [{ type: 'rect', x: 0, y: 0, w: 210, h: 32, lineWidth: 0.7, lineColor: NEGRO }] },
                { text: 'FIRMA DIGITAL', fontSize: 7, color: NEGRO, margin: [8, -24, 0, 0] },
                detalle?.Responsable
                  ? { text: detalle.Responsable, fontSize: 7, margin: [8, 2, 0, 0] }
                  : {}
              ]
            : []
        },
        {
          text: `Página ${pagina} de ${total}`,
          fontSize: 8,
          alignment: 'right',
          margin: [0, 12, 0, 0]
        }
      ]
    }),

    content: [
      {
        columns: [
          {
            width: 70,
            stack: [
              { text: 'ANIN', fontSize: 11, bold: true, color: NEGRO },
              { text: 'Autoridad Nacional\nde Infraestructura', fontSize: 6, color: NEGRO }
            ]
          },
          {
            width: '*',
            stack: [
              { text: 'ANEXO N° 03', style: 'titulo' },
              {
                text: 'TÉRMINOS DE REFERENCIA PARA LA CONTRATACIÓN DE SERVICIOS TÉCNICOS, PROFESIONALES Y/O ESPECIALIZADOS REALIZADOS POR PERSONAS NATURALES',
                style: 'subtitulo',
                margin: [0, 4, 0, 0]
              }
            ]
          }
        ],
        margin: [0, 0, 0, 12]
      },

      linea('Año', String(detalle?.AnoEje || '')),
      linea('Unidad organizativa', [detalle?.CentroCosto, detalle?.CentroCostoNombre].filter(Boolean).join(' — ')),
      linea('Denominación de la contratación', detalle?.Denominacion || ''),
      tdr.EsProyecto
        ? linea('Proyecto', tdr.NombreProyecto || '')
        : {},

      { text: 'Pedidos SIGA', style: 'h2', margin: [0, 10, 0, 4] },
      tablaPedidos(pedidos),

      seccion('1. MARCO LEGAL', MARCO_LEGAL),
      seccion('2. FINALIDAD PÚBLICA', `${tdr.FinalidadPublica || ''}${FINALIDAD_COMPLEMENTO}`),
      seccion('3. OBJETIVO DE LA CONTRATACIÓN', tdr.Objetivo || ''),
      seccion('4. JUSTIFICACIÓN DE LA NECESIDAD DE LA CONTRATACIÓN',
        `${tdr.Justificacion || ''}\n${JUSTIFICACION_COMPLEMENTO}`),

      { text: '5. CARACTERÍSTICAS Y CONDICIONES DE LA CONTRATACIÓN', style: 'h2', margin: [0, 12, 0, 4] },
      { text: tdr.IntroActividades || '', style: 'cuerpo', margin: [0, 0, 0, 6] },
      tablaActividades(tdr),

      { text: '6. ENTREGABLES', style: 'h2', margin: [0, 12, 0, 4] },
      { text: INTRO_ENTREGABLES, style: 'cuerpo', margin: [0, 0, 0, 6] },
      tablaEntregables(tdr),
      { text: OBSERVACION_ENTREGABLES, style: 'cuerpo', margin: [0, 6, 0, 0] },

      seccion('7. REQUISITOS Y RECURSOS DEL/DE LA PROVEEDOR/A',
        interpolar(REQUISITOS_PLANTILLA, vars)),
      seccion('8. CONFORMIDAD DE LA PRESTACIÓN', interpolar(CONFORMIDAD_PLANTILLA, vars)),
      unidadesConformidad(tdr),
      seccion('9. FORMA DE PAGO', FORMA_PAGO),
      seccion('10. LUGAR Y PLAZO DE LA PRESTACIÓN',
        `${tdr.LugarPrestacion || ''}\n${interpolar(PLAZO_PLANTILLA, vars)}`),
      seccion('11. PENALIDADES', `${PENALIDAD_MORA}\n${tdr.OtrasPenalidades || ''}`),
      seccion('12. OTRAS CONSIDERACIONES PARA LA EJECUCIÓN DE LA PRESTACIÓN', OTRAS_CONSIDERACIONES),
      seccion('13. RESOLUCIÓN CONTRACTUAL', RESOLUCION_CONTRACTUAL),
      seccion('14. SOLUCIÓN DE CONTROVERSIAS', SOLUCION_CONTROVERSIAS)
    ],

    styles: {
      titulo: { fontSize: 13, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 8, bold: true, alignment: 'center', color: NEGRO },
      h2: { fontSize: 10, bold: true, color: NEGRO },
      etiqueta: { fontSize: 8, bold: true, color: NEGRO },
      cuerpo: { fontSize: 8.5, alignment: 'justify', color: NEGRO, lineHeight: 1.25 },
      th: { fontSize: 7, bold: true, alignment: 'center', color: NEGRO },
      td: { fontSize: 7.5, color: NEGRO }
    },

    defaultStyle: { font: 'Roboto' }
  };
}

export function pedidosDesdeDetalle(
  detalle: RequerimientoDetalle | any
): PedidoFormularioRequerimiento[] {
  const extra = extraDatosAdicionales(detalle);
  const extras = extra.PedidosExtra || extra.pedidosExtra || [];
  const filas = detalle?.Pedidos || [];

  if (!filas.length && !extras.length) {
    return [];
  }

  const origen = filas.length ? filas : extras;
  return origen.map((fila: any, i: number) => {
    const extraPedido = extras[i] || {};
    return {
      NumeroPedido: fila.NumeroPedido || extraPedido.NumeroPedido || '',
      FechaPedido: String(fila.FechaPedido || extraPedido.FechaPedido || '').substring(0, 10),
      SecFunc: fila.SecFunc ?? extraPedido.SecFunc ?? null,
      Origen: fila.Origen || extraPedido.Origen || '',
      FuenteFinanc: fila.FuenteFinanc || extraPedido.FuenteFinanc || '',
      Clasificador: fila.Clasificador || extraPedido.Clasificador || '',
      AnoPedido: fila.AnoEje ?? extraPedido.AnoPedido ?? detalle?.AnoEje ?? null,
      ActividadOperativa: extraPedido.ActividadOperativa || '',
      MetaPresupuestaria: extraPedido.MetaPresupuestaria
        || (fila.SecFunc != null ? String(fila.SecFunc) : ''),
      Programa: extraPedido.Programa || '',
      ProdPy: extraPedido.ProdPy || '',
      CodigoItemPedido: extraPedido.CodigoItemPedido || '',
      NombreItemPedido: extraPedido.NombreItemPedido || ''
    };
  });
}

function linea(etiqueta: string, valor: string): any {
  return {
    margin: [0, 0, 0, 3],
    columns: [
      { width: 160, text: etiqueta, style: 'etiqueta' },
      { width: '*', text: valor || ' ', style: 'cuerpo' }
    ]
  };
}

function seccion(titulo: string, cuerpo: string): any {
  return {
    stack: [
      { text: titulo, style: 'h2', margin: [0, 12, 0, 4] },
      { text: cuerpo || ' ', style: 'cuerpo' }
    ]
  };
}

function unidadesConformidad(tdr: TdrLocacion): any {
  const partes = [
    tdr.UnidadConformidad ? `Unidad de conformidad: ${tdr.UnidadConformidad}` : '',
    tdr.UnidadInforme ? `Unidad de informe: ${tdr.UnidadInforme}` : ''
  ].filter(Boolean);
  if (!partes.length) {
    return {};
  }
  return { text: partes.join('\n'), style: 'cuerpo', margin: [0, 4, 0, 0] };
}

function tablaPedidos(pedidos: PedidoFormularioRequerimiento[]): any {
  if (!pedidos.length) {
    return { text: 'Sin pedidos SIGA vinculados.', style: 'cuerpo', italics: true };
  }

  return {
    table: {
      headerRows: 1,
      widths: [54, 28, 70, 38, 42, 42, 52, '*'],
      body: [
        [
          celdaTh('N° Pedido'), celdaTh('Año'), celdaTh('Actividad operativa'),
          celdaTh('FF/RR'), celdaTh('Programa'), celdaTh('Prod/Py'),
          celdaTh('Clasificador'), celdaTh('Ítem')
        ],
        ...pedidos.map(p => [
          celdaTd(p.NumeroPedido, 'center'),
          celdaTd(String(p.AnoPedido || ''), 'center'),
          celdaTd(p.ActividadOperativa),
          celdaTd(p.FuenteFinanc, 'center'),
          celdaTd(p.Programa, 'center'),
          celdaTd(p.ProdPy, 'center'),
          celdaTd(p.Clasificador, 'center'),
          celdaTd([p.CodigoItemPedido, p.NombreItemPedido].filter(Boolean).join(' — '))
        ])
      ]
    },
    layout: tablaLayout(),
    margin: [0, 0, 0, 8]
  };
}

function tablaActividades(tdr: TdrLocacion): any {
  const filas = (tdr.Actividades || []).filter(a => (a.Descripcion || '').trim());
  if (!filas.length) {
    return { text: 'Sin actividades registradas.', style: 'cuerpo', italics: true, margin: [0, 0, 0, 6] };
  }
  return {
    table: {
      headerRows: 1,
      widths: [28, '*'],
      body: [
        [celdaTh('N°'), celdaTh('Descripción')],
        ...filas.map((a, i) => [celdaTd(String(i + 1), 'center'), celdaTd(a.Descripcion)])
      ]
    },
    layout: tablaLayout(),
    margin: [0, 0, 0, 6]
  };
}

function tablaEntregables(tdr: TdrLocacion): any {
  const filas = tdr.Entregables || [];
  return {
    table: {
      headerRows: 1,
      widths: [28, '*', 70],
      body: [
        [celdaTh('N°'), celdaTh('Nombre del entregable'), celdaTh('Días calendario')],
        ...filas.map((e, i) => [
          celdaTd(String(i + 1), 'center'),
          celdaTd(e.Nombre),
          celdaTd(String(e.Dias || ''), 'center')
        ])
      ]
    },
    layout: tablaLayout(),
    margin: [0, 0, 0, 6]
  };
}

function celdaTh(texto: string): any {
  return { text: texto, style: 'th' };
}

function celdaTd(texto: string, alineacion: 'left' | 'center' | 'right' = 'left'): any {
  return { text: texto || ' ', style: 'td', alignment: alineacion };
}

function tablaLayout(): any {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => NEGRO,
    vLineColor: () => NEGRO,
    paddingTop: () => 3,
    paddingBottom: () => 3,
    paddingLeft: () => 3,
    paddingRight: () => 3
  };
}
