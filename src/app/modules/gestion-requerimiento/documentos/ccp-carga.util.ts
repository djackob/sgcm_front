import { RequerimientoDetalle } from '../models/requerimiento.model';
import {
  montoTotalLocacion,
  pedidoExtra,
  pedidoPrincipal,
  proveedorPrincipal
} from './filtro-idoneidad.util';

export interface ArchivoCcpCarga {
  documentoSistema: string;
  nombreOriginal: string;
}

export interface FormularioCcpCarga {
  NumeroCcp: string;
  NumeroExpedienteSiaf: string;
  MontoCertificado: number | null;
  FechaEmision: string;
  Observacion: string;
  archivoCcp: ArchivoCcpCarga | null;
  archivoMemoUp: ArchivoCcpCarga | null;
  archivoPrevision: ArchivoCcpCarga | null;
}

export function formularioCcpVacio(montoSugerido?: number | null): FormularioCcpCarga {
  return {
    NumeroCcp: '',
    NumeroExpedienteSiaf: '',
    MontoCertificado: montoSugerido ?? null,
    FechaEmision: new Date().toISOString().substring(0, 10),
    Observacion: '',
    archivoCcp: null,
    archivoMemoUp: null,
    archivoPrevision: null
  };
}

export function montoContratoAnexo5(detalle: RequerimientoDetalle | any): number {
  const proveedor = proveedorPrincipal(detalle);
  return montoTotalLocacion(detalle, proveedor);
}

export function requierePrevisionPresupuestal(detalle: RequerimientoDetalle | any): boolean {
  const proveedor = proveedorPrincipal(detalle);
  const entregables = Number(proveedor?.CantidadEntregables) || 0;
  const anoEje = Number(detalle?.AnoEje) || new Date().getFullYear();
  const plazo = Number(detalle?.PlazoDias) || 0;

  let fechaIni: Date;
  if (detalle?.FechaInicioPrevisto) {
    fechaIni = new Date(detalle.FechaInicioPrevisto);
  } else {
    fechaIni = new Date();
  }

  const mesIni = fechaIni.getMonth() + 1;
  if (entregables > 0 && (mesIni + entregables - 1) > 12) {
    return true;
  }

  if (plazo > 0) {
    const fin = new Date(fechaIni);
    fin.setDate(fin.getDate() + plazo);
    if (fin.getFullYear() > anoEje) {
      return true;
    }
  }

  return false;
}

export function fechaSolicitudCcpTexto(detalle: RequerimientoDetalle | any): string {
  const raw = detalle?.Ccp?.FechaSolicitud;
  if (!raw) {
    return '—';
  }
  const fecha = new Date(raw);
  if (Number.isNaN(fecha.getTime())) {
    return String(raw).substring(0, 10);
  }
  return fecha.toLocaleDateString('es-PE');
}

export function metaClasificadorTexto(detalle: RequerimientoDetalle | any): string {
  const pedido = pedidoPrincipal(detalle);
  const proveedor = proveedorPrincipal(detalle);
  const extra = pedidoExtra(detalle, pedido?.NumeroPedido || proveedor?.NumeroPedido || '');
  const meta = extra.MetaPresupuestaria || pedido?.SecFunc || '—';
  const clasificador = pedido?.Clasificador || extra.Clasificador || '—';
  return `${meta} / ${clasificador}`;
}

export function validarFormularioCcp(
  formulario: FormularioCcpCarga,
  detalle: RequerimientoDetalle | any
): string | null {
  if (!formulario.NumeroCcp.trim()) {
    return 'Indique el número de certificación (CCP).';
  }
  if (!formulario.NumeroExpedienteSiaf.trim()) {
    return 'Indique el número de expediente SIAF.';
  }
  if (formulario.MontoCertificado == null || formulario.MontoCertificado <= 0) {
    return 'Indique el monto certificado.';
  }
  const montoContrato = montoContratoAnexo5(detalle);
  if (Math.abs(formulario.MontoCertificado - montoContrato) > 0.01) {
    return 'El monto de la certificación ingresada no coincide con el monto total de la propuesta económica del Anexo 5. Revise el expediente.';
  }
  if (!formulario.FechaEmision) {
    return 'Indique la fecha de emisión de la CCP.';
  }
  const fechaSolicitud = detalle?.Ccp?.FechaSolicitud;
  if (fechaSolicitud) {
    const emision = new Date(formulario.FechaEmision);
    const solicitud = new Date(fechaSolicitud);
    if (!Number.isNaN(emision.getTime()) && !Number.isNaN(solicitud.getTime())
      && emision < new Date(solicitud.toISOString().substring(0, 10))) {
      return 'La fecha de emisión no puede ser anterior a la fecha de solicitud de la CCP.';
    }
  }
  if (!formulario.archivoCcp?.documentoSistema) {
    return 'Adjunte el PDF de la certificación presupuestaria (CCP).';
  }
  if (!formulario.archivoMemoUp?.documentoSistema) {
    return 'Adjunte el memorando de respuesta de la Unidad de Presupuesto.';
  }
  if (requierePrevisionPresupuestal(detalle) && !formulario.archivoPrevision?.documentoSistema) {
    return 'El plazo supera el año fiscal. Adjunte la previsión presupuestal aprobada por OPP.';
  }
  return null;
}

export function nombreSugeridoCcp(numeroCcp: string): string {
  const limpio = (numeroCcp || 'CCP').replace(/[^\w\-]+/g, '_');
  return `CCP_${limpio}.pdf`;
}

/** El API a veces devuelve Ccp como objeto o como JSON en string. */
export function normalizarCcp(detalle: RequerimientoDetalle | any): any | null {
  const raw = detalle?.Ccp ?? detalle?.ccp;
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function ccpTieneDatos(ccp: any): boolean {
  return !!ccp && !!String(ccp.NumeroCcp || '').trim();
}

export function ccpDesdeFormulario(
  formulario: FormularioCcpCarga
): Record<string, unknown> {
  return {
    NumeroCcp: formulario.NumeroCcp.trim(),
    NumeroExpedienteSiaf: formulario.NumeroExpedienteSiaf.trim(),
    MontoCertificado: formulario.MontoCertificado,
    FechaEmision: formulario.FechaEmision,
    Observacion: formulario.Observacion.trim() || null,
    GeneradoDocumentoCcp: formulario.archivoCcp?.documentoSistema,
    NombreDocumentoCcp: formulario.archivoCcp?.nombreOriginal,
    GeneradoDocumentoMemoUp: formulario.archivoMemoUp?.documentoSistema,
    NombreDocumentoMemoUp: formulario.archivoMemoUp?.nombreOriginal,
    GeneradoDocumentoPrevision: formulario.archivoPrevision?.documentoSistema,
    NombreDocumentoPrevision: formulario.archivoPrevision?.nombreOriginal
  };
}
