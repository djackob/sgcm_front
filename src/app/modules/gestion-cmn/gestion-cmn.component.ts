import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ModalRegistroComponent } from './modals/modal-registro/modal-registro.component';
import { ModalDetalleComponent } from './modals/modal-detalle/modal-detalle.component';
import { CmnService } from './services/cmn.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentoService } from '../../core/services/documento.service';
import { Funciones } from '../../shared/funciones/funciones';
import {
  ExpedienteLoteCmn,
  PaqueteAnexo4Cmn,
  SolicitudCmn,
  SolicitudDetalleCmn,
  TransicionCmn
} from './models/cmn.model';
import { construirAnexo3, nombreArchivoAnexo3 } from './documentos/anexo3.pdfmake';
import { construirAnexo4, nombreArchivoAnexo4 } from './documentos/anexo4.pdfmake';
import { MaestraService } from '../../shared/services/maestra.service';
import { ConfigService } from '../../core/services/config.service';
import { idDocumentoSistema } from '../../shared/funciones/archivo';

/** Los dos tipos de documento del módulo, tal como los nombra la semilla. */
const TIPO_ANEXO_3 = 'CMN_ANEXO_3_SOLICITUD_MODIFICACION';
const TIPO_ANEXO_4 = 'CMN_ANEXO_4_APROBACION_MODIFICACION';

/**
 * Qué documento produce cada acción del flujo.
 *
 * La semilla declara qué transición EXIGE un documento (`DocumentoRequerido`),
 * pero no cuál lo PRODUCE: son dos cosas distintas y sólo la primera es una
 * regla del motor. Este mapa cubre la segunda, que es una decisión de pantalla:
 * al pulsar «Derivar Anexo 3» el navegador arma el PDF, lo sube y lo registra
 * antes de mover el estado.
 *
 * `CMN_GENERAR_A4` NO está aquí, aunque también genere un documento: el Anexo 4
 * necesita reservarse en la base antes de armar el PDF —para emitir su código y
 * para que la regla del viernes falle antes de subir nada—, y eso no cabe en un
 * mapa de «genera tal tipo». Tiene su propio camino, `generarAnexo4`.
 *
 * Si algún día conviene que también sea dato, el lugar natural es una columna
 * `DocumentoGenerado` en `sigcm.Transicion`, y este mapa desaparece.
 */
const DOCUMENTO_QUE_GENERA: { [codigoTransicion: string]: string } = {
  CMN_GENERAR_A3: TIPO_ANEXO_3
};

/** Estados en los que ya existe un Anexo 4 al que mirar. */
const ESTADOS_CON_ANEXO4 = new Set([
  'CMN_A4_FIRMA_COORD',
  'CMN_A4_FIRMA_JEFE',
  'CMN_A4_ENVIADO',
  'CMN_FINALIZADO'
]);

/**
 * Acciones que operan sobre el Anexo 4 completo y no sobre una fila.
 *
 * En la bandeja del jefe, un Anexo 4 múltiple se muestra como un solo registro
 * con sus Anexos 3 dentro. La firma mueve todo el paquete en lote: si cada
 * Anexo 3 se moviera por separado, el primero cerraría el documento y los
 * demás quedarían atrás.
 */
const ACCIONES_DEL_PAQUETE = new Set([
  'CMN_ABAST_JEFE_FIRMAR_A4'
]);

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
export class GestionCmnComponent implements OnInit, OnDestroy {

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

  /**
   * Anexos 3 marcados con el check para armar un Anexo 4.
   *
   * Se guardan los IdSolicitud y no las filas: al recargar la bandeja las filas
   * son objetos nuevos, y una selección por referencia se perdería en cada
   * refresco. Con los ids, lo que ya no está en la página se descarta solo.
   */
  seleccion = new Set<string>();

  /* Confirmación de una acción del flujo */
  accionEnCurso: { solicitud: SolicitudCmn; transicion: TransicionCmn } | null = null;
  comentario = '';
  tipoInclusion = '';
  ejecutando = false;
  /** Expedientes que mueve la acción en curso. Es uno salvo en el Anexo 4. */
  private loteEnCurso: ExpedienteLoteCmn[] = [];
  /** El Anexo 4 sobre el que se está actuando, ya leído de la base. */
  paqueteEnCurso: PaqueteAnexo4Cmn | null = null;
  /** Paso a paso del armado del Anexo 4, para el diálogo de progreso. */
  generandoAnexo4 = false;
  /** Qué se está haciendo ahora: generar, subir, firmar o registrar. */
  paso = '';
  /** URL del PDF recién generado, para ofrecerlo al terminar. */
  documentoGenerado = '';
  private comentarioPendiente: string | null = null;
  private tipoInclusionPendiente: string | null = null;

  visorPdfUrl: SafeResourceUrl | null = null;
  visorPdfObjectUrl = '';
  visorPdfCodigo = '';
  visorPdfTitulo = 'Anexo N.º 03';
  visorPdfSubtitulo = '';
  cargandoPdf = false;
  cargandoPdfId = '';
  cargandoPdfAnexo: 3 | 4 | null = null;

