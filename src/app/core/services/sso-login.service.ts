import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { MetodoService } from './metodo.service';

@Injectable({
  providedIn: 'root'
})
export class SsoLoginService {

  constructor(
    private http: HttpClient,
    private apiService: MetodoService,
  ) { }

  iniciarSesionSso(token: string): Observable<any> {
    const body: HttpParams = new HttpParams()
      .append('strtoken', token);

    const headersObject = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    const httpOptions = {
      headers: headersObject
    };

    return this.http.post(ConfigService.settings.apiUrl + 'api/token/tksistema', body, httpOptions);
  }

  loginOut(): Observable<any> {
    return this.apiService.GET('api/token/LoginOut');
  }

  iniciarSesionSsoExterno(token: string): Observable<any> {
    const body: HttpParams = new HttpParams()
      .append('strtoken', token);

    const headersObject = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    const httpOptions = {
      headers: headersObject
    };

    return this.http.post(ConfigService.settings.apiUrl + 'api/Token/tksistemaexterno', body, httpOptions);
  }
}
