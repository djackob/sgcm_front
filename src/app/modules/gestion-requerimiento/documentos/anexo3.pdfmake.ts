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
 *
 * Numeración con sangría colgante: el cuerpo queda alineado con el inicio del
 * título (p. ej. «FINALIDAD»), no con el número («2.»). Tipografía uniforme
 * Roboto 10 pt en el contenido.
 */

export const TIPO_ANEXO_3 = 'REQ_TDR_LOCACION';
export const CARPETA_ANEXO_3 = 'requerimiento';

const NEGRO = '#000000';
/** Tamaño único del cuerpo, títulos de sección y subtítulos. */
const TAM_TEXTO = 10;
const TAM_PORTADA = 12;
const TAM_PIE = 9;
/** Anchos de columna del número según profundidad / dígitos. */
const ANCHO_NUM_1 = 20;
const ANCHO_NUM_1B = 26; /* 10. … 15. */
const ANCHO_NUM_2 = 32;
const ANCHO_NUM_3 = 42;

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
      fontSize: TAM_PIE,
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

      seccion('1.', 'MARCO LEGAL (Obligatorio)', [cuerpo(MARCO_LEGAL)]),

      seccion('2.', 'FINALIDAD PÚBLICA (Obligatorio)', [cuerpo(finalidad)]),

      seccion('3.', 'OBJETIVO DE LA CONTRATACIÓN', [cuerpo(tdr.Objetivo || '')]),

      seccion('4.', 'JUSTIFICACIÓN DE LA NECESIDAD DE LA CONTRATACIÓN (Obligatorio)', [
        cuerpo(justificacion)
      ]),

      seccion('5.', 'CARACTERÍSTICAS Y CONDICIONES DE LA CONTRATACIÓN (Obligatorio)', []),
      subseccion('5.1.', 'Actividades (*)', [
        cuerpo(tdr.IntroActividades || INTRO_ACTIVIDADES),
        listaActividades(tdr)
      ]),

      seccion('6.', 'ENTREGABLES (Obligatorio)', [
        cuerpo(INTRO_ENTREGABLES),
        listaEntregables(tdr),
        cuerpo(OBSERVACION_ENTREGABLES)
      ]),

      seccion('7.', 'REQUISITOS Y RECURSOS DEL/DE LA PROVEEDOR/A (Obligatorio)', []),
      subseccion('7.1.', 'Requisitos del/de la proveedor/a', [
        itemNumerado('7.1.1.', 'Registro Nacional de Proveedores vigente.'),
        itemNumerado(
          '7.1.2.',
          'No contar con impedimento para contratar con el Estado, según el artículo 30 de la Ley General de Contrataciones Públicas.'
        ),
        itemLlenado('7.1.3.', 'Grado de instrucción', tdr.PerfilProveedor),
        itemLlenado('7.1.4.', 'Capacitación requerida', tdr.Capacitacion),
        itemLlenado('7.1.5.', 'Experiencia general mínima', tdr.ExperienciaGeneral),
        ...(tdr.ExigeExperienciaEspecifica !== false && (tdr.ExperienciaEspecifica || '').trim()
          ? [itemLlenado('7.1.6.', 'Experiencia específica mínima', tdr.ExperienciaEspecifica)]
          : []),
        cuerpo(ACREDITACION_ESTUDIOS)
      ]),
      subseccion('7.2.', 'Recursos a ser provistos por el/la proveedora', [
        cuerpo(RECURSOS_PROVEEDOR)
      ]),

      seccion('8.', 'CONFORMIDAD DE LA PRESTACIÓN (Obligatorio)', []),
      subseccion('8.1.', 'Área usuaria que emite la conformidad:', [
        cuerpo(unidadConformidad),
        cuerpo(CONFORMIDAD_FIJA),
        ...(tdr.ExigeInformePrevio && (tdr.UnidadInforme || '').trim()
          ? [cuerpo(`Previo a la emisión de la conformidad, se requiere informe técnico / visto bueno de: ${tdr.UnidadInforme.trim()}.`)]
          : [])
      ]),

      seccion('9.', 'FORMA DE PAGO (Obligatorio)', [
        cuerpo(textoFormaPago((tdr.Entregables || []).length)),
        cuerpo(FORMA_PAGO_DOCUMENTOS)
      ]),

      seccion('10.', 'LUGAR Y PLAZO DE LA PRESTACIÓN (Obligatorio)', []),
      subseccion('10.1.', 'Lugar de prestación:', [
        cuerpo(limpiarEjemplo(tdr.LugarPrestacion))
      ]),
      subseccion('10.2.', 'Plazo:', [
        cuerpo(plazo
          ? `${plazo} días calendario, contados a partir del día siguiente de la notificación de la orden de servicio o de suscrito el contrato.`
          : PLAZO_NOTA)
      ]),
      subseccion('10.3.', '', [
        cuerpo(MESA_PARTES)
      ]),

      seccion('11.', 'PENALIDADES (Obligatorio)', [
        cuerpo(PENALIDAD_INTRO)
      ]),
      subseccion('11.1.', 'Penalidad por mora (Obligatorio)', [
        cuerpo(PENALIDAD_MORA_TEXTO),
        formulaPenalidad(),
        cuerpo(PENALIDAD_MORA_CIERRE)
      ]),

      seccion('12.', 'Otras Penalidades (De corresponder)', [
        cuerpo(tdr.OtrasPenalidades || '')
      ]),

      seccion('13.', 'OTRAS CONSIDERACIONES PARA LA EJECUCIÓN DE LA PRESTACIÓN (Obligatorio)', []),
      subseccion('13.1.', 'Confidencialidad', [cuerpo(CONFIDENCIALIDAD)]),
      subseccion('13.2.', 'Cláusula anticorrupción y antisoborno', [cuerpo(ANTICORRUPCION)]),
      subseccion('13.3.', 'Conflicto de intereses (Ley N° 31564)', [cuerpo(CONFLICTO_INTERESES)]),
      subseccion('13.4.', 'Propiedad intelectual', [cuerpo(PROPIEDAD_INTELECTUAL)]),
      subseccion('13.5.', 'Responsabilidad por vicios ocultos', [cuerpo(VICIOS_OCULTOS)]),
      subseccion('13.6.', 'Declaración Jurada de Intereses [de corresponder]', [
        cuerpo(DECLARACION_INTERESES)
      ]),
      subseccion('13.7.', 'Gastos por desplazamiento [de corresponder]', [
        cuerpo(GASTOS_DESPLAZAMIENTO)
      ]),

      seccion('14.', 'RESOLUCIÓN CONTRACTUAL (Obligatorio)', [
        cuerpo(RESOLUCION_CONTRACTUAL)
      ]),

      seccion('15.', 'SOLUCIÓN DE CONTROVERSIAS (Obligatorio)', [
        cuerpo(SOLUCION_CONTROVERSIAS)
      ]),

      {
        text: 'En señal de conformidad. Cada firmante coloca su sello digital en su espacio, sin superponer firmas:',
        style: 'cuerpo',
        margin: [0, 20, 0, 0]
      },
      espaciosFirmaAreaUsuaria(
        detalle?.Responsable || '',
        detalle?.JefeAreaUsuaria || '',
        area
      )
    ],

    styles: {
      titulo: {
        fontSize: TAM_PORTADA,
        bold: true,
        alignment: 'center',
        color: NEGRO,
        font: 'Roboto'
      },
      subtitulo: {
        fontSize: TAM_TEXTO,
        bold: true,
        alignment: 'center',
        color: NEGRO,
        font: 'Roboto'
      },
      hSeccion: {
        fontSize: TAM_TEXTO,
        bold: true,
        color: NEGRO,
        font: 'Roboto'
      },
      cuerpo: {
        fontSize: TAM_TEXTO,
        alignment: 'justify',
        color: NEGRO,
        lineHeight: 1.28,
        font: 'Roboto'
      },
      cabeceraEtiqueta: {
        fontSize: TAM_TEXTO,
        bold: true,
        color: NEGRO,
        font: 'Roboto'
      },
      cabeceraValor: {
        fontSize: TAM_TEXTO,
        color: NEGRO,
        font: 'Roboto'
      },
      firma: {
        fontSize: TAM_TEXTO,
        alignment: 'center',
        color: NEGRO,
        font: 'Roboto'
      },
      firmaRol: {
        fontSize: TAM_TEXTO,
        bold: true,
        alignment: 'center',
        color: NEGRO,
        font: 'Roboto'
      }
    },

    defaultStyle: {
      font: 'Roboto',
      fontSize: TAM_TEXTO,
      color: NEGRO
    }
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

