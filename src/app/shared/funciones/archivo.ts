import { ConfigService } from '../../core/services/config.service';

const MAXIMO_SUBIDA_POR_DEFECTO = 70 * 1024 * 1024;

/** Tope de subida en bytes: MAX_SIZE_UPLOAD de config.json o 70 MB. */
export function maximoSubidaBytes(): number {
  const valor = Number(ConfigService.settings?.MAX_SIZE_UPLOAD);
  return valor > 0 ? valor : MAXIMO_SUBIDA_POR_DEFECTO;
}

export function textoMaximoSubida(): string {
  return `Peso máximo por archivo: ${Math.round(maximoSubidaBytes() / 1024 / 1024)} MB`;
}

export function excedeMaximoSubida(archivo: File | null | undefined): boolean {
  return !!archivo && archivo.size > maximoSubidaBytes();
}

export function mensajeExcedeMaximo(archivo: File): string {
  const mb = (archivo.size / 1024 / 1024).toFixed(1);
  return `«${archivo.name}» pesa ${mb} MB. ${textoMaximoSubida()}.`;
}

/**
 * Identificador de archivo que devuelve SubirArchivo (documento_sistema).
 * Si llegó una URL antigua, se queda con el último segmento.
 */
export function idDocumentoSistema(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }

  const limpio = String(valor).trim().split('?')[0].replace(/\\/g, '/');
  const partes = limpio.split('/');
  return partes[partes.length - 1] || '';
}

/** El id de file server, no un marcador interno del formulario. */
export function esPdfDelFileServer(valor: string | null | undefined): boolean {
  const limpio = String(valor || '').trim();
  if (!limpio || limpio.startsWith('interno://')) {
    return false;
  }
  return !!idDocumentoSistema(limpio);
}

export function esBlobJson(blob: Blob | null | undefined): boolean {
  return !!blob && (blob.type || '').toLowerCase().includes('json');
}
