import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccesoService, PerfilAcceso } from '../../core/services/acceso.service';
import { CryptoService } from '../../core/services/crypto.service';
import { SESSION_DATA_KEY } from '../../core/services/session.service';
import { Funciones } from '../../shared/funciones/funciones';

/**
 * Ingreso por selección de perfil, para probar los flujos en local.
 *
 * POR QUÉ ESTA PANTALLA EXISTE
 * El SSO institucional no responde fuera de la red de la ANIN, y sin identidad
 * no se puede recorrer un solo paso del flujo: cada rutina de la base empieza
 * validando la terna usuario-rol-unidad. Además, lo que hay que probar es
 * justamente que un mismo expediente ofrezca acciones distintas al especialista,
 * al jefe, a OA y a Abastecimiento; con un usuario fijo cableado eso no se ve.
 *
 * QUE HACE Y QUE NO
 * Deja la sesión exactamente igual que sso.component: mismo token, misma clave
 * de sessionStorage, mismo cifrado. De ahí en adelante ninguna otra pieza del
 * frontend sabe por dónde entró el usuario.
 *
 * No es autenticación. No pide contraseña porque el SIGCM no guarda
 * contraseñas: la identidad la certifica el SSO. En producción el backend apaga
 * los endpoints y esta ruta queda sin servicio.
 */
@Component({
  selector: 'app-acceso-local',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acceso-local.component.html',
  styleUrl: './acceso-local.component.scss'
})
export class AccesoLocalComponent implements OnInit {

  perfiles: PerfilAcceso[] = [];
  cargando = true;
  ingresando = '';
  error = '';

  constructor(
    private accesoService: AccesoService,
    private cryptoService: CryptoService,
    private router: Router,
    private funciones: Funciones
  ) { }

  ngOnInit(): void {
    this.cargarPerfiles();
  }

  cargarPerfiles(): void {
    this.cargando = true;
    this.error = '';

    this.accesoService.listarPerfil().subscribe({
      next: (respuesta: any) => {
        this.cargando = false;
        if (respuesta?.estado === 1) {
          this.perfiles = respuesta.Perfiles || [];
          if (this.perfiles.length === 0) {
            this.error = 'No hay perfiles vigentes. Ejecute db/90_pruebas/S900__datos_prueba.sql sobre DBSIGCM.';
          }
        } else {
          this.error = respuesta?.mensaje || 'No fue posible obtener los perfiles.';
        }
      },
      error: () => {
        this.cargando = false;
        // El 404 es la respuesta esperada cuando acceso_local está apagado: no
        // es una caída, es la configuración de producción funcionando.
        this.error = 'El ingreso local no está disponible. Verifique que el backend esté arriba y que appSettings:acceso_local sea "true".';
      }
    });
  }

  /** Clave de identidad de la terna, para saber cuál fila está ingresando. */
  clave(perfil: PerfilAcceso): string {
    return perfil.Cuenta + '|' + perfil.CodigoRol + '|' + perfil.CodigoUnidad;
  }

  ingresar(perfil: PerfilAcceso): void {
    if (this.ingresando) {
      return;
    }
    this.ingresando = this.clave(perfil);

    this.accesoService.iniciarSesion(perfil).subscribe({
      next: (userInfo: any) => {
        this.ingresando = '';

        if (userInfo?.estado !== 'OK') {
          this.funciones.mensaje('error', userInfo?.mensaje || 'No fue posible abrir la sesión.');
          return;
        }

        const sesion = userInfo.mensaje;
        const menu = sesion?.detalle?.[0]?.perfil?.[0]?.menu || [];

        if (menu.length === 0) {
          this.funciones.mensaje('info', 'Este perfil no tiene ninguna opción de menú asignada.');
          return;
        }

        sessionStorage.setItem('token', sesion.token);
        sessionStorage.setItem(SESSION_DATA_KEY, this.cryptoService.encriptar(JSON.stringify(sesion)));

        const destino = menu.filter((x: any) => x.url && x.url !== '#')[0]?.url;

        // Recarga completa, igual que el ingreso por SSO: la plantilla arma el
        // menú una sola vez, al iniciarse.
        this.router.navigate([destino]).then(() => window.location.reload());
      },
      error: () => {
        this.ingresando = '';
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio de acceso.');
      }
    });
  }
}
