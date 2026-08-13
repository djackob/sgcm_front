import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { MaestraService } from '../../shared/services/maestra.service';

/* pdfmake trae las fuentes como un sistema de archivos virtual que hay que
   registrarle una sola vez. Se hace al cargar el módulo y no en cada llamada:
   son ~1 MB de tipografías y registrarlas por documento sería trabajo repetido. */
(pdfMake as any).addVirtualFileSystem(pdfFonts);

/** Lo que el backend devuelve al guardar un archivo en el file server. */
export interface ArchivoSubido {
  estado: number;
  mensaje: string;
  documento_original: string;
  documento_sistema: string;
}

/**
 * Generación de documentos PDF y su depósito en el file server.
 *
 * POR QUÉ EL PDF SE ARMA EN EL NAVEGADOR
 * Es la decisión tomada para este sistema: el frontend ya tiene los datos en
 * pantalla y la plantilla del anexo, así que produce el archivo y lo sube. El
 * backend no arma documentos; recibe la URL y la registra.
 *
 * La consecuencia a tener presente: el archivo se genera donde está el usuario,
 * así que el PDF firmado y su huella se calculan sobre lo que ese navegador
 * produjo. Por eso `sigcm.DocumentoVersion` guarda además el `Payload` con los
 * datos de origen: permite reimprimir y comparar si alguna vez hay que auditar
 * un documento.
 *
 * QUÉ NO HACE ESTE SERVICIO
 * No sabe qué es un Anexo 3. Recibe una definición de documento ya armada por
 * la plantilla del módulo y se ocupa solo de convertirla en PDF y subirla. Así
 * la misma pieza sirve a CMN y a Requerimiento.
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentoService {

  constructor(private maestraService: MaestraService) { }

  /**
   * Convierte una definición de pdfmake en un archivo PDF.
   *
   * En pdfmake 0.3 los métodos de salida devuelven promesas; en 0.2 recibían un
   * callback. Si alguna vez se baja de versión, es aquí donde se nota.
   */
  generarPdf(definicion: any): Promise<Blob> {
    return pdfMake.createPdf(definicion).getBlob();
  }

  /** Abre el PDF en una pestaña nueva, sin guardarlo. Para previsualizar. */
  verPdf(definicion: any): void {
    pdfMake.createPdf(definicion).open();
  }

  /**
   * Genera el PDF y lo deposita en el file server.
   *
   * @param definicion    definición de pdfmake que arma la plantilla del módulo
   * @param nombreArchivo nombre visible, el que verá el usuario al descargar
   * @param carpeta       subcarpeta del file server: 'cmn', 'requerimiento'
   */
  generarYSubir(definicion: any, nombreArchivo: string, carpeta: string): Observable<ArchivoSubido> {
    return from(this.generarPdf(definicion)).pipe(
      switchMap((blob: Blob) => {
        // El backend toma la extensión del nombre original, así que el File se
        // construye con el nombre visible y no con uno genérico.
        const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });
        return this.maestraService.subirArchivo(archivo, carpeta) as Observable<ArchivoSubido>;
      })
    );
  }
}
