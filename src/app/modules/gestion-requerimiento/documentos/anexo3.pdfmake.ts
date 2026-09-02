import {
  PedidoFormularioRequerimiento,
  RequerimientoDetalle
} from '../models/requerimiento.model';
import { extraDatosAdicionales } from './anexo5.pdfmake';
import {
  ACREDITACION_ESTUDIOS,
  ANTICORRUPCION,
  CONFORMIDAD_FIJA,
  CONFIDENCIALIDAD,
  CONFLICTO_INTERESES,
  DECLARACION_INTERESES,
  FINALIDAD_COMPLEMENTO,
  FORMA_PAGO_DOCUMENTOS,
  GASTOS_DESPLAZAMIENTO,
  INTRO_ACTIVIDADES,
  INTRO_ENTREGABLES,
  JUSTIFICACION_COMPLEMENTO,
  MARCO_LEGAL,
  MESA_PARTES,
  OBSERVACION_ENTREGABLES,
  PENALIDAD_INTRO,
  PENALIDAD_MORA_CIERRE,
  PENALIDAD_MORA_TEXTO,
  PLAZO_NOTA,
  PROPIEDAD_INTELECTUAL,
  RECURSOS_PROVEEDOR,
  RESOLUCION_CONTRACTUAL,
  SOLUCION_CONTROVERSIAS,
  TdrLocacion,
  VICIOS_OCULTOS,
  plazoEntregables,
  textoFormaPago
} from './anexo3-tdr.plantilla';

