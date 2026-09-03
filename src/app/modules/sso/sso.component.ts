import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../core/authentication/authentication.service';
import { Router } from '@angular/router';
import { Funciones } from '../../shared/funciones/funciones';
import { Observable } from 'rxjs';
import { SsoLoginService } from '../../core/services/sso-login.service';
import { IUserInfo } from '../../core/models/IUserInfo';
import { CryptoService } from '../../core/services/crypto.service';
import { SESSION_DATA_KEY } from '../../core/services/session.service';

/** Una terna usuario · rol · unidad, tal como la devuelve sigcm.paListarPerfilSso. */
export interface PerfilSso {
  Cuenta: string;
  NombreCompleto: string;
  Cargo: string;
  CodigoRol: string;
  Rol: string;
  CodigoUnidad: string;
  Unidad: string;
  Sigla: string;
  CentroCosto: string;
  EsAreaUsuaria: boolean;
  EsTitular: boolean;
  Modulos?: Array<{ CodigoModulo: string; Nombre: string; Ruta: string }>;
}

/**
 * Ingreso por el SSO institucional.
 *
 * QUÉ CAMBIÓ
 * Antes esta pantalla no tenía interfaz: recibía el token, pedía la sesión y
 * redirigía. Sigue siendo así en el caso normal —una persona, una terna— y no se
 * ve nada más que el paso del navegador.
 *
 * Lo nuevo es el caso de quien ejerce VARIAS ternas. El backend responde
 * `PERFIL` con la lista y aquí se elige, porque una sesión lleva una sola terna:
 * todo el frontend lee `detalle[0].perfil[0]`, y el expediente que un
 * coordinador ve en Abastecimiento no es el que ve en su otra área.
 *
 * Es la misma decisión que /acceso-local resuelve para el ingreso de pruebas.
 * La diferencia es que allí se elige la persona y aquí no: la persona ya la
 * certificó el SSO y sólo se elige con qué sombrero entra.
 */
@Component({
  selector: 'app-sso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sso.component.html',
  styleUrl: './sso.component.scss'
})
export class SsoComponent implements OnInit {
  redirigirPagina = '';
  token = '';
  urlTree: any;

  /** Sólo se pintan cuando el backend responde PERFIL. */
  perfiles: PerfilSso[] = [];
  preToken = '';
  cargando = true;
  ingresando = '';

  constructor(
    private CryptoService: CryptoService,
    private ssoService: SsoLoginService,
    private aut: AuthenticationService,
    private router: Router,
    private funciones: Funciones
  ) {
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.urlTree = this.router.parseUrl(this.router.url);
      this.token = this.urlTree.queryParams['xy'];
      this.loginSso(this.token);
    }, 50);
  }

  loginSso(token: string): void {
    this.cargando = true;

    this.ssoService.iniciarSesionSso(token).subscribe({
      next: (userInfo: IUserInfo | any) => {
        // Varias ternas: hay que preguntar con cuál entra.
        if (userInfo.estado === 'PERFIL') {
          this.cargando = false;
          this.perfiles = userInfo.mensaje?.Perfiles || [];
          this.preToken = userInfo.mensaje?.PreToken || '';
          return;
        }

        if (userInfo.estado === 'OK') {
          this.cargando = false;
          this.establecerSesion(userInfo);
          return;
        }

        // El SSO no reconoció el token, o la cuenta no tiene perfil vigente en
        // el SIGCM. En los dos casos el mensaje viene del backend y se muestra
        // antes de devolver a la persona al portal: salir en silencio la deja
        // sin saber por qué no entró.
        this.cargando = false;
        this.funciones.mensaje('error', userInfo?.mensaje || 'No fue posible iniciar sesión.');
        this.salir();
      },
      error: () => {
        this.cargando = false;
        this.router.navigate(['/sso-acceso']).then(() => {
          window.location.reload();
        });
      }
    });
  }

  /** Clave de la terna, para saber qué fila está ingresando. */
  clave(perfil: PerfilSso): string {
    return perfil.CodigoRol + '|' + perfil.CodigoUnidad;
  }

  elegirPerfil(perfil: PerfilSso): void {
    if (this.ingresando) {
      return;
    }
    this.ingresando = this.clave(perfil);

    this.ssoService.iniciarSesionPerfil(this.preToken, {
      CodigoRol: perfil.CodigoRol,
      CodigoUnidad: perfil.CodigoUnidad
    }).subscribe({
      next: (userInfo: any) => {
        this.ingresando = '';

        if (userInfo?.estado !== 'OK') {
          this.funciones.mensaje('error', userInfo?.mensaje || 'No fue posible abrir la sesión.');
          return;
        }

        this.establecerSesion(userInfo);
      },
      error: () => {
        this.ingresando = '';
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio de acceso.');
      }
    });
  }

  /**
   * Guarda la sesión y entra. Es el mismo cuerpo para el ingreso directo y para
   * el que pasó por el selector: una vez que hay terna, no hay diferencia.
   */
  private establecerSesion(userInfo: any): void {
    new Observable(this.aut.SessionStorageUserInfo(userInfo)).subscribe(
      (ingresoDirecto): void => {
        sessionStorage.setItem('token', userInfo.mensaje.token);

        const menu = userInfo.mensaje.detalle?.[0]?.perfil?.[0]?.menu || [];

        if (menu.length > 0) {
          const data_usuario: any = userInfo.mensaje;
          sessionStorage.setItem(SESSION_DATA_KEY, this.CryptoService.encriptar(JSON.stringify(data_usuario)));
          this.redirigirPagina = menu.filter((x: any) => x.url != '#')[0].url;
        } else {
          sessionStorage.setItem(SESSION_DATA_KEY, 'null');
          this.funciones.mensaje('info', 'Su perfil no tiene ninguna opción del menú asignado.');
          this.salir();
          return;
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
  }

  private salir(): void {
    this.ssoService.loginOut().subscribe(
      data => {
        if (data.estado == 'OK') {
          sessionStorage.clear();
          window.location.href = data.mensaje;
        }
      }
    );
  }
}
