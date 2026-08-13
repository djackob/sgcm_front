import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ModalRegistroComponent } from './modals/modal-registro/modal-registro.component';
import { ModalDetalleComponent } from './modals/modal-detalle/modal-detalle.component';
import { CmnService } from './services/cmn.service';
import { SessionService } from '../../core/services/session.service';
import { Funciones } from '../../shared/funciones/funciones';
import { SolicitudCmn, TransicionCmn } from './models/cmn.model';

/**
 * Bandeja de Gestión CMN.
 *
 * DE DÓNDE SALE CADA COSA
 * Las filas las da cmn.paListarSolicitud, que por defecto devuelve "mi bandeja":
 * lo que está en la unidad del actor y cuyo estado tiene como responsable su
 * rol. Por eso el especialista no ve lo que le toca firmar al jefe, y por eso la
 * misma pantalla se comporta distinto según con qué perfil se entró.
 *
 * Los botones de acción los da sigcm.paListarTransicionDisponible, expediente
 * por expediente. La pantalla NO decide qué se puede hacer: lo pregunta. Deducir
 * la acción a partir del estado —como hace el mockup, que no tiene backend—
 * significaría reimplementar la máquina de estados en TypeScript y confiar en
 * que las dos copias no se separen nunca. Se separan.
 */
@Component({
  selector: 'app-gestion-cmn',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, ModalRegistroComponent, ModalDetalleComponent],
  templateUrl: './gestion-cmn.component.html',
  styleUrl: './gestion-cmn.component.scss',
})
export class GestionCmnComponent implements OnInit {

  @ViewChild(ModalRegistroComponent) modalRegistro!: ModalRegistroComponent;
  @ViewChild(ModalDetalleComponent) modalDetalle!: ModalDetalleComponent;

  /* Identidad del actor, para el encabezado y para saber qué ofrecer. */
  breadcrumb: string[] = ['Gestión CMN'];
  rol = '';
  codigoRol = '';
  unidad = '';
  centroCosto = '';

  /* Bandeja */
  solicitudes: SolicitudCmn[] = [];
  acciones: { [idExpediente: string]: TransicionCmn[] } = {};
  total = 0;
  cargando = false;

  filtro = {
    SoloMiBandeja: true,
    Texto: '',
    CodigoEstado: '',
    AnoEje: new Date().getFullYear(),
    Limite: 20,
    Desplazamiento: 0
  };

  /* Confirmación de una acción del flujo */
  accionEnCurso: { solicitud: SolicitudCmn; transicion: TransicionCmn } | null = null;
  comentario = '';
  ejecutando = false;

  constructor(
    private cmnService: CmnService,
    private sesion: SessionService,
    private funciones: Funciones
  ) { }

  ngOnInit(): void {
    const info = this.sesion.getInfoUsuario();
    const detalle = info?.detalle?.[0];
    const perfil = detalle?.perfil?.[0];

    this.rol = perfil?.perfil || '';
    this.codigoRol = perfil?.cod_perfil || '';
    this.unidad = detalle?.dependencia || '';
    this.centroCosto = detalle?.centro_costo || '';
    this.breadcrumb = ['Gestión CMN', this.unidad, this.rol].filter(x => !!x);

    this.cargarBandeja();
  }

  /* ---------------------------------------------------------------------- */
  /* Bandeja                                                                */
  /* ---------------------------------------------------------------------- */

  cargarBandeja(): void {
    this.cargando = true;

    const filtro = {
      SoloMiBandeja: this.filtro.SoloMiBandeja,
      Texto: this.filtro.Texto || null,
      CodigoEstado: this.filtro.CodigoEstado || null,
      AnoEje: this.filtro.AnoEje || null,
      Limite: this.filtro.Limite,
      Desplazamiento: this.filtro.Desplazamiento
    };

    this.cmnService.listarSolicitud(filtro).subscribe({
      next: (respuesta: any) => {
        if (respuesta?.estado !== 1) {
          this.cargando = false;
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible cargar la bandeja.');
          return;
        }

        this.solicitudes = respuesta.Solicitudes || [];
        this.total = respuesta.total || 0;
        this.cargarAcciones();
      },
      error: () => {
        this.cargando = false;
        this.solicitudes = [];
      }
    });
  }

