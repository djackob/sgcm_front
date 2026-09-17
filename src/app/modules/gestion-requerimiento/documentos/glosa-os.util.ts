/**
 * Glosa contractual para pegar / inyectar en SIGA Escritorio (Orden de Servicio).
 * Directiva: Denominación + Plazo + Forma de pago + Cláusula anticorrupción + Lugar.
 */
import {
  ANTICORRUPCION,
  TdrLocacion,
  textoFormaPago
} from './anexo3-tdr.plantilla';

export function construirGlosaOrdenServicio(detalle: {
  Denominacion?: string;
  PlazoDias?: number | null;
}, tdr: TdrLocacion | null | undefined, nEntregables?: number | null): string {
  const denominacion = (detalle?.Denominacion || '').trim() || '[Denominación del servicio]';
  const plazoDias = detalle?.PlazoDias
    || (tdr ? (tdr.Entregables || []).reduce((s, e) => Math.max(s, Number(e.Dias) || 0), 0) : 0);
  const plazo = plazoDias > 0
    ? `${plazoDias} días calendario`
    : '[Plazo de ejecución]';
  const n = nEntregables || tdr?.Entregables?.length || 1;
  const formaPago = textoFormaPago(n);
  const lugar = (tdr?.LugarPrestacion || '').trim() || '[Lugar de prestación]';
  const anticorrupcion = (ANTICORRUPCION || '').trim();

  return [
    `DENOMINACIÓN: ${denominacion}`,
    `PLAZO DE EJECUCIÓN: ${plazo}`,
    `FORMA DE PAGO: ${formaPago}`,
    `CLÁUSULA ANTICORRUPCIÓN Y ANTISOBORNO: ${anticorrupcion}`,
    `LUGAR DE PRESTACIÓN: ${lugar}`
  ].join('\n\n');
}
