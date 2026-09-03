import {
  PedidoRequerimiento,
  ProveedorFormularioRequerimiento,
  RequerimientoDetalle,
  montoTotalProveedor,
  nombreProveedor,
  numeroDocumentoProveedor
} from '../models/requerimiento.model';
import { extraDatosAdicionales, proveedoresDelRequerimiento } from './anexo5.pdfmake';

export interface FiltroIdoneidadVista {
  CodigoFiltro: string;
  Tipo: string;
  Resultado: string;
  ResultadoPid?: string | null;
  Orden?: number;
  Origen?: string;
  Observacion?: string | null;
  GeneradoDocumentoEvidencia?: string | null;
  NombreDocumentoEvidencia?: string | null;
}

export const ETIQUETA_CORTA_FILTRO: Record<string, string> = {
  SUNAT_HABIDO: 'SUNAT',
  RNP: 'RNP',
  RNSSC: 'RNSSC',
  REDAM: 'REDAM',
  RPS_TCP: 'OSCE',
  REDJUM: 'REDJUM',
  DEBIDA_DILIGENCIA: 'DEB. DILIG.'
};

/** Nombres de la matriz (Directiva 7.2.1.10) para la ventana de trabajo DEC. */
export const ETIQUETA_MATRIZ_FILTRO: Record<string, string> = {
  RNSSC: 'Servidores sancionados (RNSSC)',
  REDAM: 'Deudores alimentarios (REDAM)',
  RPS_TCP: 'Sanciones Tribunal OSCE',
  REDJUM: 'Deudores judiciales (REDJUM)',
  DEBIDA_DILIGENCIA: 'Plataforma de Debida Diligencia'
};

/** Formalidad (bloque 2). No forman parte de la matriz de cinco. */
export const FILTROS_FORMALES = ['SUNAT_HABIDO', 'RNP'] as const;

/** Directiva 7.2.1.10: los cinco checks de idoneidad legal. */
export const FILTROS_MATRIZ = ['RNSSC', 'REDAM', 'RPS_TCP', 'REDJUM', 'DEBIDA_DILIGENCIA'] as const;

export const PORTAL_FILTRO: Record<string, { etiqueta: string; url: string }> = {
  SUNAT_HABIDO: {
    etiqueta: 'Consulta RUC SUNAT',
    url: 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaModulo.jsp'
  },
  RNP: {
    etiqueta: 'Consulta RNP',
    url: 'https://www.rnp.gob.pe/'
  },
  RNSSC: {
    etiqueta: 'RNSSC (SERVIR)',
    url: 'https://www.servir.gob.pe/registro-nacional-de-sanciones-rnssc/'
  },
  REDAM: {
    etiqueta: 'REDAM (Poder Judicial)',
    url: 'https://casillas.pj.gob.pe/redam/'
  },
  RPS_TCP: {
    etiqueta: 'Proveedores sancionados OSCE',
    url: 'https://www.gob.pe/institucion/osce'
  },
  REDJUM: {
    etiqueta: 'REDJUM (Poder Judicial)',
    url: 'https://casillas.pj.gob.pe/redjum/'
  },
  DEBIDA_DILIGENCIA: {
    etiqueta: 'Debida diligencia del sector público',
    url: 'https://www.gob.pe/872-plataforma-de-debida-diligencia-del-sector-publico'
  }
};

export const TIPO_MEMO_CCP = 'REQ_MEMO_CCP';
export const TIPO_CCP = 'REQ_CCP';
export const TIPO_MEMO_UP_CCP = 'REQ_MEMO_UP_CCP';
export const TIPO_PREVISION_PRESUP = 'REQ_PREVISION_PRESUP';
export const CARPETA_MEMO_CCP = 'requerimiento';

export function etiquetaCortaFiltro(codigo: string): string {
  return ETIQUETA_CORTA_FILTRO[codigo] || codigo;
}

export function etiquetaMatrizFiltro(codigo: string, tipoCatalogo?: string | null): string {
  return ETIQUETA_MATRIZ_FILTRO[codigo] || tipoCatalogo || codigo;
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

export function etiquetaPid(resultadoPid?: string | null): 'Apto' | 'Alerta' | 'Sin PID' | 'Pendiente' {
  if (resultadoPid === 'APTO') {
    return 'Apto';
  }
  if (resultadoPid === 'ALERTA') {
    return 'Alerta';
  }
  if (resultadoPid === 'SIN_SERVICIO') {
    return 'Sin PID';
  }
  return 'Pendiente';
}

export function esFiltroMatriz(codigo: string): boolean {
  return (FILTROS_MATRIZ as readonly string[]).includes(codigo);
}

export function esFiltroFormal(codigo: string): boolean {
  return (FILTROS_FORMALES as readonly string[]).includes(codigo);
}

export function correoLocadorValido(correo?: string | null): boolean {
  const valor = (correo || '').trim();
  return !!valor && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
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

/**
 * Delega en `nombreProveedor`, que es el único sitio que sabe si el nombre sale
 * de la razón social o de los tres campos de persona natural. Antes componía
 * aquí los apellidos, y con un proveedor identificado por RUC —que no tiene
 * apellidos— devolvía cadena vacía justo donde va el nombre del contratista.
 */
export function nombreCompletoLocador(proveedor: ProveedorFormularioRequerimiento | null): string {
  return nombreProveedor(proveedor);
}

export function documentoLocador(proveedor: ProveedorFormularioRequerimiento | null): string {
  return numeroDocumentoProveedor(proveedor);
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

export function nombreArchivoMemoCcp(detalle: { Codigo?: string }, numeroMemorando?: string | null): string {
  const numero = (numeroMemorando || '').trim();
  if (numero) {
    return `Memorando ${numero} - ${detalle?.Codigo || 'requerimiento'}.pdf`;
  }
  return `Memorando CCP - ${detalle?.Codigo || 'requerimiento'}.pdf`;
}

export function encabezadoMemorandoCcp(numeroMemorando?: string | null, anio?: number | string | null): string {
  const numero = (numeroMemorando || '').trim();
  if (numero) {
    return `MEMORANDO N° ${numero}`;
  }
  return `MEMORANDO N° _____-${anio || new Date().getFullYear()}-ANIN/OA-UA`;
}
