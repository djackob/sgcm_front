import { RequerimientoDetalle } from '../models/requerimiento.model';
import {
  ANTICORRUPCION,
  CONFORMIDAD_FIJA,
  FORMA_PAGO_DOCUMENTOS,
  MARCO_LEGAL,
  MESA_PARTES,
  OTRAS_CONSIDERACIONES,
  PENALIDAD_MORA,
  RESOLUCION_CONTRACTUAL,
  SOLUCION_CONTROVERSIAS,
  TdrLocacion,
  plazoEntregables,
  textoFormaPago
} from './anexo3-tdr.plantilla';
import {
  documentoLocador,
  montoTotalLocacion,
  nombreCompletoLocador,
  pedidoExtra,
  pedidoPrincipal,
  proveedorPrincipal
} from './filtro-idoneidad.util';

export const TIPO_ORDEN_SERVICIO = 'REQ_ORDEN_SERVICIO';
export const CARPETA_ORDEN_SERVICIO = 'requerimiento';

const NEGRO = '#000000';

export interface OrdenServicioExtras {
  NotasAdicionales?: string;
  FechaEmision?: string;
}

export function nombreArchivoOrdenServicio(detalle: { Codigo?: string }): string {
  return `Orden de Servicio - ${detalle?.Codigo || 'requerimiento'}.pdf`;
}

