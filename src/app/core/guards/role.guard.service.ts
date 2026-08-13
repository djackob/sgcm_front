import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { SessionService } from '../services/session.service';
import { SsoLoginService } from '../services/sso-login.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuardService {

  constructor(public router: Router, private sesion: SessionService, private ssoService: SsoLoginService) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (this.sesion.getUsuario().id_usuario != null && this.sesion.getUsuario().id_usuario != undefined) {
      // sesión válida
    } else {
      this.ssoService.loginOut().subscribe(
        data => {
          if (data.estado == 'OK') {
            sessionStorage.clear();
            window.location.href = data.mensaje;
          }
        }
      );
      return false;
    }
    return true;
  }
}
