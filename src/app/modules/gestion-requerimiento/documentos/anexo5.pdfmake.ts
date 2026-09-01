import {
  PedidoRequerimiento,
  ProveedorFormularioRequerimiento,
  RequerimientoDetalle,
  montoTotalProveedor
} from '../models/requerimiento.model';

/**
 * Anexo N.° 05 — Propuesta del Área usuaria para locación de servicios
 * (personas naturales). Una fila por postor registrado; no se rellenan
 * tuplas vacías.
 */

export const TIPO_ANEXO_5 = 'REQ_PROPUESTA_LOCACION';
export const CARPETA_ANEXO_5 = 'requerimiento';

const NEGRO = '#000000';

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
  const pedidosExtraRaw = extra.PedidosExtra || extra.pedidosExtra;
  const pedidosExtra = Array.isArray(pedidosExtraRaw) ? pedidosExtraRaw : [];
  const area = [detalle?.CentroCostoNombre, detalle?.CentroCosto]
    .filter(x => !!x)
    .join(' — ');
  const denominacion = detalle?.Denominacion || '';
  const plazo = detalle?.PlazoDias != null ? String(detalle.PlazoDias) : '';

  const filas = proveedores.map((proveedor, indice) => {
    const nroPedido = (proveedor.NumeroPedido || '').trim();
    const pedido = pedidos.find(p => (p.NumeroPedido || '').trim() === nroPedido)
      || (!nroPedido ? pedidos[indice] : undefined);
    const extraPedido = pedidosExtra.find((p: any) => (p?.NumeroPedido || '').trim() === nroPedido)
      || (!nroPedido ? pedidosExtra[indice] : undefined);
    return filaPropuesta(indice, proveedor, pedido, extraPedido, {
      area,
      denominacion,
      plazo
    });
  });

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [22, 28, 22, 36],
    info: {
      title: `Anexo N.° 05 · ${detalle?.Codigo || ''}`,
      author: 'Autoridad Nacional de Infraestructura'
    },

    footer: (pagina: number, total: number) => ({
      margin: [22, 8, 22, 12],
      text: `Página ${pagina} de ${total}`,
      fontSize: 8,
      alignment: 'right'
    }),

    content: [
      {
        stack: [
          { text: 'ANEXO N° 05', style: 'titulo' },
          {
            text: 'PROPUESTA DEL ÁREA USUARIA PARA LA CONTRATACIÓN DE SERVICIOS TÉCNICOS, PROFESIONALES Y/O ESPECIALIZADOS REALIZADOS POR PERSONAS NATURALES',
            style: 'subtitulo',
            margin: [0, 4, 0, 0]
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
      },
      {
        text: 'En señal de conformidad. Cada firmante coloca su sello digital en su espacio, sin superponer firmas:',
        fontSize: 8,
        margin: [0, 18, 0, 8]
      },
      {
        unbreakable: true,
        columnGap: 40,
        columns: [
          espacioFirmaAnexo5('1. Especialista del Área usuaria'),
          espacioFirmaAnexo5('2. Jefe del Área usuaria')
        ]
      }
    ],

    styles: {
      titulo: { fontSize: 12, bold: true, alignment: 'center', color: NEGRO },
      subtitulo: { fontSize: 8, bold: true, alignment: 'center', color: NEGRO }
    },

    defaultStyle: { font: 'Roboto' }
  };
}

function espacioFirmaAnexo5(rol: string): any {
  return {
    width: '*',
    alignment: 'center',
    stack: [
      { text: rol, fontSize: 8, bold: true, margin: [0, 0, 0, 4] },
      { text: '', margin: [0, 0, 0, 28] },
      {
        canvas: [{ type: 'line', x1: 20, y1: 0, x2: 220, y2: 0, lineWidth: 0.6, lineColor: NEGRO }],
        margin: [0, 0, 0, 4]
      },
      { text: 'Firma digital', fontSize: 7.5, color: NEGRO }
    ]
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
  proveedor: ProveedorFormularioRequerimiento,
  pedido: PedidoRequerimiento | undefined,
  pedidoExtra: any,
  comunes: { area: string; denominacion: string; plazo: string }
): any[] {
  const nombre = [proveedor.ApellidoPaterno, proveedor.ApellidoMaterno, proveedor.Nombres]
    .filter(x => !!x)
    .join(' ')
    .trim();
  const mensual = Number(proveedor.MontoMensual);
  const total = montoTotalProveedor(proveedor);
  const nroPedido = proveedor.NumeroPedido
    || pedido?.NumeroPedido
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
