import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ConfigService } from './config.service';
import { CustomURLEncoder } from './customurlencoder';

@Injectable({
  providedIn: 'root'
})
export class MetodoService {

  constructor(private http: HttpClient) {
  }

  private formatErrors(error: any) {
    return throwError(() => error.error);
  }

  POST(path: string, ipInput: any, contentType: string = 'application/x-www-form-urlencoded;charset=utf-8') {
    const headers_object = new HttpHeaders();
    headers_object.append('Content-Type', contentType);
    const body: HttpParams = new HttpParams({ encoder: new CustomURLEncoder() })
      .set('ipInput', JSON.stringify(ipInput));

    const httpOptions = {
      headers: headers_object
    };
    return this.http.post(ConfigService.settings.apiUrl + `${path}`, body, httpOptions);
  }

  GET(path: string, ipInput: any = null, respuesta: any = 'json'): Observable<any> {
    if (ipInput == null) {
      return this.http.get(ConfigService.settings.apiUrl + `${path}`, { responseType: respuesta });
    }

    /* ipInput va en la query string: sin encodeURIComponent las comillas y
       llaves del JSON rompen la URL en algunos navegadores/proxies y el
       backend recibe un payload ilegible (o la peticion falla del todo). */
    const params = new HttpParams({ encoder: new CustomURLEncoder() })
      .set('ipInput', JSON.stringify(ipInput));
    return this.http.get(ConfigService.settings.apiUrl + `${path}`, {
      params,
      responseType: respuesta
    });
  }

  FORM_DATA(path: string, formData: any) {
    return this.http.post(ConfigService.settings.apiUrl + `${path}`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }

  FORM_DATA_FILE(path: string, formData: any) {
    return this.http.post(ConfigService.settings.apiUrl + `${path}`, formData, {
      responseType: 'text',
      reportProgress: true,
      observe: 'events'
    });
  }

  replacer(key: any, value: any) {
    if (typeof value === 'string') {
      const operador = /\+/gi;
      const apostrofe = /\'/gi;
      return value.replace(apostrofe, "''")
        .replace(operador, '+');
    }
    return value;
  }

  GET_PALOTES(path: string, ipInput: any = null, respuesta: any = 'json'): Observable<any> {
    return this.http.get(ConfigService.settings.apiUrl + `${path}?ipInput=${ipInput}`, { responseType: respuesta });
  }
}