  /** Id del PDF que se envió al firmador (documento_sistema original). */
  documentoSistemaParaFirmar = '';
  /** Id que devuelve el firmador cuando la firma digital terminó. */
  nombreDocumentoFirmado = '';
  private popupFirma: Window | null = null;
  private popupMonitorId: number | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor(
    private cmnService: CmnService,
    private sesion: SessionService,
    private documentoService: DocumentoService,
    private maestraService: MaestraService,
    private funciones: Funciones,
    private sanitizer: DomSanitizer
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

    this.registrarListenerFirma();
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
        this.depurarSeleccion();
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  accionesDe(solicitud: SolicitudCmn): TransicionCmn[] {
    return this.acciones[solicitud.IdExpediente] || [];
  }

  /**
   * En la bandeja del jefe, varios Anexos 3 del mismo paquete se agrupan bajo
   * un solo registro de Anexo 4. El resto de perfiles sigue viendo una fila
   * por expediente.
   */
  agrupaPaquete(solicitud: SolicitudCmn): boolean {
    return this.codigoRol === 'ABAST_JEFE'
      && !!solicitud.IdPaquete
      && this.miembrosDelPaquete(solicitud).length > 1;
  }

  esCabeceraPaquete(solicitud: SolicitudCmn, indice: number): boolean {
    if (!this.agrupaPaquete(solicitud)) {
      return false;
    }
    return this.solicitudes.findIndex(s => s.IdPaquete === solicitud.IdPaquete) === indice;
  }

  miembrosDelPaquete(solicitud: SolicitudCmn): SolicitudCmn[] {
    if (!solicitud.IdPaquete) {
      return [solicitud];
    }
    return this.solicitudes.filter(s => s.IdPaquete === solicitud.IdPaquete);
  }

  montoDelPaquete(solicitud: SolicitudCmn): number {
    return this.miembrosDelPaquete(solicitud).reduce((acc, s) => acc + (Number(s.MontoTotal) || 0), 0);
  }

  itemsDelPaquete(solicitud: SolicitudCmn): number {
    return this.miembrosDelPaquete(solicitud).reduce((acc, s) => acc + (Number(s.Items) || 0), 0);
  }

  /** En la cabecera del Anexo 4: firmar / remitir el paquete entero. */
  accionesDelPaquete(solicitud: SolicitudCmn): TransicionCmn[] {
    return this.accionesDe(solicitud)
      .filter(t => ACCIONES_DEL_PAQUETE.has(t.CodigoTransicion));
  }

  /** En cada Anexo 3 agrupado no se repite la acción del paquete. */
  accionesVisiblesDe(solicitud: SolicitudCmn): TransicionCmn[] {
    const acciones = this.accionesDe(solicitud);
    if (!this.agrupaPaquete(solicitud)) {
      return acciones;
    }
    return acciones.filter(t => !ACCIONES_DEL_PAQUETE.has(t.CodigoTransicion));
  }

  puedeEditarObservacion(solicitud: SolicitudCmn): boolean {
    return solicitud.CodigoEstado === 'CMN_OBSERVADO'
      && this.codigoRol === 'AREA_ESPECIALISTA';
  }

  /* ---------------------------------------------------------------------- */
  /* Selección para el Anexo 4 múltiple                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Una fila se puede marcar si la base ofrece «Generar Anexo 4» sobre ella y
   * todavía no está en ningún Anexo 4.
   *
   * Se pregunta por la transición en vez de comparar el estado con una cadena:
   * el estado desde el que se genera es una decisión de la semilla y aquí no
   * hace falta saber cuál es.
   */
  puedeSeleccionar(solicitud: SolicitudCmn): boolean {
    return !solicitud.IdPaquete
      && this.accionesDe(solicitud).some(t => t.CodigoTransicion === 'CMN_GENERAR_A4');
  }

  estaSeleccionada(solicitud: SolicitudCmn): boolean {
    return this.seleccion.has(solicitud.IdSolicitud);
  }

  alternarSeleccion(solicitud: SolicitudCmn): void {
    if (!this.puedeSeleccionar(solicitud)) {
      return;
    }
    if (this.seleccion.has(solicitud.IdSolicitud)) {
      this.seleccion.delete(solicitud.IdSolicitud);
    } else {
      this.seleccion.add(solicitud.IdSolicitud);
    }
  }

  get seleccionables(): SolicitudCmn[] {
    return this.solicitudes.filter(s => this.puedeSeleccionar(s));
  }

  get haySeleccionables(): boolean {
    return this.seleccionables.length > 0;
  }

  get seleccionadas(): SolicitudCmn[] {
    return this.solicitudes.filter(s => this.seleccion.has(s.IdSolicitud));
  }

  get totalSeleccionadas(): number {
    return this.seleccionadas.length;
  }

  get todasSeleccionadas(): boolean {
    const posibles = this.seleccionables;
    return posibles.length > 0 && posibles.every(s => this.seleccion.has(s.IdSolicitud));
  }

  alternarTodas(): void {
    if (this.todasSeleccionadas) {
      this.seleccionables.forEach(s => this.seleccion.delete(s.IdSolicitud));
      return;
    }
    this.seleccionables.forEach(s => this.seleccion.add(s.IdSolicitud));
  }

  limpiarSeleccion(): void {
    this.seleccion.clear();
  }

  /** Cuántas áreas usuarias distintas hay en lo marcado, para el aviso previo. */
  get areasSeleccionadas(): number {
    return new Set(this.seleccionadas.map(s => s.AreaUsuaria || s.CentroCosto)).size;
  }

  /**
   * Descarta de la selección lo que ya no se puede marcar.
   *
   * Hace falta después de cada recarga: otro especialista pudo tomar una de las
   * solicitudes marcadas para su propio Anexo 4 mientras ésta estaba abierta. Sin
   * esta limpieza el botón seguiría contándola y la base rechazaría el paquete
   * entero por una fila que el usuario ya no ve marcada.
   */
  private depurarSeleccion(): void {
    const vigentes = new Set(this.seleccionables.map(s => s.IdSolicitud));
    const visibles = new Set(this.solicitudes.map(s => s.IdSolicitud));

    this.seleccion.forEach(id => {
      if (visibles.has(id) && !vigentes.has(id)) {
        this.seleccion.delete(id);
      }
    });
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
    if (codigoEstado === 'CMN_FINALIZADO' || codigoEstado === 'CMN_A4_ENVIADO') return 'success';
    /* Toda la cadena de devolución de observaciones se pinta igual: para el área
       usuaria la diferencia entre "lo tiene el coordinador de Abastecimiento" y
       "lo tiene su propio jefe" es de a quién reclamar, no de gravedad. */
    if (codigoEstado.startsWith('CMN_OBS') || codigoEstado === 'CMN_ANULADO') return 'warning';
    if (codigoEstado === 'CMN_BORRADOR') return 'neutral';
    return 'info';
  }

  /** El Anexo 3 ya pasó por Abastecimiento y espera su Anexo 4. */
  esperandoAnexo4(solicitud: SolicitudCmn): boolean {
    return solicitud.CodigoEstado === 'CMN_A3_APROBADO' && !solicitud.IdPaquete;
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
    this.modalDetalle.abrir(solicitud, this.opcionesDetalle(solicitud));
  }

  /**
   * Toda acción pasa por confirmación, incluso las que no exigen comentario: son
   * cambios de estado con efectos fuera de la pantalla —firmas, envíos a otra
   * unidad, encolado hacia SIGA— y no deben depender de un clic accidental.
   */
  pedirConfirmacion(solicitud: SolicitudCmn, transicion: TransicionCmn): void {
    /* Generar el Anexo 4 desde una fila es el mismo camino que generarlo desde
       la selección múltiple, con un solo Anexo 3. Que sea uno o cinco no cambia
       nada del procedimiento: cambia el contenido del documento. */
    if (transicion.CodigoTransicion === 'CMN_GENERAR_A4') {
      this.confirmarAnexo4([solicitud]);
      return;
    }

    /* Firmar el Anexo 4 mueve todo su paquete. Cuáles son sus expedientes lo
       dice la base, no la página: la bandeja está paginada y el paquete puede
       tener filas que no estén a la vista. Deducirlo de lo visible firmaría
       media aprobación. */
    if (ACCIONES_DEL_PAQUETE.has(transicion.CodigoTransicion)) {
      this.abrirAccionDePaquete(solicitud, transicion);
      return;
    }

    this.abrirPanelAccion(solicitud, transicion,
      [{ IdExpediente: solicitud.IdExpediente, Version: solicitud.Version }]);
  }

  private abrirAccionDePaquete(solicitud: SolicitudCmn, transicion: TransicionCmn): void {
    this.cargando = true;

    this.cmnService.obtenerAnexo4({ IdSolicitud: solicitud.IdSolicitud }).subscribe({
      next: (paquete: PaqueteAnexo4Cmn | any) => {
        this.cargando = false;

        if (paquete?.estado !== 1) {
          this.funciones.mensaje('error', paquete?.mensaje || 'No fue posible leer el Anexo 4 de este expediente.');
          return;
        }

        this.paqueteEnCurso = paquete;
        this.abrirPanelAccion(solicitud, transicion,
          (paquete.Solicitudes || []).map((s: any) => ({
            IdExpediente: s.IdExpediente,
            Version: s.Version
          })));
      },
      error: () => {
        this.cargando = false;
        this.funciones.mensaje('error', 'No fue posible leer el Anexo 4 de este expediente.');
      }
    });
  }

  private abrirPanelAccion(solicitud: SolicitudCmn, transicion: TransicionCmn,
                           lote: ExpedienteLoteCmn[]): void {
    this.accionEnCurso = { solicitud, transicion };
    this.loteEnCurso = lote;
    this.comentario = '';
    this.tipoInclusion = solicitud.TipoInclusion === 'URGENTE' ? 'URGENTE'
      : solicitud.TipoInclusion === 'ORDINARIA' ? 'ORDINARIA'
      : '';
    this.limpiarEstadoFirma();
    this.cerrarVisorPdf();

    if (this.muestraPdfAnexo3) {
      this.verAnexo3Pdf(solicitud);
    } else if (this.muestraPdfAnexo4) {
      this.verAnexo4Pdf(solicitud);
    }
  }

  /** Cuántos expedientes moverá la acción en curso, para avisarlo en el panel. */
  get expedientesDeLaAccion(): number {
    return this.loteEnCurso.length;
  }

  private opcionesDetalle(solicitud: SolicitudCmn): {
    puedeEditar: boolean;
    transicionFirmar: TransicionCmn | null;
  } {
    /* El visor ofrece firmar el Anexo 3 cuando la base se lo ofrece a este
       actor. Antes buscaba CMN_FIRMAR_OBS, que no existe en la semilla: el botón
       no aparecía nunca. La transición real es CMN_FIRMAR_A3. */
    return {
      puedeEditar: this.puedeEditarObservacion(solicitud),
      transicionFirmar: this.accionesDe(solicitud)
        .find(t => t.CodigoTransicion === 'CMN_FIRMAR_A3') || null
    };
  }

  editarObservacion(solicitud: SolicitudCmn): void {
    this.modalDetalle.cerrar();
    this.modalRegistro.abrirEdicion(solicitud.IdSolicitud);
  }

  firmarDesdeDetalle(evento: { solicitud: SolicitudCmn; transicion: TransicionCmn }): void {
    this.modalDetalle.cerrar();
    this.abrirPanelAccion(evento.solicitud, evento.transicion,
      [{ IdExpediente: evento.solicitud.IdExpediente, Version: evento.solicitud.Version }]);
  }

  /* ---------------------------------------------------------------------- */
  /* Anexo 4                                                                */
  /* ---------------------------------------------------------------------- */

  /** El botón de la cabecera: genera un Anexo 4 con todo lo marcado. */
  generarAnexo4Multiple(): void {
    if (this.totalSeleccionadas === 0) {
      this.funciones.mensaje('info', 'Marque al menos un Anexo 3 firmado para generar el Anexo 4.');
      return;
    }
    this.confirmarAnexo4(this.seleccionadas);
  }

  private confirmarAnexo4(solicitudes: SolicitudCmn[]): void {
    const codigos = solicitudes.map(s => s.Codigo).join(', ');
    const areas = new Set(solicitudes.map(s => s.AreaUsuaria || s.CentroCosto)).size;

    const resumen = solicitudes.length === 1
      ? `¿Desea generar el Anexo 4 con el Anexo 3 <b>${codigos}</b>?`
      : `¿Desea generar un solo Anexo 4 con <b>${solicitudes.length} Anexos 3</b> `
        + `de <b>${areas} área(s) usuaria(s)</b>?<br><br><small>${codigos}</small>`;

    this.funciones.alertaRetorno(
      'question',
      'Generar Anexo 4',
      resumen + '<br><br>Al confirmar se genera el documento y se envía al Jefe '
        + 'de Abastecimiento para su firma y registro en SIGA.',
      true,
      (resultado: any) => {
        if (resultado?.isConfirmed) {
          this.armarAnexo4(solicitudes);
        }
      }
    );
  }

  /**
   * El Anexo 4, de principio a fin.
   *
   * Son cinco pasos y el orden no es negociable:
   *   1. reservar el paquete en la base — emite el código y aplica la regla del
   *      viernes ANTES de que el navegador arme nada;
   *   2. armar el PDF con lo que devolvió la reserva;
   *   3. subirlo al file server;
   *   4. registrarlo UNA vez contra los N expedientes, con el código del paquete;
   *   5. mover los N expedientes en un solo lote. En Abastecimiento solo
   *      firma el jefe; el especialista genera y deriva, no firma.
   *
   * Si el paso 1 fallara después del 2, habría un PDF subido de un Anexo 4 que
   * no existe. Por eso reservar va primero, aunque obligue a una llamada extra.
   */
  private armarAnexo4(solicitudes: SolicitudCmn[]): void {
    if (this.ejecutando) {
      return;
    }

    this.ejecutando = true;
    this.generandoAnexo4 = true;
    this.paso = 'Reservando el número del Anexo 4…';

    this.cmnService.generarAnexo4(solicitudes.map(s => s.IdSolicitud)).subscribe({
      next: (paquete: PaqueteAnexo4Cmn | any) => {
        if (paquete?.estado !== 1) {
          this.fallarAnexo4(paquete?.mensaje || 'No fue posible generar el Anexo 4.');
          return;
        }

        this.paqueteEnCurso = paquete;
        this.paso = `Armando el Anexo 4 ${paquete.Codigo}…`;

        const definicion = construirAnexo4(paquete);
        const nombre = nombreArchivoAnexo4(paquete);
        const expedientes: ExpedienteLoteCmn[] = (paquete.Solicitudes || [])
          .map((s: any) => ({ IdExpediente: s.IdExpediente, Version: s.Version }));

        this.paso = 'Subiendo el Anexo 4…';

        this.documentoService.generarYSubir(definicion, nombre, 'cmn').subscribe({
          next: (archivo: any) => {
            if (archivo?.estado !== 1) {
              this.fallarAnexo4(archivo?.mensaje || 'No fue posible subir el Anexo 4 al servidor de archivos.');
              return;
            }

            const documentoSistema = idDocumentoSistema(archivo.documento_sistema);
            this.paso = 'Registrando el Anexo 4…';

            this.cmnService.registrarDocumentoConsolidado(
              expedientes.map(e => e.IdExpediente),
              TIPO_ANEXO_4,
              paquete.Codigo,
              documentoSistema,
              archivo.documento_original || nombre,
              {
                IdPaquete: paquete.IdPaquete,
                Codigo: paquete.Codigo,
                Solicitudes: paquete.TotalSolicitudes,
                Items: paquete.TotalItems,
                MontoTotal: paquete.MontoTotal
              }
            ).subscribe({
              next: (registro: any) => {
                if (registro?.estado !== 1) {
                  this.fallarAnexo4(registro?.mensaje || 'No fue posible registrar el Anexo 4.');
                  return;
                }
                this.documentoGenerado = documentoSistema;
                this.firmarYMoverAnexo4(expedientes, paquete);
              },
              error: () => this.fallarAnexo4('No fue posible registrar el Anexo 4.')
            });
          },
          error: () => this.fallarAnexo4('No fue posible subir el Anexo 4 al servidor de archivos.')
        });
      },
      error: () => this.fallarAnexo4('No fue posible comunicarse con el servicio para generar el Anexo 4.')
    });
  }

  /** Paso 5: el movimiento del lote. El especialista no firma el Anexo 4. */
  private firmarYMoverAnexo4(expedientes: ExpedienteLoteCmn[], paquete: PaqueteAnexo4Cmn): void {
    this.paso = 'Enviando al Jefe de Abastecimiento…';

    this.cmnService.ejecutarTransicionLote(expedientes, 'CMN_GENERAR_A4').subscribe({
      next: (respuesta: any) => {
        this.ejecutando = false;
        this.generandoAnexo4 = false;
        this.paso = '';

        if (respuesta?.estado !== 1) {
          /* El paquete quedó creado pero los expedientes no se movieron.
             Se dice cuál es, porque es lo que hay que anular o reintentar:
             sin el código, esas solicitudes quedarían reservadas sin que el
             usuario sepa a nombre de qué. */
          this.funciones.mensaje(
            'error',
            (respuesta?.mensaje || 'No fue posible derivar el Anexo 4.')
            + `<br><br>El Anexo 4 <b>${paquete.Codigo}</b> quedó generado. `
            + 'Vuelva a intentar la derivación o anúlelo para liberar sus Anexos 3.'
          );
          this.cargarBandeja();
          return;
        }

        this.documentoGenerado = '';
        this.paqueteEnCurso = null;
        this.limpiarSeleccion();

        this.funciones.mensaje(
          'success',
          `Se generó el Anexo 4 <b>${paquete.Codigo}</b> con `
          + `${paquete.TotalSolicitudes} Anexo(s) 3 y ${paquete.TotalItems} ítem(s). `
          + 'Está a la espera de la firma del Jefe de Abastecimiento.'
        );
        this.cargarBandeja();
      },
      error: () => this.fallarAnexo4('No fue posible derivar el Anexo 4.')
    });
  }

  private fallarAnexo4(mensaje: string): void {
    this.ejecutando = false;
    this.generandoAnexo4 = false;
    this.paso = '';
    this.documentoGenerado = '';
    this.funciones.mensaje('error', mensaje);
    this.cargarBandeja();
  }

  /** Firmas del Anexo 3: solo el jefe del área usuaria. */
  get muestraPdfAnexo3(): boolean {
    const codigo = this.accionEnCurso?.transicion.CodigoTransicion;
    return codigo === 'CMN_FIRMAR_A3'
      || codigo === 'CMN_SUBS_JEFE_ENVIAR';
  }

  /** En Abastecimiento solo firma el jefe el Anexo 4. */
  get muestraPdfAnexo4(): boolean {
    const codigo = this.accionEnCurso?.transicion.CodigoTransicion;
    return codigo === 'CMN_ABAST_JEFE_FIRMAR_A4';
  }

  get debeInvocarFirmaDigital(): boolean {
    return !!this.accionEnCurso?.transicion.RequiereFirma
      && (this.muestraPdfAnexo3 || this.muestraPdfAnexo4);
  }

  /**
   * Ordinario o urgente se declara al confirmar el Anexo 3, que es el paso 6 del
   * flujo, y de esa marca depende después si el Anexo 4 puede generarse hoy o
   * hay que esperar al viernes.
   */
  get muestraTipoInclusion(): boolean {
    return this.accionEnCurso?.transicion.CodigoTransicion === 'CMN_ABAST_ESP_FIRMAR_A3';
  }

  /** Aviso de la regla del viernes en el panel de conformidad. */
  get hoyEsViernes(): boolean {
    return new Date().getDay() === 5;
  }

  /**
   * El icono del Anexo 3 sólo aparece si hay algo que abrir.
   *
   * La condición es el archivo en el file server, no el estado: mientras la
   * solicitud está en borrador el documento no existe todavía —lo emite
   * «Derivar Anexo 3»— y un botón que promete un PDF inexistente sólo puede
   * terminar en un mensaje de error.
   */
  puedeVerAnexo3Pdf(solicitud: SolicitudCmn): boolean {
    return !!idDocumentoSistema(solicitud.DocumentoSistemaAnexo3);
  }

  puedeVerAnexo4Pdf(solicitud: SolicitudCmn): boolean {
    return !!idDocumentoSistema(solicitud.DocumentoSistemaAnexo4)
      || !!solicitud.IdPaquete
      || ESTADOS_CON_ANEXO4.has(solicitud.CodigoEstado);
  }

  iconoPdfFila(solicitud: SolicitudCmn, anexo: 3 | 4): string {
    if (this.cargandoPdfId === solicitud.IdSolicitud && this.cargandoPdfAnexo === anexo) {
      return 'mdi-loading mdi-spin';
    }
    return anexo === 4 ? 'mdi-file-sign' : 'mdi-file-pdf-box';
  }

  verAnexo3Pdf(solicitud: SolicitudCmn): void {
    this.abrirPdfAnexo(solicitud, 3);
  }

  verAnexo4Pdf(solicitud: SolicitudCmn): void {
    this.abrirPdfAnexo(solicitud, 4);
  }

  private abrirPdfAnexo(solicitud: SolicitudCmn, anexo: 3 | 4): void {
    if (!solicitud || this.cargandoPdf) {
      return;
    }

    /* El visor muestra SIEMPRE el archivo del file server.

       Antes, para los estados anteriores a la firma, el navegador rearmaba el
       PDF con la plantilla vigente en vez de bajarlo. La intención era no
       mostrar un documento desactualizado, pero el efecto era peor: lo que se
       veía —y lo que se firmaba— no era el archivo que quedó registrado en el
       expediente, sino una reconstrucción hecha en ese momento. El documento
       del trámite es el que está en el servidor; si hay que rehacerlo, se
       rehace al generarlo, no al mirarlo. */
    const idFila = idDocumentoSistema(
      anexo === 4 ? solicitud.DocumentoSistemaAnexo4 : solicitud.DocumentoSistemaAnexo3
    );
    if (idFila) {
      this.mostrarArchivoAnexo(solicitud, anexo, idFila);
      return;
    }

    const tipo = anexo === 4
      ? TIPO_ANEXO_4
      : TIPO_ANEXO_3;

    this.cargandoPdf = true;
    this.cargandoPdfId = solicitud.IdSolicitud;
    this.cargandoPdfAnexo = anexo;
    this.cmnService.listarDocumento(solicitud.IdExpediente).subscribe({
      next: (respuesta: any) => {
        const documentos = respuesta?.Documentos || [];
        const doc = documentos.find((d: any) => d.CodigoTipoDocumento === tipo);
        const id = idDocumentoSistema(doc?.GeneradoDocumento);
        if (!id) {
          this.cargandoPdf = false;
          this.cargandoPdfId = '';
          this.cargandoPdfAnexo = null;
          this.funciones.mensaje(
            'info',
            anexo === 4
              ? 'El Anexo 4 aún no fue generado. Use la acción «Generar Anexo 4» para guardarlo en el servidor.'
              : 'El Anexo 3 aún no fue generado. Use la acción «Derivar Anexo 3» para guardarlo en el servidor.'
          );
          return;
        }
        this.mostrarArchivoAnexo(solicitud, anexo, id);
      },
      error: () => {
        this.cargandoPdf = false;
        this.cargandoPdfId = '';
        this.cargandoPdfAnexo = null;
        this.funciones.mensaje('error', 'No fue posible consultar el documento del expediente.');
      }
    });
  }

  private mostrarArchivoAnexo(solicitud: SolicitudCmn, anexo: 3 | 4, id: string): void {
    this.cargandoPdf = true;
    this.cargandoPdfId = solicitud.IdSolicitud;
    this.cargandoPdfAnexo = anexo;
    this.maestraService.descargarArchivo(id, 'cmn').pipe(
      catchError(() => this.maestraService.descargarArchivo(id))
    ).subscribe({
      next: (blob: Blob) => {
        this.cargandoPdf = false;
        this.cargandoPdfId = '';
        this.cargandoPdfAnexo = null;
        this.abrirVisorPdfBlob(
          solicitud,
          anexo,
          this.blobParaVisor(blob, id),
          anexo === 4 ? 'Aprobación de modificaciones del CMN' : 'Solicitud de modificación del CMN'
        );

        if (this.debeInvocarFirmaDigital && !this.nombreDocumentoFirmado) {
          this.abrirFirmaPopup(id, solicitud.Codigo);
        }
      },
      error: () => {
        this.cargandoPdf = false;
        this.cargandoPdfId = '';
        this.cargandoPdfAnexo = null;
        this.funciones.mensaje('error', 'No fue posible descargar el archivo del servidor.');
      }
    });
  }


  /**
   * Repone el tipo MIME cuando el file server no lo declara.
   *
   * Local sirve el archivo con su tipo real, pero el file server de la ANIN
   * responde `application/octet-stream`. Con ese tipo el `<iframe>` del visor no
   * dibuja el PDF: el navegador lo trata como descarga y el que tenía que firmar
   * no llega a ver lo que firma. El tipo se deduce de la extensión del id, que
   * es lo único que se conoce del archivo.
   */
  private blobParaVisor(blob: Blob, nombreArchivo: string): Blob {
    const tipoActual = (blob.type || '').toLowerCase();
    if (tipoActual && tipoActual !== 'application/octet-stream') {
      return blob;
    }

    const extension = (nombreArchivo.split('.').pop() || '').toLowerCase();
    const tipos: { [extension: string]: string } = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp'
    };

    const tipo = tipos[extension];
    return tipo ? new Blob([blob], { type: tipo }) : blob;
  }

