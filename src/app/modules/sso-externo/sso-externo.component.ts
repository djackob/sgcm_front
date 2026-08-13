import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../../core/authentication/authentication.service';
import { Router } from '@angular/router';
import { Funciones } from '../../shared/funciones/funciones';
import { Observable } from 'rxjs';
import { SsoLoginService } from '../../core/services/sso-login.service';
import { IUserInfo } from '../../core/models/IUserInfo';
import { CryptoService } from '../../core/services/crypto.service';
import { SESSION_DATA_KEY } from '../../core/services/session.service';

@Component({
  selector: 'app-sso-externo',
  standalone: true,
  imports: [],
  templateUrl: './sso-externo.component.html',
  styleUrl: './sso-externo.component.scss'
})
export class SsoExternoComponent implements OnInit {
  redirigirPagina = '';
  token = '';
  urlTree: any;

  constructor(
    private CryptoService: CryptoService,
    private ssoService: SsoLoginService,
    private aut: AuthenticationService,
    private router: Router,
    private funciones: Funciones
  ) {
  }

  ngOnInit(): void {
    sessionStorage.clear();
    setTimeout(() => {
      this.urlTree = this.router.parseUrl(this.router.url);
      this.token = this.urlTree.queryParams['xy'];
      this.loginSso(this.token);
    }, 50);
  }

  loginSso(token: string): void {
    this.ssoService.iniciarSesionSsoExterno(token).subscribe({
      next: (userInfo: IUserInfo) => {
        if (userInfo.estado == 'OK') {
          new Observable(this.aut.SessionStorageUserInfo(userInfo)).subscribe(
            (ingresoDirecto): void => {
              sessionStorage.setItem('token', userInfo.mensaje.token);
              if (userInfo.mensaje.detalle[0].perfil[0].menu.length > 0) {
                const data_usuario: any = userInfo.mensaje;
                sessionStorage.setItem(SESSION_DATA_KEY, this.CryptoService.encriptar(JSON.stringify(data_usuario)));
                this.redirigirPagina = userInfo.mensaje.detalle[0].perfil[0].menu.filter((x: any) => x.url != '#')[0].url;
              } else {
                sessionStorage.setItem(SESSION_DATA_KEY, 'null');
                this.funciones.mensaje('info', 'Su perfil no tiene ninguna opción del menú asignado.');
                this.ssoService.loginOut().subscribe(
                  data => {
                    if (data.estado == 'OK') {
                      sessionStorage.clear();
                      window.location.href = data.mensaje;
                    }
                  }
                );
              }
              if (ingresoDirecto) {
                // cambio de clave pendiente
              } else {
                if (this.redirigirPagina != '') {
                  this.router.navigate([this.redirigirPagina])
                    .then(() => {
                      window.location.reload();
                    });
                }
              }
            });
        } else {
          this.ssoService.loginOut().subscribe(
            data => {
              if (data.estado == 'OK') {
                sessionStorage.clear();
                window.location.href = data.mensaje;
              }
            }
          );
        }
      },
      error: () => {
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
  }
}
