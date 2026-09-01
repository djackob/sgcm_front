import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { RequerimientoDetalle } from '../models/requerimiento.model';
import { RequerimientoService } from '../services/requerimiento.service';
import { crearTdrLocacion, TdrLocacion } from './anexo3-tdr.plantilla';
import { TIPO_ANEXO_3 } from './anexo3.pdfmake';
import {
  documentoLocador,
  montoTotalLocacion,
  nombreCompletoLocador,
  pedidoExtra,
  pedidoPrincipal,
  proveedorPrincipal
} from './filtro-idoneidad.util';

export interface OrdenServicioFormulario {
  FechaEmision: string;
  NotasAdicionales: string;
}

export function formularioOrdenVacio(): OrdenServicioFormulario {
  return {
    FechaEmision: new Date().toISOString().substring(0, 10),
    NotasAdicionales: ''
  };
}

export function leerTdrDesdePayload(payload: any): Partial<TdrLocacion> | null {
  const datos = typeof payload === 'string' ? parsearJson(payload) : (payload || {});
  const tdr = datos.Tdr || datos.tdr || datos;
  if (!tdr || typeof tdr !== 'object' || Array.isArray(tdr)) {
    return null;
  }
  if (!tdr.FinalidadPublica && !tdr.Objetivo && !tdr.Entregables) {
    return null;
  }
  return tdr;
}

export function crearTdrDesdeDetalle(detalle: RequerimientoDetalle | any): TdrLocacion {
  return crearTdrLocacion({
    plazoDias: detalle?.PlazoDias,
    unidad: detalle?.CentroCostoNombre
  });
}

export function combinarTdr(detalle: RequerimientoDetalle | any, previo: Partial<TdrLocacion> | null): TdrLocacion {
  const base = crearTdrDesdeDetalle(detalle);
  if (!previo) {
    return base;
  }
  return {
    ...base,
    ...previo,
    Entregables: previo.Entregables?.length ? previo.Entregables : base.Entregables,
    Actividades: previo.Actividades?.length ? previo.Actividades : base.Actividades
  };
}

export function cargarTdrExpediente(
  requerimientoService: RequerimientoService,
  detalle: RequerimientoDetalle | any
): Observable<TdrLocacion> {
  const base = crearTdrDesdeDetalle(detalle);
  if (!detalle?.IdExpediente) {
    return of(base);
  }
  return requerimientoService.listarDocumento(detalle.IdExpediente).pipe(
    map((docs: any) => {
      const tdrDoc = (docs?.Documentos || [])
        .find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_3);
      const previo = leerTdrDesdePayload(tdrDoc?.Payload);
      return combinarTdr(detalle, previo);
    })
  );
}

export function resumenLocador(detalle: RequerimientoDetalle | any): string {
  const proveedor = proveedorPrincipal(detalle);
  const nombre = nombreCompletoLocador(proveedor);
  const doc = documentoLocador(proveedor);
  return doc ? `${nombre} (${doc})` : nombre;
}

export function resumenMonto(detalle: RequerimientoDetalle | any): string {
  const proveedor = proveedorPrincipal(detalle);
  const total = montoTotalLocacion(detalle, proveedor);
  const mensual = Number(proveedor?.MontoMensual) || 0;
  const entregables = Number(proveedor?.CantidadEntregables) || 0;
  if (entregables && mensual) {
    return `S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `
      + `(${entregables} pagos de S/ ${mensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  return `S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function resumenMetaClasificador(detalle: RequerimientoDetalle | any): string {
  const pedido = pedidoPrincipal(detalle);
  const proveedor = proveedorPrincipal(detalle);
  const extra = pedidoExtra(detalle, pedido?.NumeroPedido || proveedor?.NumeroPedido || '');
  const meta = extra.MetaPresupuestaria || pedido?.SecFunc || '—';
  const clasificador = pedido?.Clasificador || extra.Clasificador || '—';
  return `${meta} / ${clasificador}`;
}

function parsearJson(valor: string): any {
  try {
    return JSON.parse(valor) || {};
  } catch {
    return {};
  }
}
