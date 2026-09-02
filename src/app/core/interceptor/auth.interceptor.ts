import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { SessionService } from '../services/session.service';
import { Funciones } from '../../shared/funciones/funciones';
import { SsoLoginService } from '../services/sso-login.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private funciones: Funciones,
    private router: Router,
    private SessionService: SessionService,
    private ssoService: SsoLoginService
  ) { }

  intercept(req: HttpRequest<any>, handlerj: HttpHandler): Observable<HttpEvent<any>> {
    const accessToken = this.SessionService.getUsuario().token;
    const headers = req.headers.append('Authorization', `Bearer ${accessToken}`);
    const authReq = req.clone({ headers });

    return handlerj.handle(authReq).pipe(
      tap({
        next: () => { },
        error: () => { }
      }),
      catchError(err => {
        if (err.status === 401) {
          this.funciones.Mensaje('error', 'La sesión ha caducado', 'Será redireccionado al login', (data: any) => {
            if (data.value) {
              sessionStorage.clear();
              this.ssoService.loginOut().subscribe(
                data => {
                  if (data.estado == 'OK') {
                    sessionStorage.clear();
                    window.location.href = data.mensaje;
                  }
                }
              );
            }
          });
        } else if (err.status === 400) {
          this.funciones.Mensaje('error', 'Error 400', 'Mala respuesta por parte del servidor', () => { });
        } else if (err.status === 0) {
          this.funciones.Mensaje(
            'error',
            'No hay conexión con el API',
            'El servidor local no respondió. Compruebe que el backend esté en https://localhost:7182 y vuelva a intentar.',
            () => { }
          );
        } else if (err.status === 500) {
          this.funciones.Mensaje('error', 'El servidor no responde', 'Intente realizar esta operación más tarde', true);
        }
        return throwError(() => err);
      })
    );
  }
}
