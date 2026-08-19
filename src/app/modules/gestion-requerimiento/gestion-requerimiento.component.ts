import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ModalRegistroRequerimientoComponent } from './modals/modal-registro/modal-registro.component';
import { ModalDetalleRequerimientoComponent } from './modals/modal-detalle/modal-detalle.component';
import { RequerimientoService } from './services/requerimiento.service';
import { SessionService } from '../../core/services/session.service';
import { Funciones } from '../../shared/funciones/funciones';
import {
  DOCUMENTO_TECNICO,
  RequerimientoBandeja,
  TransicionRequerimiento
} from './models/requerimiento.model';

/**
 * Bandeja de Requerimiento a Notificación.
 *
 * DE DÓNDE SALE CADA COSA
 * Las filas las da requerimiento.paListarRequerimiento, que por defecto devuelve
 * "mi bandeja": lo que está en la unidad del actor y cuyo estado tiene como
 * responsable su rol. Por eso el especialista no ve lo que le toca firmar al
 * jefe, y por eso la misma pantalla se comporta distinto según con qué perfil se
 * entró.
 *
 * Los botones de acción los da sigcm.paListarTransicionDisponible, expediente
 * por expediente. La pantalla NO decide qué se puede hacer: lo pregunta. Deducir
 * la acción a partir del estado —como hace el mockup, que no tiene backend—
 * significaría reimplementar la máquina de estados en TypeScript y confiar en
 * que las dos copias no se separen nunca. Se separan.
 *
 * LA BIFURCACIÓN DE LA DEC (REQ-14) NO SE PROGRAMA AQUÍ
 * Que un requerimiento con DEC = Abastecimiento pase por OA y uno con DEC = DAI
 * no lo haga es una regla del motor: REQ_REMITIR_OA y REQ_REMITIR_DAI salen del
 * mismo estado de origen y la rutina ofrece la que corresponde según
 * Requerimiento.CodigoDec. Aquí sólo se dibujan los botones que llegaron.
 *
 * ALCANCE
 * Hasta REQ-16, que es hasta donde llega el modelo de datos: registro,
 * documentos técnicos, firma, remisión, revisión de OA y de la DEC, y el ciclo
 * de observación. La indagación de mercado, el Anexo 8, la CCP y la orden
 * (REQ-17 a REQ-25) entran con la migración V010, que todavía no existe.
 */
@Component({
  selector: 'app-gestion-requerimiento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent,
    ModalRegistroRequerimientoComponent,
    ModalDetalleRequerimientoComponent
  ],
  templateUrl: './gestion-requerimiento.component.html',
  styleUrl: './gestion-requerimiento.component.scss',
})
export class GestionRequerimientoComponent implements OnInit {

  @ViewChild(ModalRegistroRequerimientoComponent) modalRegistro!: ModalRegistroRequerimientoComponent;
  @ViewChild(ModalDetalleRequerimientoComponent) modalDetalle!: ModalDetalleRequerimientoComponent;

  /* Identidad del actor, para el encabezado y para saber qué ofrecer. */
  breadcrumb: string[] = ['Requerimiento'];
  rol = '';
  codigoRol = '';
  unidad = '';
  centroCosto = '';

  /* Bandeja */
  requerimientos: RequerimientoBandeja[] = [];
  acciones: { [idExpediente: string]: TransicionRequerimiento[] } = {};
  total = 0;
  cargando = false;

  filtro = {
    SoloMiBandeja: true,
    Texto: '',
    CodigoEstado: '',
    CodigoTipoContratacion: '',
    AnoEje: new Date().getFullYear(),
    Limite: 20,
    Desplazamiento: 0
  };

  /* Confirmación de una acción del flujo */
  accionEnCurso: { requerimiento: RequerimientoBandeja; transicion: TransicionRequerimiento } | null = null;
  comentario = '';
  ejecutando = false;
  paso = '';

  constructor(
    private requerimientoService: RequerimientoService,
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
    this.breadcrumb = ['Requerimiento', this.unidad, this.rol].filter(x => !!x);

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
      CodigoTipoContratacion: this.filtro.CodigoTipoContratacion || null,
      AnoEje: this.filtro.AnoEje || null,
      Limite: this.filtro.Limite,
      Desplazamiento: this.filtro.Desplazamiento
    };

