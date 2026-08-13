import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MetodoService } from '../../core/services/metodo.service';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class MaestraService {

  constructor(
    private http: HttpClient,
    private metodo: MetodoService
  ) { }

  subirArchivo(file: any,carpeta:string) {
    let formData: FormData = new FormData();
    formData.append('uploadFile', file, file.name);
    formData.append('strcarpeta',carpeta);
    let headersObject = new HttpHeaders();
    const httpOptions = {
      headers: headersObject
    };
    let apiUrl1 = ConfigService.settings.apiUrl +'api/General/SubirArchivo';
    return this.http.post(apiUrl1, formData, httpOptions);
  }

  /**
   * Descarga por código de archivo.
   *
   * En el SIGCM los archivos se guardan en el file server propio y
   * `documento_sistema` ya es una URL completa: input-archivos la abre directo
   * y no llega hasta aquí. Este método queda para los códigos que no son URL,
   * que es como los devuelven otros sistemas de la casa.
   */
  descargarArchivo(codigo: string) {
    const href = ConfigService.settings.apiUrl + 'api/General/DescargarArchivo';
    return this.http.get(href + '?strarchivo=' + encodeURIComponent(codigo));
  }
  consultarInformacionReniec(strDni: string) {
    // const href = 'api/general/ConsultaDNI';
    // return this.http.get(href + '?strdni=' + strDni);
    // return this.metodo.GET('api/general/ConsultaDNI?strdni=', strDni);
    console.log("strDni",strDni)
    return this.metodo.GET(`api/general/ConsultaDNI?strdni=${strDni}`, null);
  }
  
}
