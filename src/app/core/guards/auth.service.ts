import { Injectable } from '@angular/core';
import { SessionService } from '../services/session.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  config: any;

  constructor(
    private sessionService: SessionService
  ) { }

  hasClaim(claimType: any, claimValue?: any) {
    return this.isClaimValid(claimType, claimValue);
  }

  private isClaimValid(claimType: string, claimValue?: string): AplicarTipoControl {
    let ret: AplicarTipoControl;
    let auth: any[] = [];

    auth = this.sessionService.getUsuario().detalle[0].perfil[0].componente;
    ret = AplicarTipoControl.Ocultar;
    if (auth != null) {
      const infoClaim: any = auth.find((c: any) => c.hasclaim?.toLowerCase().trim() == claimType.toLowerCase().trim());
      if (infoClaim != undefined) {
        ret = AplicarTipoControl.Visible;
      } else {
        ret = AplicarTipoControl.Ocultar;
      }
    }

    return ret;
  }

  getAccessToken() {
    const token = sessionStorage.getItem('token');
    if (token != null) {
      return token;
    }
    return '';
  }
}

export enum AplicarTipoControl {
  Visible = 1,
  Ocultar = 2,
  Deshabilitar = 3
}
