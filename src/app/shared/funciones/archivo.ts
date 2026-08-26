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