export function construirOrdenServicio(
  detalle: RequerimientoDetalle | any,
  tdr: TdrLocacion,
  ccp: any,
  extras: OrdenServicioExtras = {}
): any {
  const proveedor = proveedorPrincipal(detalle);
  const pedido = pedidoPrincipal(detalle);
  const pedidoExtraData = pedidoExtra(detalle, pedido?.NumeroPedido || proveedor?.NumeroPedido || '');
  const nombreLocador = nombreCompletoLocador(proveedor) || '—';
  const docLocador = documentoLocador(proveedor);
  const montoTotal = montoTotalLocacion(detalle, proveedor);
  const montoMensual = Number(proveedor?.MontoMensual) || 0;
  const entregables = Number(proveedor?.CantidadEntregables) || tdr.Entregables?.length || 1;
  const plazo = plazoEntregables(tdr) || detalle?.PlazoDias || 0;
  const fechaEmision = extras.FechaEmision || new Date().toISOString().substring(0, 10);
  const ano = detalle?.AnoEje || new Date().getFullYear();
  const area = [detalle?.CentroCostoNombre, detalle?.CentroCosto].filter(Boolean).join(' — ');

  const actividades = (tdr.Actividades || [])
    .map((a, i) => `${i + 1}. ${(a.Descripcion || '').trim()}`)
    .filter((linea) => linea.length > 2);

  const listaEntregables = (tdr.Entregables || [])
    .map((e, i) => {
      const nombre = (e.Nombre || `Entregable ${i + 1}`).trim();
      const dias = e.Dias ? ` — plazo: ${e.Dias} días calendario` : '';
      return `• ${nombre}${dias}`;
    });

  const clausulas = [
    tituloSeccion('I. MARCO LEGAL'),
    cuerpo(MARCO_LEGAL),
    tituloSeccion('II. OBJETO DEL SERVICIO'),
    cuerpo(detalle?.Denominacion || ''),
    tituloSeccion('III. OBLIGACIONES — ACTIVIDADES'),
    cuerpo(actividades.length ? actividades.join('\n') : 'Conforme al TDR (Anexo 3) del expediente.'),
    tituloSeccion('IV. ENTREGABLES'),
    cuerpo(listaEntregables.length ? listaEntregables.join('\n') : 'Conforme al TDR (Anexo 3).'),
    tituloSeccion('V. LUGAR DE PRESTACIÓN'),
    cuerpo(tdr.LugarPrestacion || 'Conforme al TDR (Anexo 3).'),
    tituloSeccion('VI. PLAZO DE EJECUCIÓN'),
    cuerpo(
      plazo
        ? `${plazo} días calendario, contados a partir del día siguiente de la notificación de la presente orden de servicio.\n\n${MESA_PARTES}`
        : MESA_PARTES
    ),
    tituloSeccion('VII. MONTO CONTRACTUAL'),
    cuerpo(
      `Monto mensual: S/ ${montoMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
      + `Número de entregables: ${entregables}\n`
      + `Monto total: S/ ${montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ),
    tituloSeccion('VIII. CERTIFICACIÓN PRESUPUESTARIA'),
    cuerpo(
      [
        `N.° CCP: ${ccp?.NumeroCcp || '—'}`,
        `N.° expediente SIAF: ${ccp?.NumeroExpedienteSiaf || '—'}`,
        `Monto certificado: S/ ${Number(ccp?.MontoCertificado ?? montoTotal).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `Fecha de emisión CCP: ${(ccp?.FechaEmision || '').toString().substring(0, 10) || '—'}`,
        `Pedido SIGA N.°: ${pedido?.NumeroPedido || proveedor?.NumeroPedido || '—'}`,
        `Meta / clasificador: ${pedidoExtraData.MetaPresupuestaria || pedido?.SecFunc || '—'} / ${pedido?.Clasificador || pedidoExtraData.Clasificador || '—'}`
      ].join('\n')
    ),
    tituloSeccion('IX. CONFORMIDAD'),
    cuerpo(CONFORMIDAD_FIJA),
    tituloSeccion('X. FORMA DE PAGO'),
    cuerpo(`${textoFormaPago(entregables)}\n\n${FORMA_PAGO_DOCUMENTOS}`),
    tituloSeccion('XI. PENALIDADES'),
    cuerpo(PENALIDAD_MORA + (tdr.OtrasPenalidades ? `\n\n11.2. Otras penalidades\n${tdr.OtrasPenalidades}` : '')),
    tituloSeccion('XII. OTRAS CONSIDERACIONES'),
    cuerpo(OTRAS_CONSIDERACIONES),
    tituloSeccion('XIII. RESOLUCIÓN DEL CONTRATO'),
    cuerpo(RESOLUCION_CONTRACTUAL),
    tituloSeccion('XIV. SOLUCIÓN DE CONTROVERSIAS'),
    cuerpo(SOLUCION_CONTROVERSIAS),
    tituloSeccion('XV. CLÁUSULA ANTICORRUPCIÓN'),
    cuerpo(ANTICORRUPCION)
  ];

  if (extras.NotasAdicionales?.trim()) {
    clausulas.push(
      tituloSeccion('NOTAS ADICIONALES'),
      cuerpo(extras.NotasAdicionales.trim())
    );
  }

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [56, 52, 56, 48],
    info: {
      title: `Orden de Servicio · ${detalle?.Codigo || ''}`,
      author: 'Autoridad Nacional de Infraestructura'
    },
    header: (pagina: number, total: number) => ({
      margin: [56, 22, 56, 0],
      text: `Página ${pagina} de ${total}`,
      fontSize: 9,
      alignment: 'right',
      color: NEGRO
    }),
    content: [
      { text: 'ORDEN DE SERVICIO', style: 'titulo', alignment: 'center' },
      {
        text: `N.° _____-${ano}-ANIN/OA-UA`,
        style: 'subtitulo',
        alignment: 'center',
        margin: [0, 4, 0, 14]
      },
      tablaPartes(nombreLocador, docLocador, proveedor, area, fechaEmision),
      { text: '', margin: [0, 0, 0, 10] },
      ...clausulas,
      {
        margin: [0, 24, 0, 0],
        columns: [
          { width: '*', stack: [{ text: '_________________________', alignment: 'center' }, { text: 'Jefe de la Dependencia\nEncargada de las Contrataciones', style: 'firma', alignment: 'center' }] },
          { width: '*', stack: [{ text: '_________________________', alignment: 'center' }, { text: nombreLocador, style: 'firma', alignment: 'center' }] }
        ]
      }
    ],
    styles: {
      titulo: { fontSize: 14, bold: true, color: NEGRO },
      subtitulo: { fontSize: 11, bold: true, color: NEGRO },
      seccion: { fontSize: 10, bold: true, color: NEGRO, margin: [0, 10, 0, 4] },
      cuerpo: { fontSize: 9.5, lineHeight: 1.25, color: NEGRO },
      tablaLabel: { fontSize: 9, bold: true, color: NEGRO },
      tablaValor: { fontSize: 9, color: NEGRO },
      firma: { fontSize: 8.5, margin: [0, 4, 0, 0], color: NEGRO }
    },
    defaultStyle: { font: 'Roboto' }
  };
}

function tituloSeccion(texto: string): any {
  return { text: texto, style: 'seccion' };
}

function cuerpo(texto: string): any {
  return { text: texto || '—', style: 'cuerpo', margin: [0, 0, 0, 6] };
}

function tablaPartes(
  nombreLocador: string,
  docLocador: string,
  proveedor: any,
  area: string,
  fechaEmision: string
): any {
  return {
    table: {
      widths: [120, '*'],
      body: [
        [celdaLabel('LOCADOR / CONTRATISTA'), celdaValor(nombreLocador)],
        [celdaLabel('RUC / DNI'), celdaValor(docLocador || '—')],
        [celdaLabel('Correo electrónico'), celdaValor(proveedor?.Email || '—')],
        [celdaLabel('Celular'), celdaValor(proveedor?.Celular || '—')],
        [celdaLabel('Área usuaria'), celdaValor(area || '—')],
        [celdaLabel('Fecha de emisión O/S'), celdaValor(fechaEmision)]
      ]
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#cbd5e1',
      vLineColor: () => '#cbd5e1'
    }
  };
}

function celdaLabel(texto: string): any {
  return { text: texto, style: 'tablaLabel', margin: [4, 3, 4, 3] };
}

function celdaValor(texto: string): any {
  return { text: texto, style: 'tablaValor', margin: [4, 3, 4, 3] };
}
