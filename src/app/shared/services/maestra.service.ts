import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

  consultarInformacionReniec(strDni: string) {
    console.log("strDni", strDni);
    return this.metodo.GET(`api/general/ConsultaDNI?strdni=${strDni}`, null);
  }
}