  /**
   * Una consulta de transiciones por expediente de la página.
   *
   * Es una llamada por fila, y se sabe: la alternativa sería una rutina que
   * resuelva las transiciones de un lote, que hoy no existe. Con la página
   * limitada a 20 filas el costo es acotado y la bandeja queda correcta desde el
   * primer día; el lote es una optimización que puede llegar después sin cambiar
   * esta pantalla.
   */
  private cargarAcciones(): void {
    this.acciones = {};

    if (this.solicitudes.length === 0) {
      this.cargando = false;
      return;
    }

    const consultas = this.solicitudes.map(s =>
      this.cmnService.listarTransicionDisponible(s.IdExpediente).pipe(
        catchError(() => of({ estado: 0, Transiciones: [] }))
      )
    );

    forkJoin(consultas).subscribe({
      next: (respuestas: any[]) => {
        respuestas.forEach((respuesta, indice) => {
          const solicitud = this.solicitudes[indice];
          this.acciones[solicitud.IdExpediente] = respuesta?.Transiciones || [];
        });
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  accionesDe(solicitud: SolicitudCmn): TransicionCmn[] {
    return this.acciones[solicitud.IdExpediente] || [];
  }

  limpiarFiltros(): void {
    this.filtro.Texto = '';
    this.filtro.CodigoEstado = '';
    this.filtro.SoloMiBandeja = true;
    this.filtro.Desplazamiento = 0;
    this.cargarBandeja();
  }

  buscar(): void {
    this.filtro.Desplazamiento = 0;
    this.cargarBandeja();
  }

  pagina(direccion: number): void {
    const siguiente = this.filtro.Desplazamiento + direccion * this.filtro.Limite;
    if (siguiente < 0 || siguiente >= this.total) {
      return;
    }
    this.filtro.Desplazamiento = siguiente;
    this.cargarBandeja();
  }

  get desde(): number {
    return this.total === 0 ? 0 : this.filtro.Desplazamiento + 1;
  }

  get hasta(): number {
    return Math.min(this.filtro.Desplazamiento + this.filtro.Limite, this.total);
  }

  /* ---------------------------------------------------------------------- */
  /* Presentación                                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Color del estado. Es puramente visual y por eso puede vivir aquí: agrupa
   * estados de la base en cuatro tonos, sin decidir nada del flujo.
   */
  tonoEstado(codigoEstado: string): string {
    if (codigoEstado === 'CMN_FINALIZADO') return 'success';
    if (codigoEstado === 'CMN_OBSERVADO' || codigoEstado === 'CMN_ANULADO') return 'warning';
    if (codigoEstado === 'CMN_BORRADOR') return 'neutral';
    return 'info';
  }

  /** El expediente es del actor cuando el estado le señala como responsable. */
  esMiTurno(solicitud: SolicitudCmn): boolean {
    return this.accionesDe(solicitud).length > 0;
  }

  /* ---------------------------------------------------------------------- */
  /* Acciones del flujo                                                     */
  /* ---------------------------------------------------------------------- */

  nuevaSolicitud(): void {
    this.modalRegistro.abrir(this.centroCosto, this.filtro.AnoEje);
  }

  verDetalle(solicitud: SolicitudCmn): void {
    this.modalDetalle.abrir(solicitud);
  }

  /**
   * Toda acción pasa por confirmación, incluso las que no exigen comentario: son
   * cambios de estado con efectos fuera de la pantalla —firmas, envíos a otra
   * unidad, encolado hacia SIGA— y no deben depender de un clic accidental.
   */
  pedirConfirmacion(solicitud: SolicitudCmn, transicion: TransicionCmn): void {
    this.accionEnCurso = { solicitud, transicion };
    this.comentario = '';
  }

  cancelarAccion(): void {
    this.accionEnCurso = null;
    this.comentario = '';
  }

  confirmarAccion(): void {
    if (!this.accionEnCurso || this.ejecutando) {
      return;
    }

    const { solicitud, transicion } = this.accionEnCurso;

    if (transicion.RequiereComentario && !this.comentario.trim()) {
      this.funciones.mensaje('info', 'Esta acción exige un comentario. La observación queda en la trazabilidad y es lo que el área usuaria debe subsanar.');
      return;
    }

    this.ejecutando = true;

    this.cmnService.ejecutarTransicion(
      solicitud.IdExpediente,
      transicion.CodigoTransicion,
      solicitud.Version,
      this.comentario.trim() || null
    ).subscribe({
      next: (respuesta: any) => {
        this.ejecutando = false;

        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible ejecutar la acción.');
          return;
        }

        this.accionEnCurso = null;
        this.comentario = '';
        this.funciones.mensaje('success', respuesta.mensaje || 'Se registró la acción.');
        this.cargarBandeja();
      },
      error: () => {
        this.ejecutando = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  /** El registro y las acciones cambian la bandeja: se recarga entera. */
  alRegistrar(): void {
    this.cargarBandeja();
  }
}
