import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { MetodoService } from './metodo.service';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class SsoLoginService {

  constructor(
    private http: HttpClient,
    private apiService: MetodoService,
    private sesion: SessionService
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

  /**
   * Segundo tramo del ingreso, sólo cuando `tksistema` respondió `PERFIL`.
   *
   * Ocurre cuando la persona ejerce más de una terna: la coordinadora que
   * atiende Abastecimiento y Desarrollo de Sistemas entra con una o con la otra,
   * y son bandejas distintas. La sesión lleva UNA terna porque todo el frontend
   * consume `detalle[0].perfil[0]`.
   *
   * El `preToken` es lo que acredita que esta persona ya presentó un token
   * válido del SSO, y de él sale la cuenta. Por eso no se manda: si el cliente
   * pudiera decir de quién es la sesión, este endpoint sería una puerta abierta.
   */
  iniciarSesionPerfil(preToken: string, perfil: { CodigoRol: string; CodigoUnidad: string }): Observable<any> {
    const body: HttpParams = new HttpParams()
      .append('strpretoken', preToken)
      .append('ipInput', JSON.stringify(perfil));

    const headersObject = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded');

    return this.http.post(
      ConfigService.settings.apiUrl + 'api/token/iniciarSesionPerfil', body, { headers: headersObject });
  }

  /**
   * Cierra la sesión por la misma puerta por la que se entró.
   *
   * El SSO institucional es quien invalida su propia sesión, así que una sesión
   * abierta con él tiene que salir por él. Una sesión local no existe para el
   * SSO: pedirle que la cierre da un error de red y deja al usuario atrapado en
   * una pantalla de la que no puede salir. El origen lo marca la propia sesión,
   * no una bandera del cliente.
   *
   * La forma de la respuesta es idéntica en los dos casos —{ estado, mensaje }
   * con la URL de retorno— para que quien llama no tenga que distinguir.
   */
  loginOut(): Observable<any> {
    if (this.esSesionLocal()) {
      return this.apiService.GET('api/acceso/loginOut').pipe(
        // Si el backend no responde, igual hay que poder salir: se devuelve la
        // ruta de ingreso local y el navegador limpia la sesión.
        catchError(() => of({ estado: 'OK', mensaje: '/acceso-local' }))
      );
    }

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

  /** La sesión local la marca sigcm.paObtenerSesion con origen = 'LOCAL'. */
  private esSesionLocal(): boolean {
    return this.sesion.getInfoUsuario()?.origen === 'LOCAL';
  }
}
