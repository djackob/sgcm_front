/**
 * Anexos 6 y 7 de la Directiva 002-2026-ANIN: plantillas Word oficiales
 * (assets/plantillas/Anexo6.docx y Anexo7.docx) con los datos del
 * requerimiento ya volcados. Banco y CCI quedan para el locador.
 */
import JSZip from 'jszip';
import {
  RequerimientoDetalle,
  montoTotalProveedor
} from '../models/requerimiento.model';
import { extraDatosAdicionales } from './anexo5.pdfmake';
import {
  montoTotalLocacion,
  nombreCompletoLocador,
  proveedorPrincipal
} from './filtro-idoneidad.util';
import { CARPETA_ANEXO_6, TIPO_ANEXO_6 } from './anexo6.pdfmake';
import { CARPETA_ANEXO_7, TIPO_ANEXO_7 } from './anexo7.pdfmake';

export { TIPO_ANEXO_6, CARPETA_ANEXO_6, TIPO_ANEXO_7, CARPETA_ANEXO_7 };

export const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const cachePlantilla = new Map<string, ArrayBuffer>();

export function nombreArchivoAnexo6Word(detalle: { Codigo?: string }): string {
  return `Anexo 6 - ${detalle.Codigo || 'requerimiento'}.docx`;
}

export function nombreArchivoAnexo7Word(detalle: { Codigo?: string }): string {
  return `Anexo 7 - ${detalle.Codigo || 'requerimiento'}.docx`;
}

export function construirAnexo6Word(detalle: RequerimientoDetalle | any): Promise<Blob> {
  return rellenarPlantilla('Anexo6.docx', tokensAnexo6(detalle));
}

export function construirAnexo7Word(detalle: RequerimientoDetalle | any): Promise<Blob> {
  return rellenarPlantilla('Anexo7.docx', tokensAnexo7(detalle));
}

function tokensAnexo6(detalle: RequerimientoDetalle | any): Record<string, string> {
  const proveedor = proveedorPrincipal(detalle);
  const extra = extraDatosAdicionales(detalle);
  const nombre = nombreCompletoLocador(proveedor);
  const items = filasOferta(detalle);
  const primero = items[0];
  const segundo = items[1];
  const total = items.reduce((acc, fila) => acc + fila.total, 0)
    || (proveedor ? montoTotalProveedor(proveedor) : 0)
    || Number(detalle?.Monto)
    || 0;
  const plazo = Number(detalle?.PlazoDias) > 0 ? Number(detalle.PlazoDias) : 0;

  return {
    '{{A6_NOMBRE}}': nombre,
    '{{A6_DNI}}': proveedor?.Dni || '',
    '{{A6_RUC}}': proveedor?.Ruc || '',
    '{{A6_DIRECCION}}': proveedor?.Direccion || extra?.Direccion || '',
    '{{A6_CONTACTO}}': nombre,
    '{{A6_TELEFONO}}': proveedor?.Celular || '',
    '{{A6_EMAIL}}': proveedor?.Email || '',
    '{{A6_MONEDA}}': 'SOLES',
    '{{A6_DESCRIPCION}}': primero?.descripcion || detalle?.Denominacion || '',
    '{{A6_CANTIDAD}}': primero ? String(primero.cantidad) : '',
    '{{A6_PUNIT}}': primero ? soles(primero.unitario) : '',
    '{{A6_PTOTAL}}': primero ? soles(primero.total) : '',
    '{{A6_DESCRIPCION2}}': segundo?.descripcion || '',
    '{{A6_CANTIDAD2}}': segundo ? String(segundo.cantidad) : '',
    '{{A6_PUNIT2}}': segundo ? soles(segundo.unitario) : '',
    '{{A6_PTOTAL2}}': segundo ? soles(segundo.total) : '',
    '{{A6_TOTAL}}': soles(total),
    '{{A6_PLAZO}}': plazo ? `${plazo} días calendario` : '',
    '{{A6_LUGAR_FECHA}}': lugarFecha()
  };
}

function tokensAnexo7(detalle: RequerimientoDetalle | any): Record<string, string> {
  const proveedor = proveedorPrincipal(detalle);
  return {
    '{{A7_NOMBRE}}': nombreCompletoLocador(proveedor),
    '{{A7_DNI}}': proveedor?.Dni || '',
    '{{A7_FECHA}}': lugarFecha()
  };
}

function filasOferta(detalle: RequerimientoDetalle | any): {
  descripcion: string;
  cantidad: number;
  unitario: number;
  total: number;
}[] {
  const items = Array.isArray(detalle?.Items) ? detalle.Items : [];
  const filas = items
    .map((item: any) => {
      const cantidad = Number(item?.Cantidad) > 0 ? Number(item.Cantidad) : 0;
      const unitario = Number(item?.PrecioUnitario) > 0 ? Number(item.PrecioUnitario) : 0;
      const total = Number(item?.Monto) > 0 ? Number(item.Monto) : cantidad * unitario;
      const descripcion = String(
        item?.Descripcion || item?.DescripcionServicio || item?.CodigoItem || ''
      ).trim();
      if (!descripcion && !(total > 0) && !(cantidad > 0)) {
        return null;
      }
      return {
        descripcion: descripcion || String(detalle?.Denominacion || '').trim(),
        cantidad: cantidad || 1,
        unitario: unitario || total,
        total: total || unitario * (cantidad || 1)
      };
    })
    .filter((fila: any) => !!fila);

  if (filas.length) {
    return filas;
  }

  const proveedor = proveedorPrincipal(detalle);
  const total = montoTotalLocacion(detalle, proveedor);
  return [{
    descripcion: String(detalle?.Denominacion || '').trim(),
    cantidad: 1,
    unitario: total,
    total
  }];
}

function soles(valor: number): string {
  if (!(valor > 0)) {
    return '';
  }
  return valor.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function lugarFecha(fecha = new Date()): string {
  return `Lima, ${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

function escXml(texto: string): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function rellenarPlantilla(
  archivo: string,
  tokens: Record<string, string>
): Promise<Blob> {
  const zip = await JSZip.loadAsync(await cargarPlantilla(archivo));
  const nombres = Object.keys(zip.files);
  for (const nombre of nombres) {
    if (!/\.(xml|rels)$/i.test(nombre) || zip.files[nombre].dir) {
      continue;
    }
    const original = await zip.file(nombre)!.async('string');
    const lleno = aplicarTokens(original, tokens);
    if (lleno !== original) {
      zip.file(nombre, lleno);
    }
  }
  return zip.generateAsync({
    type: 'blob',
    mimeType: MIME_DOCX,
    compression: 'DEFLATE'
  });
}

function aplicarTokens(xml: string, tokens: Record<string, string>): string {
  let out = xml;
  for (const [token, valor] of Object.entries(tokens)) {
    if (out.indexOf(token) < 0) {
      continue;
    }
    out = out.split(token).join(escXml(valor));
  }
  return out.replace(/\{\{A[67]_[A-Z0-9_]+\}\}/g, '');
}

async function cargarPlantilla(archivo: string): Promise<ArrayBuffer> {
  const ruta = `assets/plantillas/${archivo}`;
  const cacheado = cachePlantilla.get(ruta);
  if (cacheado) {
    return cacheado.slice(0);
  }
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se encontró la plantilla ${archivo} de la directiva.`);
  }
  const buffer = await respuesta.arrayBuffer();
  cachePlantilla.set(ruta, buffer);
  return buffer.slice(0);
}
