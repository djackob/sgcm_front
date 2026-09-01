import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MetodoService } from '../../core/services/metodo.service';
import { ConfigService } from '../../core/services/config.service';
import { esBlobJson, idDocumentoSistema } from '../funciones/archivo';

@Injectable({
  providedIn: 'root'
})
export class MaestraService {

  constructor(
    private http: HttpClient,
    private metodo: MetodoService
  ) { }

  subirArchivo(file: any, carpeta: string) {
    const formData: FormData = new FormData();
    formData.append('uploadFile', file, file.name);
    formData.append('strcarpeta', carpeta);
    const httpOptions = {
      headers: new HttpHeaders()
    };
    const apiUrl1 = ConfigService.settings.apiUrl + 'api/General/SubirArchivo';
    return this.http.post(apiUrl1, formData, httpOptions);
  }

  urlDescarga(codigo: string, carpeta?: string): string {
    const id = idDocumentoSistema(codigo);
    let href = ConfigService.settings.apiUrl + 'api/General/DescargarArchivo?strarchivo=' + encodeURIComponent(id);
    if (carpeta) {
      href += '&strcarpeta=' + encodeURIComponent(carpeta);
    }
    return href;
  }

  /**
   * Descarga el archivo por el id guardado en documento_sistema.
   * El backend responde el binario; si no lo encuentra, un JSON de error.
   */
  descargarArchivo(codigo: string, carpeta?: string): Observable<Blob> {
    return this.http.get(this.urlDescarga(codigo, carpeta), {
      responseType: 'blob'
    }).pipe(
      map((blob: Blob) => {
        if (esBlobJson(blob)) {
          throw new Error('No se encontro el archivo indicado.');
        }
        return blob;
      })
    );
  }

  /**
   * Descarga probando la carpeta principal y alternativas (p. ej. requerimiento,
   * luego cmn para PDFs firmados antes del ajuste de carpeta).
   */
  descargarArchivoConFallback(codigo: string, carpeta: string, alternativas: string[] = []): Observable<Blob> {
    let cadena = this.descargarArchivo(codigo, carpeta);
    for (const alt of alternativas) {
      cadena = cadena.pipe(catchError(() => this.descargarArchivo(codigo, alt)));
    }
    return cadena.pipe(catchError(() => this.descargarArchivo(codigo)));
  }

  abrirArchivo(codigo: string, nombre?: string, carpeta?: string): Observable<void> {
    return this.descargarArchivo(codigo, carpeta).pipe(
      map((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        if (nombre) {
          link.download = nombre;
        }
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 400);
      })
    );
  }

  /**
   * Consulta persona en RENIEC. El backend espera el DNI en `ipInput` (texto,
   * no JSON) y lo reenvía al servicio institucional.
   */
  consultarInformacionReniec(strDni: string) {
    return this.metodo.GET_PALOTES('api/General/ConsultaPersonaReniec', strDni.trim()).pipe(
      map((rpta: any) => deserializarRespuestaReniec(rpta))
    );
  }
}

/** El endpoint a veces devuelve el JSON ya parseado y a veces como texto
 *  (o JSON dentro de JSON). Siempre se deja un objeto para el mapeo. */
export function deserializarRespuestaReniec(rpta: any): any {
  if (rpta == null || rpta === '') {
    return rpta;
  }
  if (typeof rpta !== 'string') {
    return rpta;
  }
  const texto = rpta.trim();
  try {
    return JSON.parse(texto);
  } catch {
    return rpta;
  }
}