/**
 * Bloque «N. TÍTULO» + cuerpo alineado al título (no al número).
 */
function seccion(numero: string, titulo: string, hijos: any[]): any {
  return bloqueNumerado(numero, titulo, hijos, anchoParaMarca(numero), [0, 11, 0, 2], true);
}

function subseccion(numero: string, titulo: string, hijos: any[]): any {
  return bloqueNumerado(numero, titulo, hijos, anchoParaMarca(numero), [0, 7, 0, 2], true);
}

function anchoParaMarca(numero: string): number {
  const m = normalizarMarca(numero);
  if (/^\d+\.\d+\.\d+\.?$/.test(m)) {
    return ANCHO_NUM_3;
  }
  if (/^\d+\.\d+\.?$/.test(m)) {
    return ANCHO_NUM_2;
  }
  if (/^\d{2}\.?$/.test(m)) {
    return ANCHO_NUM_1B;
  }
  return ANCHO_NUM_1;
}

function bloqueNumerado(
  numero: string,
  titulo: string,
  hijos: any[],
  anchoNumero: number,
  margen: number[],
  tituloNegrita: boolean
): any {
  const marca = normalizarMarca(numero);
  const contenidoDerecha: any[] = [];
  if (titulo.trim()) {
    contenidoDerecha.push({
      text: titulo.trim(),
      style: 'hSeccion',
      bold: tituloNegrita,
      margin: [0, 0, 0, hijos.length ? 4 : 0]
    });
  }
  contenidoDerecha.push(...hijos);

  return {
    columns: [
      {
        width: anchoNumero,
        text: marca,
        style: 'hSeccion',
        bold: tituloNegrita
      },
      {
        width: '*',
        stack: contenidoDerecha
      }
    ],
    columnGap: 4,
    margin: margen
  };
}

