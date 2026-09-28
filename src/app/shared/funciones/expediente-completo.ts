import JSZip from 'jszip';
import { PDFDocument, PDFImage } from 'pdf-lib';

export interface ArchivoExpediente {
  grupo: string;
  nombre: string;
  blob: Blob;
}

export interface ArchivoPreparado extends ArchivoExpediente {
  tipo: 'PDF' | 'PNG' | 'JPG' | 'OTRO';
  pdf?: PDFDocument;
  bytes?: Uint8Array;
  incluido: boolean;
}

const A4: [number, number] = [595.28, 841.89];

/**
 * Reconoce el tipo por la firma del archivo, no por la extensión ni el MIME:
 * el file server entrega casi todo como application/octet-stream.
 */
export async function prepararArchivos(archivos: ArchivoExpediente[]): Promise<ArchivoPreparado[]> {
  const preparados: ArchivoPreparado[] = [];
  for (const a of archivos) {
    const bytes = new Uint8Array(await a.blob.arrayBuffer());
    const tipo = tipoPorFirma(bytes);
    const p: ArchivoPreparado = { ...a, tipo, bytes, incluido: tipo === 'PNG' || tipo === 'JPG' };
    if (tipo === 'PDF') {
      try {
        p.pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        p.incluido = true;
      } catch {
        p.incluido = false;
      }
    }
    preparados.push(p);
  }
  return preparados;
}

/** Carátula primero y luego cada archivo en el orden recibido. */
export async function unirEnPdf(caratula: Blob, archivos: ArchivoPreparado[]): Promise<Blob> {
  const destino = await PDFDocument.create();
  const primera = await PDFDocument.load(new Uint8Array(await caratula.arrayBuffer()));
  (await destino.copyPages(primera, primera.getPageIndices())).forEach(pg => destino.addPage(pg));

  for (const a of archivos) {
    if (!a.incluido) {
      continue;
    }
    if (a.pdf) {
      const paginas = await destino.copyPages(a.pdf, a.pdf.getPageIndices());
      paginas.forEach(pg => destino.addPage(pg));
      continue;
    }
    const imagen: PDFImage = a.tipo === 'PNG'
      ? await destino.embedPng(a.bytes!)
      : await destino.embedJpg(a.bytes!);
    const pagina = destino.addPage(A4);
    const margen = 36;
    const escala = Math.min((A4[0] - 2 * margen) / imagen.width, (A4[1] - 2 * margen) / imagen.height, 1);
    const w = imagen.width * escala;
    const h = imagen.height * escala;
    pagina.drawImage(imagen, { x: (A4[0] - w) / 2, y: (A4[1] - h) / 2, width: w, height: h });
  }

  const salida = await destino.save();
  return new Blob([salida], { type: 'application/pdf' });
}

/** Archivos originales agrupados en carpetas, con la carátula como índice. */
export async function empaquetarZip(caratula: Blob, archivos: ArchivoExpediente[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file('00 Indice del expediente.pdf', caratula);
  const usados = new Set<string>();
  const grupos = Array.from(new Set(archivos.map(a => a.grupo)));
  archivos.forEach(a => {
    const carpeta = `${String(grupos.indexOf(a.grupo) + 1).padStart(2, '0')} ${limpiar(a.grupo)}`;
    let nombre = limpiar(a.nombre) || 'documento';
    let ruta = `${carpeta}/${nombre}`;
    let n = 2;
    while (usados.has(ruta.toLowerCase())) {
      const punto = nombre.lastIndexOf('.');
      const base = punto > 0 ? nombre.slice(0, punto) : nombre;
      const ext = punto > 0 ? nombre.slice(punto) : '';
      ruta = `${carpeta}/${base} (${n++})${ext}`;
    }
    usados.add(ruta.toLowerCase());
    zip.file(ruta, a.blob);
  });
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function tipoPorFirma(b: Uint8Array): ArchivoPreparado['tipo'] {
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return 'PDF';
  }
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return 'PNG';
  }
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'JPG';
  }
  return 'OTRO';
}

function limpiar(nombre: string): string {
  return String(nombre || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 150);
}
