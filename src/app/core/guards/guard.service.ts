import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { SessionService } from '../services/session.service';
import { SsoLoginService } from '../services/sso-login.service';

@Injectable({
  providedIn: 'root'
})
export class GuardService {

  constructor(public router: Router, private sesion: SessionService, private ssoService: SsoLoginService) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (this.sesion.getUsuario().id_usuario > 0) {
      if (this.sesion.getUsuario().detalle.length > 0) {
        if (this.sesion.getUsuario().detalle[0].perfil.length > 0) {
          if (this.sesion.getUsuario().detalle[0].perfil[0].menu.length > 0) {
            const menus = this.sesion.getUsuario().detalle[0].perfil[0].menu;
            const url = menus.find((x: any) => x.url == (route.routeConfig?.path));

            if (url != undefined) {
              return true;
            } else {
              this.router.navigate(['page-no-found']);
              return false;
            }
          } else {
            this.router.navigate(['page-no-found']);
            return false;
          }
        } else {
          this.router.navigate(['page-no-found']);
          return false;
        }
      } else {
        this.router.navigate(['page-no-found']);
        return false;
      }
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
  }
}