/**
 * Anexo N.° 3 de la Directiva 002-2026-ANIN (pp. 32–37): TDR para la
 * contratación de servicios realizados por personas naturales.
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
  const plazo = Number(detalle?.PlazoDias) > 0
    ? Number(detalle.PlazoDias)
    : plazoEntregables(tdr);
  const unidadConformidad = (tdr.UnidadConformidad || tdr.UnidadOrganizacional
    || detalle?.CentroCostoNombre || '').trim();
  const area = (detalle?.CentroCostoNombre || '').trim();
  const finalidad = `${tdr.FinalidadPublica || ''}${FINALIDAD_COMPLEMENTO}`;
  const justificacion = [tdr.Justificacion || '', JUSTIFICACION_COMPLEMENTO]
    .filter(x => !!x.trim())
    .join('\n');

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [56, 52, 56, 48],
    info: {
      title: `Anexo N.° 3 · ${detalle?.Codigo || ''}`,
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
      { text: 'ANEXO N° 3', style: 'titulo', margin: [0, 0, 0, 6] },
      {
        text: 'TÉRMINOS DE REFERENCIA PARA LA CONTRATACIÓN DE SERVICIOS',
        style: 'subtitulo'
      },
      {
        text: '(SERVICIOS TECNICOS, PROFESIONALES Y/O ESPECIALIZADOS REALIZADOS POR PERSONAS NATURALES)',
        style: 'subtitulo',
        margin: [0, 2, 0, 14]
      },

      tablaCabecera(detalle, pedidos),

      tituloSeccion('1. MARCO LEGAL (Obligatorio)'),
      cuerpo(MARCO_LEGAL),

      tituloSeccion('2. FINALIDAD PÚBLICA (Obligatorio)'),
      cuerpo(finalidad),

      tituloSeccion('3. OBJETIVO DE LA CONTRATACIÓN'),
      cuerpo(tdr.Objetivo || ''),

      tituloSeccion('4. JUSTIFICACIÓN DE LA NECESIDAD DE LA CONTRATACIÓN (Obligatorio)'),
      cuerpo(justificacion),

      tituloSeccion('5. CARACTERÍSTICAS Y CONDICIONES DE LA CONTRATACIÓN (Obligatorio)'),
      subtituloSeccion('5.1. Actividades (*)'),
      cuerpo(tdr.IntroActividades || INTRO_ACTIVIDADES),
      listaActividades(tdr),

      tituloSeccion('6. ENTREGABLES (Obligatorio)'),
      cuerpo(INTRO_ENTREGABLES),
      listaEntregables(tdr),
      cuerpo(OBSERVACION_ENTREGABLES),

      tituloSeccion('7. REQUISITOS Y RECURSOS DEL/DE LA PROVEEDOR/A (Obligatorio)'),
      subtituloSeccion('7.1. Requisitos del/de la proveedor/a'),
      cuerpo('7.1.1. Registro Nacional de Proveedores vigente.'),
      cuerpo('7.1.2. No contar con impedimento para contratar con el Estado, según el artículo 30 de la Ley General de Contrataciones Públicas.'),
      itemLlenado('7.1.3. Grado de instrucción', tdr.PerfilProveedor),
      itemLlenado('7.1.4. Capacitación requerida', tdr.Capacitacion),
      itemLlenado('7.1.5. Experiencia general mínima', tdr.ExperienciaGeneral),
      itemLlenado('7.1.6. Experiencia específica mínima', tdr.ExperienciaEspecifica),
      cuerpo(ACREDITACION_ESTUDIOS),
      subtituloSeccion('7.2. Recursos a ser provistos por el/la proveedora'),
      cuerpo(RECURSOS_PROVEEDOR),

      tituloSeccion('8. CONFORMIDAD DE LA PRESTACIÓN (Obligatorio)'),
      subtituloSeccion('8.1. Área usuaria que emite la conformidad:'),
      cuerpo(unidadConformidad),
      cuerpo(CONFORMIDAD_FIJA),

      tituloSeccion('9. FORMA DE PAGO (Obligatorio)'),
      cuerpo(textoFormaPago((tdr.Entregables || []).length)),
      cuerpo(FORMA_PAGO_DOCUMENTOS),

      tituloSeccion('10. LUGAR Y PLAZO DE LA PRESTACIÓN (Obligatorio)'),
      subtituloSeccion('10.1. Lugar de prestación:'),
      cuerpo(limpiarEjemplo(tdr.LugarPrestacion)),
      subtituloSeccion('10.2. Plazo:'),
      cuerpo(plazo
        ? `${plazo} días calendario, contados a partir del día siguiente de la notificación de la orden de servicio o de suscrito el contrato.`
        : PLAZO_NOTA),
      subtituloSeccion('10.3.'),
      cuerpo(MESA_PARTES),

      tituloSeccion('11. PENALIDADES (Obligatorio)'),
      cuerpo(PENALIDAD_INTRO),
      subtituloSeccion('11.1. Penalidad por mora (Obligatorio)'),
      cuerpo(PENALIDAD_MORA_TEXTO),
      formulaPenalidad(),
      cuerpo(PENALIDAD_MORA_CIERRE),
      subtituloSeccion('11.2. Otras Penalidades (De corresponder)'),
      cuerpo(tdr.OtrasPenalidades || ''),

      tituloSeccion('12. OTRAS CONSIDERACIONES PARA LA EJECUCIÓN DE LA PRESTACIÓN (Obligatorio)'),
      subtituloSeccion('12.1. Confidencialidad'),
      cuerpo(CONFIDENCIALIDAD),
      subtituloSeccion('12.2. Cláusula anticorrupción y antisoborno'),
      cuerpo(ANTICORRUPCION),
      subtituloSeccion('12.3. Conflicto de intereses (Ley N° 31564)'),
      cuerpo(CONFLICTO_INTERESES),
      subtituloSeccion('12.4. Propiedad intelectual'),
      cuerpo(PROPIEDAD_INTELECTUAL),
      subtituloSeccion('12.5. Responsabilidad por vicios ocultos'),
      cuerpo(VICIOS_OCULTOS),
      subtituloSeccion('12.6. Declaración Jurada de Intereses [de corresponder]'),
      cuerpo(DECLARACION_INTERESES),
      subtituloSeccion('12.7. Gastos por desplazamiento [de corresponder]'),
      cuerpo(GASTOS_DESPLAZAMIENTO),

      tituloSeccion('13. RESOLUCIÓN CONTRACTUAL (Obligatorio)'),
      cuerpo(RESOLUCION_CONTRACTUAL),

      tituloSeccion('14. SOLUCIÓN DE CONTROVERSIAS (Obligatorio)'),
      cuerpo(SOLUCION_CONTROVERSIAS),

      {
        text: 'En señal de conformidad. Cada firmante coloca su sello digital en su espacio, sin superponer firmas:',
        style: 'cuerpo',
        margin: [0, 20, 0, 0]
      },
      espaciosFirmaAreaUsuaria(detalle?.Responsable || '', area)
    ],

    styles: {
      titulo: { fontSize: 13, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 10, bold: true, alignment: 'center', color: NEGRO },
      hSeccion: { fontSize: 10.5, bold: true, color: NEGRO },
      hSub: { fontSize: 10, bold: true, color: NEGRO },
      cuerpo: { fontSize: 10, alignment: 'justify', color: NEGRO, lineHeight: 1.28 },
      cabeceraEtiqueta: { fontSize: 9.5, bold: true, color: NEGRO },
      cabeceraValor: { fontSize: 9.5, color: NEGRO },
      firma: { fontSize: 9.5, alignment: 'center', color: NEGRO },
      firmaRol: { fontSize: 9, bold: true, alignment: 'center', color: NEGRO }
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

function tablaCabecera(
  detalle: RequerimientoDetalle | any,
  pedidos: PedidoFormularioRequerimiento[]
): any {
  const primero = pedidos[0];
  const numeros = pedidos.map(p => p.NumeroPedido).filter(Boolean).join(' / ');
  const unidad = [detalle?.CentroCostoNombre, detalle?.CentroCosto]
    .filter(Boolean)
    .join(' — ');

  return {
    table: {
      widths: [165, '*'],
      body: [
        filaCabecera('N° DE PEDIDO DE SERVICIO:', numeros),
        filaCabecera('Fecha', fechaGuion(primero?.FechaPedido)),
        filaCabecera('Unidad de Organización', unidad),
        filaCabecera('Actividad Operativa', primero?.ActividadOperativa || ''),
        filaCabecera('Meta Presupuestaria', primero?.MetaPresupuestaria || ''),
        filaCabecera('Denominación de la contratación', detalle?.Denominacion || '')
      ]
    },
    layout: {
      hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
      hLineColor: () => NEGRO,
      vLineColor: () => NEGRO,
      paddingTop: () => 5,
      paddingBottom: () => 5,
      paddingLeft: () => 6,
      paddingRight: () => 6
    },
    margin: [0, 0, 0, 12]
  };
}

function filaCabecera(etiqueta: string, valor: string): any[] {
  return [
    { text: etiqueta, style: 'cabeceraEtiqueta' },
    { text: valor || ' ', style: 'cabeceraValor' }
  ];
}

function tituloSeccion(texto: string): any {
  return { text: texto, style: 'hSeccion', margin: [0, 11, 0, 4] };
}

function subtituloSeccion(texto: string): any {
  return { text: texto, style: 'hSub', margin: [0, 7, 0, 3] };
}

function cuerpo(texto: string): any {
  if (!(texto || '').trim()) {
    return { text: ' ', style: 'cuerpo', margin: [0, 0, 0, 4] };
  }
  return { text: texto, style: 'cuerpo', margin: [0, 0, 0, 5] };
}

function itemLlenado(etiqueta: string, valor: string): any {
  const limpio = (valor || '').replace(/^Ejemplo:\s*/i, '').trim();
  return {
    text: [
      { text: `${etiqueta}: `, bold: true },
      { text: limpio || ' ' }
    ],
    style: 'cuerpo',
    margin: [0, 0, 0, 4]
  };
}