    this.requerimientoService.listarRequerimiento(filtro).subscribe({
      next: (respuesta: any) => {
        if (respuesta?.estado !== 1) {
          this.cargando = false;
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible cargar la bandeja.');
          return;
        }

        this.requerimientos = respuesta.Requerimientos || [];
        this.total = respuesta.total || 0;
        this.cargarAcciones();
      },
      error: () => {
        this.cargando = false;
        this.requerimientos = [];
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

    if (this.requerimientos.length === 0) {
      this.cargando = false;
      return;
    }

    const consultas = this.requerimientos.map(r =>
      this.requerimientoService.listarTransicionDisponible(r.IdExpediente).pipe(
        catchError(() => of({ estado: 0, Transiciones: [] }))
      )
    );

    forkJoin(consultas).subscribe({
      next: (respuestas: any[]) => {
        respuestas.forEach((respuesta, indice) => {
          const requerimiento = this.requerimientos[indice];
          this.acciones[requerimiento.IdExpediente] = respuesta?.Transiciones || [];
        });
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  /**
   * Subsanar no se ofrece como botón de la grilla: es "abrir el formulario para
   * corregir", y se entra por «Editar» dentro del visor, igual que en el CMN.
   */
  accionesDe(requerimiento: RequerimientoBandeja): TransicionRequerimiento[] {
    return (this.acciones[requerimiento.IdExpediente] || [])
      .filter(t => t.CodigoTransicion !== 'REQ_SUBSANAR');
  }

  /**
   * REQ-11: el requerimiento se edita sólo en borrador o durante una subsanación
   * recepcionada. Fuera de esas etapas el formulario es un visor de sólo lectura.
   *
   * Se comprueba contra las transiciones disponibles y no contra el estado: si
   * el motor ofrece REQ_SUBSANAR, este actor puede abrir la subsanación; si
   * ofrece REQ_ELABORAR_DOC, está en borrador y es suyo. Preguntar es lo mismo
   * que hace el resto de la pantalla.
   */
  puedeEditar(requerimiento: RequerimientoBandeja): boolean {
    const disponibles = this.acciones[requerimiento.IdExpediente] || [];
    return disponibles.some(t =>
      t.CodigoTransicion === 'REQ_SUBSANAR' || t.CodigoTransicion === 'REQ_ELABORAR_DOC');
  }

  limpiarFiltros(): void {
    this.filtro.Texto = '';
    this.filtro.CodigoEstado = '';
    this.filtro.CodigoTipoContratacion = '';
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
    if (codigoEstado === 'REQ_CONFORME') return 'success';
    if (codigoEstado === 'REQ_OBSERVADO' || codigoEstado === 'REQ_ANULADO') return 'warning';
    if (codigoEstado === 'REQ_BORRADOR') return 'neutral';
    return 'info';
  }

  /** El expediente es del actor cuando el estado le señala como responsable. */
  esMiTurno(requerimiento: RequerimientoBandeja): boolean {
    return this.accionesDe(requerimiento).length > 0;
  }

  /** Sólo el Área usuaria registra requerimientos (REQ-12). */
  get puedeRegistrar(): boolean {
    return !!this.centroCosto
      && (this.codigoRol === 'AREA_ESPECIALISTA' || this.codigoRol === 'AREA_JEFE');
  }

  /* ---------------------------------------------------------------------- */
  /* Acciones del flujo                                                     */
  /* ---------------------------------------------------------------------- */

  nuevoRequerimiento(): void {
    this.modalRegistro.abrir(this.centroCosto, this.filtro.AnoEje);
  }

  verDetalle(requerimiento: RequerimientoBandeja): void {
    this.modalDetalle.abrir(requerimiento, {
      puedeEditar: this.puedeEditar(requerimiento)
    });
  }

  editarRequerimiento(requerimiento: RequerimientoBandeja): void {
    this.modalDetalle.cerrar();
    this.modalRegistro.abrirEdicion(requerimiento.IdRequerimiento);
  }

  /**
   * Toda acción pasa por confirmación, incluso las que no exigen comentario: son
   * cambios de estado con efectos fuera de la pantalla —firmas, remisiones a
   * otra unidad— y no deben depender de un clic accidental.
   */
  pedirConfirmacion(requerimiento: RequerimientoBandeja, transicion: TransicionRequerimiento): void {
    this.accionEnCurso = { requerimiento, transicion };
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

    const { requerimiento, transicion } = this.accionEnCurso;

    if (transicion.RequiereComentario && !this.comentario.trim()) {
      this.funciones.mensaje('info',
        'Esta acción exige un comentario. La observación queda en la trazabilidad y es lo que el área usuaria debe subsanar.');
      return;
    }

    this.ejecutando = true;

    /* Firmar: primero paFirmarDocumento (deja la versión vigente en FIRMADO) y
       recién entonces la transición. */
    if (transicion.RequiereFirma) {
      this.paso = 'Buscando el documento a firmar…';
      this.resolverYFirmar(requerimiento, transicion);
      return;
    }

    this.enviarTransicion(requerimiento, transicion);
  }

  /**
   * Resuelve qué documento se firma y lo firma.
   *
   * Normalmente lo dice el motor en `DocumentoRequerido`, y ésa es la fuente
   * que se usa cuando viene. Pero REQ_FIRMAR_AU llega con `DocumentoRequerido`
   * nulo, y no por descuido: el documento depende del objeto de la prestación
   * —EETT para un bien, TDR para un servicio o una consultoría, propuesta y
   * luego TDR para una locación— y `sigcm.Transicion.DocumentoRequerido` es una
   * columna simple que no puede expresar «el que corresponda al objeto».
   *
   * Mientras la semilla no pueda declararlo, se resuelve aquí con el mismo mapa
   * que usa el visor, consultando qué hay registrado para respetar el orden de
   * Locación (REQ-08): se firma el primero de la secuencia que todavía no esté
   * firmado. Es una decisión de pantalla declarada como tal, no una regla de
   * negocio escondida: el motor sigue decidiendo si la transición procede, y
   * `paFirmarDocumento` sigue comprobando que este rol pueda firmar ese tipo de
   * documento.
   *
   * OJO — el motor no está exigiendo el documento. Como `DocumentoRequerido` es
   * nulo, `paEjecutarTransicion` deja pasar REQ_FIRMAR_AU aunque no exista
   * ningún documento registrado. Que aquí se firme antes cierra el circuito por
   * la pantalla, pero no por la base: un cliente que llame directo al endpoint
   * puede saltárselo. El arreglo de fondo es que la transición sepa qué
   * documento exigir, y eso es un cambio en el modelo de sigcm.Transicion.
   */
  private resolverYFirmar(requerimiento: RequerimientoBandeja,
                          transicion: TransicionRequerimiento): void {
    if (transicion.DocumentoRequerido) {
      this.paso = 'Registrando la firma…';
      this.firmarYEjecutar(requerimiento, transicion, transicion.DocumentoRequerido);
      return;
    }

    const esperados = DOCUMENTO_TECNICO[requerimiento.CodigoTipoContratacion] || [];
    if (esperados.length === 0) {
      this.fallar('No se pudo determinar qué documento corresponde firmar para este objeto de prestación.');
      return;
    }

    this.requerimientoService.listarDocumento(requerimiento.IdExpediente).subscribe({
      next: (respuesta: any) => {
        const registrados: any[] = respuesta?.Documentos || [];

        const pendiente = esperados.find(esperado => {
          const doc = registrados.find(d => d.CodigoTipoDocumento === esperado.codigo);
          return !doc || doc.Estado !== 'FIRMADO';
        });

        /* Todos firmados: la firma ya está puesta y esto es un reintento
           después de que fallara la transición. Se sigue adelante. */
        if (!pendiente) {
          this.enviarTransicion(requerimiento, transicion);
          return;
        }

        const existe = registrados.some(d => d.CodigoTipoDocumento === pendiente.codigo);
        if (!existe) {
          this.fallar(
            `Falta registrar el ${pendiente.etiqueta} (${pendiente.anexo}) antes de firmarlo.`);
          return;
        }

        this.paso = `Firmando el ${pendiente.etiqueta}…`;
        this.firmarYEjecutar(requerimiento, transicion, pendiente.codigo);
      },
      error: () => this.fallar('No fue posible consultar los documentos del expediente.')
    });
  }

  /** Firma y, sólo si la firma quedó registrada, mueve el expediente. */
  private firmarYEjecutar(requerimiento: RequerimientoBandeja,
                          transicion: TransicionRequerimiento,
                          codigoTipoDocumento: string): void {
    this.requerimientoService.firmarDocumento(requerimiento.IdExpediente, codigoTipoDocumento).subscribe({
      next: (respuesta: any) => {
        // Que ya estuviera firmada no es un error: puede ser un reintento
        // después de que fallara la transición. Se sigue adelante.
        const yaFirmado = respuesta?.codigo === 51616;

        if (respuesta?.estado !== 1 && !yaFirmado) {
          this.fallar(respuesta?.mensaje || 'No fue posible registrar la firma.');
          return;
        }

        this.enviarTransicion(requerimiento, transicion);
      },
      error: () => this.fallar('No fue posible registrar la firma.')
    });
  }

  /** Paso final: la acción del flujo propiamente dicha. */
  private enviarTransicion(requerimiento: RequerimientoBandeja,
                           transicion: TransicionRequerimiento): void {
    this.paso = 'Registrando la acción…';

    this.requerimientoService.ejecutarTransicion(
      requerimiento.IdExpediente,
      transicion.CodigoTransicion,
      requerimiento.Version,
      this.comentario.trim() || null
    ).subscribe({
      next: (respuesta: any) => {
        this.ejecutando = false;
        this.paso = '';

        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible ejecutar la acción.');
          return;
        }

        this.accionEnCurso = null;
        this.comentario = '';
        this.funciones.mensaje('success', respuesta.mensaje || 'Se registró la acción.');
        this.cargarBandeja();
      },
      error: () => this.fallar('No fue posible comunicarse con el servicio.')
    });
  }

  private fallar(mensaje: string): void {
    this.ejecutando = false;
    this.paso = '';
    this.funciones.mensaje('error', mensaje);
  }

  /** El registro y las acciones cambian la bandeja: se recarga entera. */
  alRegistrar(): void {
    this.cargarBandeja();
  }
}