  private abrirVisorPdfBlob(solicitud: SolicitudCmn, anexo: 3 | 4, blob: Blob, subtitulo: string): void {
    this.cerrarVisorPdf();
    this.visorPdfCodigo = solicitud.Codigo;
    this.visorPdfTitulo = anexo === 4 ? 'Anexo N.º 04' : 'Anexo N.º 03';
    this.visorPdfSubtitulo = subtitulo;
    this.visorPdfObjectUrl = URL.createObjectURL(blob);
    this.visorPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorPdfObjectUrl);
  }

  imprimirAnexo3Pdf(): void {
    const marco = document.getElementById('marcoAnexoPdf') as HTMLIFrameElement | null;
    marco?.contentWindow?.focus();
    marco?.contentWindow?.print();
  }

  firmarDigitalDesdeVisor(): void {
    const solicitud = this.accionEnCurso?.solicitud;
    if (!solicitud) {
      return;
    }

    const archivo = idDocumentoSistema(
      this.documentoSistemaParaFirmar
      || (this.muestraPdfAnexo4
        ? solicitud.DocumentoSistemaAnexo4
        : solicitud.DocumentoSistemaAnexo3)
    );
    if (!archivo) {
      this.funciones.mensaje('info', 'No hay archivo para firmar digitalmente.');
      return;
    }

    this.abrirFirmaPopup(archivo, solicitud.Codigo);
  }

  urlDocumentoFirmado(): string {
    if (!this.nombreDocumentoFirmado) {
      return '';
    }
    return this.maestraService.urlDescarga(this.nombreDocumentoFirmado, 'cmn');
  }

  cerrarVisorPdf(): void {
    if (this.visorPdfObjectUrl) {
      URL.revokeObjectURL(this.visorPdfObjectUrl);
    }
    this.visorPdfObjectUrl = '';
    this.visorPdfUrl = null;
    this.visorPdfCodigo = '';
    this.visorPdfTitulo = 'Anexo N.º 03';
    this.visorPdfSubtitulo = '';
  }

  cancelarAccion(): void {
    this.cerrarPopupFirma();
    this.limpiarEstadoFirma();
    this.cerrarVisorPdf();
    this.accionEnCurso = null;
    this.loteEnCurso = [];
    this.paqueteEnCurso = null;
    this.comentario = '';
    this.tipoInclusion = '';
  }

  ngOnDestroy(): void {
    this.cerrarPopupFirma();
    this.quitarListenerFirma();
    this.cerrarVisorPdf();
  }

  /**
   * Una acción del flujo puede necesitar hasta tres pasos antes de mover el
   * estado: generar el documento, subirlo y firmarlo. El usuario ve un solo
   * botón; la secuencia se resuelve aquí.
   *
   * Se encadenan en vez de hacerse en una sola llamada porque cada paso tiene
   * su propia regla en la base: registrar comprueba el tipo de documento,
   * firmar comprueba el rol firmante, y la transición comprueba el estado. Si
   * uno falla, el mensaje dice exactamente cuál.
   */
  confirmarAccion(): void {
    if (!this.accionEnCurso || this.ejecutando) {
      return;
    }

    const { solicitud, transicion } = this.accionEnCurso;

    if (transicion.RequiereComentario && !this.comentario.trim()) {
      this.funciones.mensaje('info', 'Esta acción exige un comentario. La observación queda en la trazabilidad y es lo que el área usuaria debe subsanar.');
      return;
    }

    if (this.muestraTipoInclusion && !this.tipoInclusion) {
      this.funciones.mensaje('info', 'Indique si la modificación es Ordinaria o Urgente. De eso depende cuándo podrá generarse el Anexo 4.');
      return;
    }

    this.comentarioPendiente = this.comentario.trim() || null;
    this.tipoInclusionPendiente = this.muestraTipoInclusion ? this.tipoInclusion : null;

    this.iniciarEjecucion(solicitud, transicion);
  }

  private iniciarEjecucion(solicitud: SolicitudCmn, transicion: TransicionCmn): void {
    if (this.ejecutando) {
      return;
    }

    /* Los pasos siguientes leen la acción de aquí, y no de sus argumentos: hay
       caminos —el envío a OA, la firma desde el detalle— que confirman con su
       propio diálogo y entran directamente, sin pasar por el panel de acción.
       Esos mismos caminos son de un solo expediente, así que el lote se rellena
       aquí si nadie lo dejó puesto. */
    this.accionEnCurso = { solicitud, transicion };
    if (this.loteEnCurso.length === 0) {
      this.loteEnCurso = [{ IdExpediente: solicitud.IdExpediente, Version: solicitud.Version }];
    }
    this.ejecutando = true;

    const tipoDocumento = DOCUMENTO_QUE_GENERA[transicion.CodigoTransicion];

    if (tipoDocumento) {
      this.paso = 'Generando el documento…';
      this.generarYRegistrarDocumento(tipoDocumento);
      return;
    }

    /* Firmar Anexo 3 / 4: primero paFirmarDocumento (deja la versión vigente
       en FIRMADO) y recién entonces la transición. El motor exige el documento
       ya firmado; sin este POST responde CONFLICTO_DOCUMENTO. */
    if (transicion.RequiereFirma && transicion.DocumentoRequerido) {
      this.paso = 'Registrando la firma…';
      this.firmarYEjecutar(transicion.DocumentoRequerido);
      return;
    }

    this.enviarTransicion();
  }

  /** Paso 1 y 2: armar el PDF con los datos vigentes y depositarlo. */
  private generarYRegistrarDocumento(codigoTipoDocumento: string): void {
    const solicitud = this.accionEnCurso!.solicitud;

    // El PDF se arma con lo que hay en la base ahora, no con lo que quedó en
    // pantalla: entre abrir la bandeja y pulsar el botón el expediente pudo
    // cambiar, y el documento debe reflejar lo que se está aprobando.
    this.cmnService.obtenerSolicitud(solicitud.IdSolicitud).subscribe({
      next: (detalle: SolicitudDetalleCmn | any) => {
        if (detalle?.estado !== 1) {
          this.fallar(detalle?.mensaje || 'No fue posible leer la solicitud para armar el documento.');
          return;
        }

        /* Sólo el Anexo 3 pasa por aquí. El Anexo 4 se arma en `armarAnexo4`,
           que antes tiene que reservar el paquete para conocer su código. */
        const definicion = construirAnexo3(detalle);
        const nombre = nombreArchivoAnexo3(detalle);

        this.paso = 'Subiendo el documento…';

        this.documentoService.generarYSubir(definicion, nombre, 'cmn').subscribe({
          next: (archivo: any) => {
            if (archivo?.estado !== 1) {
              this.fallar(archivo?.mensaje || 'No fue posible subir el documento al servidor de archivos.');
              return;
            }

            const documentoSistema = idDocumentoSistema(archivo.documento_sistema);
            this.paso = 'Registrando el documento…';

            this.cmnService.registrarDocumento(
              solicitud.IdExpediente, codigoTipoDocumento,
              documentoSistema, archivo.documento_original,
              { Codigo: detalle.Codigo, Items: detalle.Items?.length || 0 }
            ).subscribe({
              next: (registro: any) => {
                if (registro?.estado !== 1) {
                  this.fallar(registro?.mensaje || 'No fue posible registrar el documento.');
                  return;
                }
                this.documentoGenerado = documentoSistema;
                this.enviarTransicion();
              },
              error: () => this.fallar('No fue posible registrar el documento.')
            });
          },
          error: () => this.fallar('No fue posible subir el documento al servidor de archivos.')
        });
      },
      error: () => this.fallar('No fue posible leer la solicitud para armar el documento.')
    });
  }

  /** Firma y, sólo si la firma quedó registrada, mueve el expediente. */
  private firmarYEjecutar(codigoTipoDocumento: string): void {
    const solicitud = this.accionEnCurso!.solicitud;
    const firmado = idDocumentoSistema(this.nombreDocumentoFirmado);
    const original = idDocumentoSistema(this.documentoSistemaParaFirmar);

    if (firmado && firmado !== original) {
      this.paso = 'Registrando el documento firmado…';
      this.cmnService.registrarDocumento(
        solicitud.IdExpediente,
        codigoTipoDocumento,
        firmado,
        firmado,
        { Codigo: solicitud.Codigo, FirmadoDigital: true }
      ).subscribe({
        next: (registro: any) => {
          if (registro?.estado !== 1) {
            this.fallar(registro?.mensaje || 'No fue posible registrar el documento firmado.');
            return;
          }
          if (codigoTipoDocumento === TIPO_ANEXO_4) {
            solicitud.DocumentoSistemaAnexo4 = firmado;
          } else {
            solicitud.DocumentoSistemaAnexo3 = firmado;
          }
          this.registrarFirmaEnExpediente(solicitud, codigoTipoDocumento);
        },
        error: () => this.fallar('No fue posible registrar el documento firmado.')
      });
      return;
    }

    this.registrarFirmaEnExpediente(solicitud, codigoTipoDocumento);
  }

  private registrarFirmaEnExpediente(solicitud: SolicitudCmn, codigoTipoDocumento: string): void {
    this.paso = 'Registrando la firma…';
    this.cmnService.firmarDocumento(solicitud.IdExpediente, codigoTipoDocumento).subscribe({
      next: (respuesta: any) => {
        // Que ya estuviera firmada no es un error: puede ser un reintento
        // después de que fallara la transición. Se sigue adelante.
        const yaFirmado = respuesta?.codigo === 51616;

        if (respuesta?.estado !== 1 && !yaFirmado) {
          this.fallar(respuesta?.mensaje || 'No fue posible registrar la firma.');
          return;
        }

        this.enviarTransicion();
      },
      error: () => this.fallar('No fue posible registrar la firma.')
    });
  }

  /**
   * Paso final: la acción del flujo propiamente dicha.
   *
   * Siempre por lote, aunque casi siempre el lote tenga un solo expediente. Una
   * única ruta de salida evita que la firma del Anexo 4 —el caso de varios— siga
   * un camino distinto del resto y se le escapen los cambios que se hagan aquí.
   */
  private enviarTransicion(): void {
    const { transicion } = this.accionEnCurso!;
    this.paso = this.loteEnCurso.length > 1
      ? `Registrando la acción sobre ${this.loteEnCurso.length} expedientes…`
      : 'Registrando la acción…';

    this.cmnService.ejecutarTransicionLote(
      this.loteEnCurso,
      transicion.CodigoTransicion,
      this.comentarioPendiente,
      this.tipoInclusionPendiente
    ).subscribe({
      next: (respuesta: any) => {
        this.ejecutando = false;
        this.paso = '';

        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible ejecutar la acción.');
          return;
        }

        this.cerrarPopupFirma();
        this.limpiarEstadoFirma();
        this.cerrarVisorPdf();
        this.accionEnCurso = null;
        this.loteEnCurso = [];
        this.paqueteEnCurso = null;
        this.comentario = '';
        this.tipoInclusion = '';
        this.comentarioPendiente = null;
        this.tipoInclusionPendiente = null;

        const extra = this.documentoGenerado
          ? '<br><br>Ábralo con el icono del Anexo en la bandeja.'
          : '';
        this.documentoGenerado = '';

        this.funciones.mensaje('success', (respuesta.mensaje || 'Se registró la acción.') + extra);
        this.cargarBandeja();
      },
      error: () => this.fallar('No fue posible comunicarse con el servicio.')
    });
  }

  private fallar(mensaje: string): void {
    this.ejecutando = false;
    this.paso = '';
    this.documentoGenerado = '';
    this.funciones.mensaje('error', mensaje);
  }

  private registrarListenerFirma(): void {
    this.quitarListenerFirma();
    this.messageListener = (event: MessageEvent) => this.recibirMensajeFirma(event);
    window.addEventListener('message', this.messageListener);
  }

  private quitarListenerFirma(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }

  private recibirMensajeFirma(event: MessageEvent): void {
    const origenFirma = this.origenNormalizado(ConfigService.settings?.firma?.ruta_iframe);
    const origenApp = this.origenNormalizado(window.location.origin);
    const origenEvento = this.origenNormalizado(event.origin);

    // El firmador (sfirma) o doc_firmado.html (mismo origin del front) pueden responder.
    if (origenEvento !== origenFirma && origenEvento !== origenApp) {
      return;
    }

    const rpta = this.leerRespuestaFirma(event.data);
    if (!rpta) {
      return;
    }

    if (rpta.estado == 1) {
      this.nombreDocumentoFirmado = rpta.documento_sistema;
      this.funciones.mensaje(
        'success',
        'La firma digital se completó. Confirme la acción para registrar el documento firmado.'
      );
      this.mostrarPdfFirmado(rpta.documento_sistema);
      return;
    }

    this.funciones.mensaje('info', 'Proceso de firma digital cancelado.');
  }

  private origenNormalizado(valor: string | undefined | null): string {
    return (valor || '').replace(/\/+$/, '');
  }

  private leerRespuestaFirma(data: any): any | null {
    try {
      if (data?.archivo) {
        const interior = typeof data.archivo === 'string' ? JSON.parse(data.archivo) : data.archivo;
        const rptaSg = interior?.rpta_sg ?? interior;
        return typeof rptaSg === 'string' ? JSON.parse(rptaSg) : rptaSg;
      }

      if (typeof data === 'string' && data) {
        const parsed = JSON.parse(data);
        const rptaSg = parsed?.rpta_sg ?? parsed;
        return typeof rptaSg === 'string' ? JSON.parse(rptaSg) : rptaSg;
      }

      if (data?.rpta_sg) {
        return typeof data.rpta_sg === 'string' ? JSON.parse(data.rpta_sg) : data.rpta_sg;
      }

      if (data?.documento_sistema) {
        return data;
      }
    } catch {
      return null;
    }

    return null;
  }

  private mostrarPdfFirmado(documentoSistema: string): void {
    const solicitud = this.accionEnCurso?.solicitud;
    if (!solicitud) {
      return;
    }

    const anexo: 3 | 4 = this.muestraPdfAnexo4 ? 4 : 3;
    this.maestraService.descargarArchivo(documentoSistema).pipe(
      catchError(() => this.maestraService.descargarArchivo(documentoSistema, 'cmn'))
    ).subscribe({
      next: (blob: Blob) => {
        this.abrirVisorPdfBlob(
          solicitud,
          anexo,
          this.blobParaVisor(blob, documentoSistema),
          'Documento firmado digitalmente'
        );
      }
    });
  }

  private abrirFirmaPopup(
    documentoSistema: string,
    descripcionDocumentoFirma = '',
    nombreSistema = 'SCM'
  ): void {
    const firma = ConfigService.settings?.firma;
    if (!firma?.ruta_iframe || !firma.ruta_archivo) {
      this.funciones.mensaje(
        'error',
        'Falta la configuración de firma digital en config.json (firma.ruta_iframe / ruta_archivo).'
      );
      return;
    }

    if (this.popupFirma && !this.popupFirma.closed) {
      this.popupFirma.focus();
      return;
    }

    this.documentoSistemaParaFirmar = documentoSistema;
    this.nombreDocumentoFirmado = '';

    const origenApp = window.location.origin.replace(/\/+$/, '');
    const rutaRespuesta =
      (firma.ruta_respuesta || `${origenApp}/assets/formats/doc_firmado.html?firmado=&strdoc=`)
      + documentoSistema;
    const rutaArchivo = firma.ruta_archivo + firma.ruta_carpeta + '/' + documentoSistema;

    const urlFirma =
      firma.ruta_iframe +
      '?v=1.' +
      String(new Date().getTime()) +
      '&strcarpeta=' +
      encodeURIComponent(firma.ruta_carpeta) +
      '&rutarespuesta=' +
      encodeURIComponent(rutaRespuesta) +
      '&ruta_archivo=' +
      encodeURIComponent(rutaArchivo) +
      '&descripcion=' +
      encodeURIComponent(descripcionDocumentoFirma) +
      '&sistema=' +
      encodeURIComponent(nombreSistema);

    const width = 400;
    const height = 250;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    this.popupFirma = window.open(
      urlFirma,
      'firma_onpe',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no,location=no,toolbar=no,menubar=no`
    );

    if (!this.popupFirma) {
      this.funciones.mensaje(
        'info',
        'El navegador bloqueó la ventana de firma digital. Permita ventanas emergentes para este sitio e inténtelo de nuevo.'
      );
      return;
    }

    this.iniciarMonitoreoPopup();
  }

  private iniciarMonitoreoPopup(): void {
    this.detenerMonitoreoPopup();
    this.popupMonitorId = window.setInterval(() => {
      if (!this.popupFirma) {
        this.detenerMonitoreoPopup();
        return;
      }

      if (this.popupFirma.closed) {
        this.popupFirma = null;
        this.detenerMonitoreoPopup();
      }
    }, 500);
  }

  private detenerMonitoreoPopup(): void {
    if (this.popupMonitorId !== null) {
      window.clearInterval(this.popupMonitorId);
      this.popupMonitorId = null;
    }
  }

  private cerrarPopupFirma(): void {
    this.detenerMonitoreoPopup();
    this.popupFirma?.close();
    this.popupFirma = null;
  }

  private limpiarEstadoFirma(): void {
    this.documentoSistemaParaFirmar = '';
    this.nombreDocumentoFirmado = '';
  }

  /** El registro y las acciones cambian la bandeja: se recarga entera. */
  alRegistrar(): void {
    this.cargarBandeja();
  }
}