function normalizarMarca(numero: string): string {
  const t = (numero || '').trim();
  if (!t) {
    return '';
  }
  return t.endsWith('.') ? t : `${t}.`;
}

function cuerpo(texto: string): any {
  const crudo = (texto || '').replace(/\r\n/g, '\n');
  if (!crudo.trim()) {
    return { text: ' ', style: 'cuerpo', margin: [0, 0, 0, 4] };
  }

  const lineas = crudo.split('\n');
  const conVineta = lineas.filter(l => /^\s*[•\-\*]\s+/.test(l));
  if (conVineta.length >= 2 && conVineta.length >= Math.ceil(lineas.filter(l => l.trim()).length * 0.6)) {
    return {
      ul: lineas
        .filter(l => l.trim())
        .map(l => ({
          text: l.replace(/^\s*[•\-\*]\s+/, ''),
          style: 'cuerpo'
        })),
      margin: [0, 0, 0, 6]
    };
  }

  if (lineas.length > 1) {
    return {
      stack: lineas.map((linea, i) => {
        const sangria = (linea.match(/^(\t+| {2,})/) || [])[1] || '';
        const indent = sangria.includes('\t')
          ? sangria.length * 12
          : Math.floor(sangria.length / 2) * 8;
        return {
          text: linea.replace(/^\s+/, '') || ' ',
          style: 'cuerpo',
          margin: [indent, i === 0 ? 0 : 1, 0, 0],
          preserveLeadingSpaces: true
        };
      }),
      margin: [0, 0, 0, 5]
    };
  }

  return {
    text: crudo,
    style: 'cuerpo',
    margin: [0, 0, 0, 5],
    preserveLeadingSpaces: true
  };
}

function itemNumerado(numero: string, texto: string): any {
  return bloqueNumerado(numero, '', [cuerpo(texto)], anchoParaMarca(numero), [0, 0, 0, 4], false);
}

function itemLlenado(numero: string, etiqueta: string, valor: string): any {
  const limpio = (valor || '').replace(/^Ejemplo:\s*/i, '').trim();
  return bloqueNumerado(
    numero,
    '',
    [{
      text: [
        { text: `${etiqueta}: `, bold: true, style: 'cuerpo' },
        { text: limpio || ' ', style: 'cuerpo' }
      ],
      margin: [0, 0, 0, 0]
    }],
    anchoParaMarca(numero),
    [0, 0, 0, 4],
    false
  );
}

function listaActividades(tdr: TdrLocacion): any {
  const filas = (tdr.Actividades || []).filter(a => (a.Descripcion || '').trim());
  if (!filas.length) {
    return { text: ' ', style: 'cuerpo', margin: [0, 0, 0, 4] };
  }
  return {
    ol: filas.map(a => ({ text: a.Descripcion, style: 'cuerpo' })),
    margin: [0, 0, 0, 8]
  };
}

function listaEntregables(tdr: TdrLocacion): any {
  const filas = tdr.Entregables || [];
  if (!filas.length) {
    return { text: ' ', style: 'cuerpo', margin: [0, 0, 0, 4] };
  }
  return {
    ol: filas.map(e => {
      const nombre = e.Nombre || 'Entregable';
      const yaTieneDias = /d[ií]as calendario/i.test(nombre);
      const sufijo = !yaTieneDias && e.Dias ? ` (${e.Dias} días calendario)` : '';
      return { text: nombre + sufijo, style: 'cuerpo' };
    }),
    margin: [0, 2, 0, 8]
  };
}

function formulaPenalidad(): any {
  return {
    margin: [24, 8, 24, 10],
    columns: [
      {
        width: '*',
        text: 'Penalidad diaria =',
        alignment: 'right',
        style: 'cuerpo',
        margin: [0, 10, 8, 0]
      },
      {
        width: 150,
        stack: [
          { text: '0.10 × monto', alignment: 'center', style: 'cuerpo' },
          {
            canvas: [{ type: 'line', x1: 0, y1: 2, x2: 140, y2: 2, lineWidth: 0.8, lineColor: NEGRO }],
            margin: [5, 2, 5, 2]
          },
          { text: '0.40 × plazo', alignment: 'center', style: 'cuerpo' }
        ]
      },
      { width: '*', text: '' }
    ]
  };
}

function espaciosFirmaAreaUsuaria(
  responsable: string,
  jefeArea: string,
  area: string
): any {
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
        jefeArea || 'NOMBRES Y APELLIDOS',
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
