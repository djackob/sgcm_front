import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetodoService } from '../../core/services/metodo.service';
import { Funciones } from '../../shared/funciones/funciones';

export interface ResumenSso {
  PersonasSso: number;
  PersonasLocales: number;
  TernasVigentes: number;
  Unidades: number;
  PerfilesMapeados: number;
  AristasArbol: number;
  UltimaSincronizacion: string | null;
  DescartesUltima: number;
}

export interface DescarteSso {
  Cuenta: string;
  NombreCompleto: string;
  CodigoPerfilSso: string;
  Perfil: string;
  CentroCosto: string;
  Motivo: string;
}

export interface SincronizacionSso {
  Fecha: string;
  Disparador: string;
  CuentaDisparo: string | null;
  PadronRecibido: number;
  UnidadesAlta: number;
  UsuariosAlta: number;
  AsignacionesAlta: number;
  AsignacionesBaja: number;
  Descartes: DescarteSso[];
}

export type SeccionSso = 'padron' | 'perfiles' | 'arbol' | 'unidades' | 'sincronizaciones';

/**
 * Accesos y perfiles: el tablero del administrador del sistema.
 *
 * POR QUÉ EXISTE
 * Porque la pregunta «¿por qué esta persona no puede entrar?» tenía una
 * respuesta exacta —el motivo del descarte, con su cuenta, su cod_perfil y su
 * centro de costo— que sólo se alcanzaba con `sqlcmd` contra un servidor al que
 * no todos tienen acceso. Eso convertía una consulta de treinta segundos en una
 * investigación.
 *
 * QUÉ ES Y QUÉ NO ES
 * Es de SOLO LECTURA, más el botón de sincronizar. La configuración —el mapeo de
 * perfiles y el árbol de derivación— sigue viniendo de la semilla, que es la que
 * viaja a producción versionada y la que un revisor puede leer en un PR. Si un
 * día se vuelve editable desde aquí, antes hay que decidir quién manda cuando la
 * semilla y la pantalla discrepan.
 *
 * El acceso lo gobierna `sigcm.RolModulo`: sin `ADMIN_SISTEMA` la opción no
 * aparece en el menú, y la rutina de la base lo vuelve a comprobar por su cuenta.
 * Aquí no hay ninguna comprobación de rol que mantener sincronizada.
 */
@Component({
  selector: 'app-mantenimiento-sso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mantenimiento-sso.component.html',
  styleUrl: './mantenimiento-sso.component.scss'
})
export class MantenimientoSsoComponent implements OnInit {

  resumen: ResumenSso | null = null;
  padron: any[] = [];
  perfiles: any[] = [];
  arbol: any[] = [];
  unidades: any[] = [];
  sincronizaciones: SincronizacionSso[] = [];

  seccion: SeccionSso = 'padron';
  cargando = false;
  sincronizando = false;
  error = '';

  constructor(
    private apiService: MetodoService,
    private funciones: Funciones
  ) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    this.apiService.GET('api/sigcm/obtenerPanelSso', {}).subscribe({
      next: (respuesta: any) => {
        this.cargando = false;

        if (respuesta?.estado !== 1) {
          this.error = respuesta?.mensaje || 'No fue posible leer el panel de accesos.';
          return;
        }

        this.resumen = respuesta.Resumen || null;
        this.padron = respuesta.Padron || [];
        this.perfiles = respuesta.Perfiles || [];
        this.arbol = respuesta.Arbol || [];
        this.unidades = respuesta.Unidades || [];
        this.sincronizaciones = respuesta.Sincronizaciones || [];
      },
      error: () => {
        this.cargando = false;
        this.error = 'No fue posible comunicarse con el servicio.';
      }
    });
  }

  /**
   * Trae el padrón del SSO y lo reconcilia. Es la misma rutina que corre en cada
   * ingreso; aquí sólo se dispara a mano para ver el resultado sin esperar a que
   * alguien entre.
   */
  sincronizar(): void {
    if (this.sincronizando) {
      return;
    }
    this.sincronizando = true;

    this.apiService.POST('api/token/sincronizarPadronSso', {}).subscribe({
      next: (respuesta: any) => {
        this.sincronizando = false;

        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible sincronizar el padrón.');
          return;
        }

        const r = respuesta.Resumen || {};
        const descartes = (respuesta.Descartes || []).length;

        this.funciones.mensaje('success',
          `Padrón sincronizado: ${r.PadronRecibido} ternas recibidas, ` +
          `${r.AsignacionesAlta} alta(s), ${r.AsignacionesBaja} baja(s)` +
          (descartes ? `, ${descartes} descarte(s).` : '.'));

        // Se recarga para que el tablero refleje lo que acaba de pasar, incluida
        // la corrida nueva en la bitácora.
        this.cargar();
      },
      error: () => {
        this.sincronizando = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio de sincronización.');
      }
    });
  }

  ver(seccion: SeccionSso): void {
    this.seccion = seccion;
  }

  /** Los descartes de la corrida más reciente, que es el diagnóstico habitual. */
  get descartesRecientes(): DescarteSso[] {
    return this.sincronizaciones[0]?.Descartes || [];
  }

  /**
   * Una arista sin ningún puesto ocupado no está mal declarada: es un escalón
   * del flujo que nadie ejerce todavía. Se marca para que se vea, porque es la
   * diferencia entre «el jefe no encuentra a quién derivar» y «hay un error».
   *
   * Se mira `PuestosSso`, no `PuestosOcupados`. En un entorno con los usuarios
   * ficticios de S900 el escalón del coordinador de área usuaria aparece
   * ocupado por cinco cuentas locales y el hueco real queda tapado — que es
   * exactamente lo que este panel existe para mostrar.
   */
  aristaVacia(fila: any): boolean {
    return !fila?.PuestosSso;
  }

  /** El escalón lo sostienen sólo cuentas de prueba: en producción estaría vacío. */
  aristaSoloLocal(fila: any): boolean {
    return !fila?.PuestosSso && !!fila?.PuestosOcupados;
  }
}