function listaActividades(tdr: TdrLocacion): any {
  const filas = (tdr.Actividades || []).filter(a => (a.Descripcion || '').trim());
  if (!filas.length) {
    return { text: ' ', style: 'cuerpo', margin: [0, 0, 0, 4] };
  }
  return {
    ol: filas.map(a => ({ text: a.Descripcion, style: 'cuerpo' })),
    margin: [8, 0, 0, 8]
  };
}

function listaEntregables(tdr: TdrLocacion): any {
  const filas = tdr.Entregables || [];
  if (!filas.length) {
    return { text: ' ', style: 'cuerpo', margin: [0, 0, 0, 4] };
  }
  return {
    ol: filas.map(e => ({
      text: [e.Nombre || 'Entregable', e.Dias ? ` (${e.Dias} días calendario)` : '']
        .join(''),
      style: 'cuerpo'
    })),
    margin: [8, 2, 0, 8]
  };
}

function formulaPenalidad(): any {
  return {
    margin: [40, 8, 40, 10],
    columns: [
      {
        width: '*',
        text: 'Penalidad diaria =',
        alignment: 'right',
        fontSize: 11,
        margin: [0, 10, 8, 0]
      },
      {
        width: 150,
        stack: [
          { text: '0.10 × monto', alignment: 'center', fontSize: 11 },
          {
            canvas: [{ type: 'line', x1: 0, y1: 2, x2: 140, y2: 2, lineWidth: 0.8, lineColor: NEGRO }],
            margin: [5, 2, 5, 2]
          },
          { text: '0.40 × plazo', alignment: 'center', fontSize: 11 }
        ]
      },
      { width: '*', text: '' }
    ]
  };
}

function espaciosFirmaAreaUsuaria(responsable: string, area: string): any {
  return {
    unbreakable: true,
    margin: [0, 16, 0, 0],
    columnGap: 28,
    columns: [
      espacioFirmaColumna(
        '1. Especialista del Área usuaria',
        responsable || 'NOMBRES Y APELLIDOS',
        area
      ),
      espacioFirmaColumna(
        '2. Jefe del Área usuaria',
        'NOMBRES Y APELLIDOS',
        area
      )
    ]
  };
}

function espacioFirmaColumna(rol: string, nombre: string, area: string): any {
  return {
    width: '*',
    alignment: 'center',
    stack: [
      { text: rol, style: 'firmaRol', margin: [0, 0, 0, 6] },
      { text: '', margin: [0, 0, 0, 36] },
      {
        canvas: [{ type: 'line', x1: 10, y1: 0, x2: 200, y2: 0, lineWidth: 0.7, lineColor: NEGRO }],
        margin: [0, 0, 0, 6]
      },
      { text: nombre || 'NOMBRES Y APELLIDOS', style: 'firma', bold: true },
      { text: 'CARGO', style: 'firma', margin: [0, 2, 0, 0] },
      { text: area ? `(${area})` : '(Área usuaria)', style: 'firma', margin: [0, 2, 0, 0] }
    ]
  };
}

function limpiarEjemplo(texto: string): string {
  return (texto || '').replace(/^Ejemplo:\s*/i, '').trim();
}

function fechaGuion(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) {
    const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : String(valor);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}
