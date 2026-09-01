import {
  PedidoRequerimiento,
  ProveedorFormularioRequerimiento,
  RequerimientoDetalle,
  montoTotalProveedor
} from '../models/requerimiento.model';
import { extraDatosAdicionales, proveedoresDelRequerimiento } from './anexo5.pdfmake';

export interface FiltroIdoneidadVista {
  CodigoFiltro: string;
  Tipo: string;
  Resultado: string;
  Orden?: number;
  Observacion?: string | null;
  GeneradoDocumentoEvidencia?: string | null;
  NombreDocumentoEvidencia?: string | null;
}

export const ETIQUETA_CORTA_FILTRO: Record<string, string> = {
  RNSSC: 'RNSSC',
  REDAM: 'REDAM',
  RPS_TCP: 'OSCE',
  REDJUM: 'REDJUM',
  DEBIDA_DILIGENCIA: 'DEB. DILIG.'
};

export const TIPO_MEMO_CCP = 'REQ_MEMO_CCP';
export const TIPO_CCP = 'REQ_CCP';
export const TIPO_MEMO_UP_CCP = 'REQ_MEMO_UP_CCP';
export const TIPO_PREVISION_PRESUP = 'REQ_PREVISION_PRESUP';
export const CARPETA_MEMO_CCP = 'requerimiento';

export function etiquetaCortaFiltro(codigo: string): string {
  return ETIQUETA_CORTA_FILTRO[codigo] || codigo;
}

export function esApto(resultado: string): boolean {
  return resultado === 'CONFORME';
}

export function esNoApto(resultado: string): boolean {
  return resultado === 'NO_CONFORME';
}

export function etiquetaAptitud(resultado: string): 'Apto' | 'No Apto' | 'Pendiente' {
  if (esApto(resultado)) {
    return 'Apto';
  }
  if (esNoApto(resultado)) {
    return 'No Apto';
  }
  return 'Pendiente';
}

export function hayImpedimentoIdoneidad(filtros: FiltroIdoneidadVista[]): boolean {
  return filtros.some((filtro) => esNoApto(filtro.Resultado));
}

export function proveedorPrincipal(detalle: RequerimientoDetalle | any): ProveedorFormularioRequerimiento | null {
  const lista = proveedoresDelRequerimiento(detalle);
  return lista.length ? lista[0] : null;
}

export function pedidoPrincipal(detalle: RequerimientoDetalle | any): PedidoRequerimiento | null {
  const pedidos: PedidoRequerimiento[] = detalle?.Pedidos || [];
  const proveedor = proveedorPrincipal(detalle);
  if (proveedor?.NumeroPedido) {
    const encontrado = pedidos.find(
      (pedido) => (pedido.NumeroPedido || '').trim() === proveedor.NumeroPedido.trim()
    );
    if (encontrado) {
      return encontrado;
    }
  }
  return pedidos.length ? pedidos[0] : null;
}

export function pedidoExtra(detalle: RequerimientoDetalle | any, numeroPedido: string): any {
  const extra = extraDatosAdicionales(detalle);
  const lista = extra.PedidosExtra || extra.pedidosExtra || [];
  return lista.find((pedido: any) => (pedido?.NumeroPedido || '').trim() === (numeroPedido || '').trim()) || lista[0] || {};
}

export function nombreCompletoLocador(proveedor: ProveedorFormularioRequerimiento | null): string {
  if (!proveedor) {
    return '';
  }
  return [proveedor.ApellidoPaterno, proveedor.ApellidoMaterno, proveedor.Nombres]
    .filter((parte) => !!parte)
    .join(' ')
    .trim();
}

export function documentoLocador(proveedor: ProveedorFormularioRequerimiento | null): string {
  if (!proveedor) {
    return '';
  }
  if (proveedor.Ruc) {
    return proveedor.Ruc;
  }
  return proveedor.Dni || '';
}

export function montoTotalLocacion(detalle: RequerimientoDetalle | any, proveedor: ProveedorFormularioRequerimiento | null): number {
  if (proveedor) {
    return montoTotalProveedor(proveedor);
  }
  return Number(detalle?.Monto) || 0;
}

export function construirTextoMemorando(detalle: RequerimientoDetalle | any, notas?: string): string {
  const proveedor = proveedorPrincipal(detalle);
  const pedido = pedidoPrincipal(detalle);
  const pedidoExtraData = pedidoExtra(detalle, pedido?.NumeroPedido || proveedor?.NumeroPedido || '');
  const nombreLocador = nombreCompletoLocador(proveedor) || 'el locador propuesto';
  const montoTotal = montoTotalLocacion(detalle, proveedor);
  const numeroPedido = pedido?.NumeroPedido || proveedor?.NumeroPedido || '—';
  const entregables = proveedor?.CantidadEntregables || 0;
  const montoMensual = proveedor?.MontoMensual || 0;
  const meta = pedidoExtraData.MetaPresupuestaria || pedido?.SecFunc || '—';
  const fuente = pedido?.FuenteFinanc || pedidoExtraData.FuenteFinanc || '—';
  const clasificador = pedido?.Clasificador || pedidoExtraData.Clasificador || '—';

  const parrafos = [
    'Se solicita la Certificación de Crédito Presupuestario (CCP) para la contratación de '
      + `${nombreLocador} por el monto total de S/. ${montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `
      + `para realizar las actividades detalladas en el Pedido SIGA N° ${numeroPedido}, `
      + `correspondiente al servicio "${detalle?.Denominacion || ''}".`,
    '',
    `La estructura de costos contempla ${entregables || '—'} entregable(s) por S/. `
      + `${Number(montoMensual).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cada uno.`,
    '',
    `Meta presupuestaria: ${meta}. Fuente de financiamiento: ${fuente}. Clasificador de gastos: ${clasificador}.`,
    '',
    'Por lo expuesto, se solicita a la Oficina de Planeamiento y Presupuesto emitir la certificación correspondiente.'
  ];

  if (notas?.trim()) {
    parrafos.push('', 'Notas adicionales:', notas.trim());
  }

  return parrafos.join('\n');
}

export function nombreArchivoMemoCcp(detalle: { Codigo?: string }): string {
  return `Memorando CCP - ${detalle?.Codigo || 'requerimiento'}.pdf`;
}
