import {
  PedidoRequerimiento,
  ProveedorFormularioRequerimiento,
  RequerimientoDetalle,
  montoTotalProveedor
} from '../models/requerimiento.model';

/**
 * Anexo N.° 05 — Propuesta del Área usuaria para locación de servicios
 * (personas naturales). Formato oficial: tabla apaisada de hasta cinco filas.
 */

export const TIPO_ANEXO_5 = 'REQ_PROPUESTA_LOCACION';
export const CARPETA_ANEXO_5 = 'requerimiento';

const NEGRO = '#000000';
const FILAS_OFICIALES = 5;

export function nombreArchivoAnexo5(detalle: { Codigo?: string }): string {
  return `Anexo 5 - ${detalle.Codigo || 'requerimiento'}.pdf`;
}

export function extraDatosAdicionales(detalle: RequerimientoDetalle | any): any {
  const raw = detalle?.DatosAdicionales;
  if (!raw) {
    return {};
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

export function proveedoresDelRequerimiento(detalle: RequerimientoDetalle | any): ProveedorFormularioRequerimiento[] {
  const extra = extraDatosAdicionales(detalle);
  const lista = extra.Proveedores || extra.proveedores;
  if (Array.isArray(lista) && lista.length) {
    return lista;
  }
  const uno = extra.Proveedor || extra.proveedor;
  return uno ? [uno] : [];
}

export function construirAnexo5(detalle: RequerimientoDetalle | any): any {
  const proveedores = proveedoresDelRequerimiento(detalle);
  const pedidos: PedidoRequerimiento[] = detalle?.Pedidos || [];
  const extra = extraDatosAdicionales(detalle);
  const pedidosExtra = extra.PedidosExtra || extra.pedidosExtra || [];
  const area = [detalle?.CentroCostoNombre, detalle?.CentroCosto]
    .filter(x => !!x)
    .join(' — ');
  const denominacion = detalle?.Denominacion || '';
  const plazo = detalle?.PlazoDias != null ? String(detalle.PlazoDias) : '';

  const filas = Array.from({ length: FILAS_OFICIALES }, (_, indice) =>
    filaPropuesta(indice, proveedores[indice], pedidos[indice], pedidosExtra[indice], {
      area,
      denominacion,
      plazo
    })
  );

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [22, 28, 22, 48],
    info: {
      title: `Anexo N.° 05 · ${detalle?.Codigo || ''}`,
      author: 'Autoridad Nacional de Infraestructura'
    },

    footer: (pagina: number, total: number) => ({
      margin: [22, 6, 22, 12],
      columns: [
        {
          width: 260,
          stack: [
            {
              canvas: [{
                type: 'rect', x: 0, y: 0, w: 250, h: 28,
                lineWidth: 0.7, lineColor: NEGRO
              }]
            },
            {
              text: 'FIRMA DIGITAL',
              fontSize: 7,
              color: NEGRO,
              margin: [8, -22, 0, 0]
            },
            detalle?.Responsable
              ? { text: detalle.Responsable, fontSize: 7, margin: [8, 2, 0, 0] }
              : {}
          ]
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
              { text: 'ANEXO N° 05', style: 'titulo' },
              {
                text: 'PROPUESTA DEL ÁREA USUARIA PARA LA CONTRATACIÓN DE SERVICIOS TÉCNICOS, PROFESIONALES Y/O ESPECIALIZADOS REALIZADOS POR PERSONAS NATURALES',
                style: 'subtitulo',
                margin: [0, 4, 0, 0]
              }
            ]
          }
        ],
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: [18, 62, 78, 52, 48, 70, 48, 78, 48, 48, 42, 48, 48],
          body: [
            [
              celdaTh('N°'),
              celdaTh('ÁREA USUARIA'),
              celdaTh('APELLIDOS Y NOMBRES DEL PROVEEDOR PROPUESTO'),
              celdaTh('RUC'),
              celdaTh('DNI'),
              celdaTh('CORREO ELECTRÓNICO'),
              celdaTh('CELULAR'),
              celdaTh('DENOMINACIÓN DE LA CONTRATACIÓN (TDR)'),
              celdaTh('MONTO MENSUAL (S/)'),
              celdaTh('MONTO TOTAL (S/)'),
              celdaTh('PLAZO DE EJECUCIÓN (DÍAS CALENDARIO)'),
              celdaTh('TIPO DE REGISTRO'),
              celdaTh('PEDIDO SIGA')
            ],
            ...filas
          ]
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => NEGRO,
          vLineColor: () => NEGRO,
          paddingTop: () => 3,
          paddingBottom: () => 3,
          paddingLeft: () => 2,
          paddingRight: () => 2
        }
      }
    ],

    styles: {
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 8, bold: true, alignment: 'center', color: NEGRO }
    },

    defaultStyle: { font: 'Roboto' }
  };
}

function celdaTh(texto: string): any {
  return {
    text: texto,
    bold: true,
    fontSize: 6,
    alignment: 'center',
    color: NEGRO
  };
}

function celdaTd(texto: string, alineacion: 'left' | 'center' | 'right' = 'left'): any {
  return {
    text: texto || ' ',
    fontSize: 6.5,
    alignment: alineacion,
    color: NEGRO
  };
}

function filaPropuesta(
  indice: number,
  proveedor: ProveedorFormularioRequerimiento | undefined,
  pedido: PedidoRequerimiento | undefined,
  pedidoExtra: any,
  comunes: { area: string; denominacion: string; plazo: string }
): any[] {
  if (!proveedor) {
    return [
      celdaTd(String(indice + 1), 'center'),
      celdaTd(''), celdaTd(''), celdaTd(''), celdaTd(''),
      celdaTd(''), celdaTd(''), celdaTd(''), celdaTd(''),
      celdaTd(''), celdaTd(''), celdaTd(''), celdaTd('')
    ];
  }

  const nombre = [proveedor.ApellidoPaterno, proveedor.ApellidoMaterno, proveedor.Nombres]
    .filter(x => !!x)
    .join(' ')
    .trim();
  const mensual = Number(proveedor.MontoMensual);
  const total = montoTotalProveedor(proveedor);
  const nroPedido = pedido?.NumeroPedido
    || pedidoExtra?.NumeroPedido
    || '';

  return [
    celdaTd(String(indice + 1), 'center'),
    celdaTd(comunes.area, 'center'),
    celdaTd(nombre),
    celdaTd(proveedor.Ruc || '', 'center'),
    celdaTd(proveedor.Dni || '', 'center'),
    celdaTd(proveedor.Email || ''),
    celdaTd(proveedor.Celular || '', 'center'),
    celdaTd(comunes.denominacion),
    celdaTd(numero(mensual), 'right'),
    celdaTd(numero(total), 'right'),
    celdaTd(comunes.plazo, 'center'),
    celdaTd(proveedor.TipoRegistro || '', 'center'),
    celdaTd(nroPedido, 'center')
  ];
}

function numero(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) {
    return '';
  }
  return valor.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
