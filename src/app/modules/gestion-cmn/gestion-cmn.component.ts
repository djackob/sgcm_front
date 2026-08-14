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
import { SolicitudCmn, SolicitudDetalleCmn, TransicionCmn } from './models/cmn.model';
import { htmlAnexo3 } from './documentos/anexo3.plantilla';
import { htmlAnexo4 } from './documentos/anexo4.plantilla';
import { construirAnexo3, nombreArchivoAnexo3 } from './documentos/anexo3.pdfmake';

/**
 * Qué documento produce cada acción del flujo.
 *
 * La semilla declara qué transición EXIGE un documento (`DocumentoRequerido`),
 * pero no cuál lo PRODUCE: son dos cosas distintas y sólo la primera es una
 * regla del motor. Este mapa cubre la segunda, que es una decisión de pantalla:
 * al pulsar «Generar Anexo 3» el navegador arma el PDF, lo sube y lo registra
 * antes de mover el estado.
 *
 * Si algún día conviene que también sea dato, el lugar natural es una columna
 * `DocumentoGenerado` en `sigcm.Transicion`, y este mapa desaparece.
 */
const DOCUMENTO_QUE_GENERA: { [codigoTransicion: string]: string } = {
  CMN_GENERAR_A3: 'CMN_ANEXO_3_SOLICITUD_MODIFICACION'
};

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

  /* Confirmación de una acción del flujo */
  accionEnCurso: { solicitud: SolicitudCmn; transicion: TransicionCmn } | null = null;
  comentario = '';
  tipoInclusion = '';
  ejecutando = false;
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

  constructor(
    private cmnService: CmnService,
    private sesion: SessionService,
    private documentoService: DocumentoService,
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
    return (this.acciones[solicitud.IdExpediente] || [])
      .filter(t => t.CodigoTransicion !== 'CMN_SUBSANAR');
  }

  puedeEditarObservacion(solicitud: SolicitudCmn): boolean {
    return solicitud.CodigoEstado === 'CMN_OBSERVADO'
      && (this.codigoRol === 'AREA_ESPECIALISTA' || this.codigoRol === 'AREA_JEFE');
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
    this.modalDetalle.abrir(solicitud, this.opcionesDetalle(solicitud));
  }

  /**
   * Toda acción pasa por confirmación, incluso las que no exigen comentario: son
   * cambios de estado con efectos fuera de la pantalla —firmas, envíos a otra
   * unidad, encolado hacia SIGA— y no deben depender de un clic accidental.
   */
  pedirConfirmacion(solicitud: SolicitudCmn, transicion: TransicionCmn): void {
    if (transicion.CodigoTransicion === 'CMN_ENVIAR_OA') {
      this.confirmarEnvioOa(solicitud, transicion);
      return;
    }

    /* Observado: el mockup no pone Editar/Firmar en la grilla; los muestra
       dentro del visor del Anexo 3. */
    if (transicion.CodigoTransicion === 'CMN_FIRMAR_OBS') {
      this.verDetalle(solicitud);
      return;
    }

    this.accionEnCurso = { solicitud, transicion };
    this.comentario = '';
    this.tipoInclusion = solicitud.TipoInclusion === 'URGENTE' ? 'URGENTE'
      : solicitud.TipoInclusion === 'ORDINARIA' ? 'ORDINARIA'
      : '';
    this.cerrarVisorPdf();
  }

  private opcionesDetalle(solicitud: SolicitudCmn): {
    puedeEditar: boolean;
    transicionFirmar: TransicionCmn | null;
  } {
    return {
      puedeEditar: this.puedeEditarObservacion(solicitud),
      transicionFirmar: this.accionesDe(solicitud)
        .find(t => t.CodigoTransicion === 'CMN_FIRMAR_OBS') || null
    };
  }

  editarObservacion(solicitud: SolicitudCmn): void {
    this.modalDetalle.cerrar();
    this.modalRegistro.abrirEdicion(solicitud.IdSolicitud);
  }

  firmarDesdeDetalle(evento: { solicitud: SolicitudCmn; transicion: TransicionCmn }): void {
    this.funciones.alertaRetorno(
      'question',
      'Firmar Anexo 3',
      `¿Desea firmar el Anexo 3 <b>${evento.solicitud.Codigo}</b>? La firma anterior queda invalidada.`,
      true,
      (resultado: any) => {
        if (resultado?.isConfirmed) {
          this.modalDetalle.cerrar();
          this.comentarioPendiente = null;
          this.tipoInclusionPendiente = null;
          this.iniciarEjecucion(evento.solicitud, evento.transicion);
        }
      }
    );
  }

  private confirmarEnvioOa(solicitud: SolicitudCmn, transicion: TransicionCmn): void {
    this.funciones.alertaRetorno(
      'question',
      'Confirmar envío',
      `¿Desea enviar el Anexo 3 <b>${solicitud.Codigo}</b> a la Oficina de Administración?`,
      true,
      (resultado: any) => {
        if (resultado?.isConfirmed) {
          this.comentarioPendiente = null;
          this.tipoInclusionPendiente = null;
          this.iniciarEjecucion(solicitud, transicion);
        }
      }
    );
  }

  get muestraPdfAnexo3(): boolean {
    const codigo = this.accionEnCurso?.transicion.CodigoTransicion;
    return codigo === 'CMN_FIRMAR_A3' || codigo === 'CMN_FIRMAR_OBS';
  }

  get muestraPdfAnexo4(): boolean {
    return this.accionEnCurso?.transicion.CodigoTransicion === 'CMN_FIRMAR_A4';
  }

  get muestraTipoInclusion(): boolean {
    return this.accionEnCurso?.transicion.CodigoTransicion === 'CMN_VALIDAR_UA';
  }

  puedeVerAnexo4Pdf(solicitud: SolicitudCmn): boolean {
    return solicitud.CodigoEstado === 'CMN_A4_FIRMADO'
      || solicitud.CodigoEstado === 'CMN_A4_ENVIADO'
      || solicitud.CodigoEstado === 'CMN_FINALIZADO';
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

    this.cargandoPdf = true;
    this.cargandoPdfId = solicitud.IdSolicitud;
    this.cargandoPdfAnexo = anexo;
    this.cmnService.obtenerSolicitud(solicitud.IdSolicitud).subscribe({
      next: (respuesta: any) => {
        this.cargandoPdf = false;
        this.cargandoPdfId = '';
        this.cargandoPdfAnexo = null;
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error',
            respuesta?.mensaje || `No fue posible armar el Anexo ${anexo}.`);
          return;
        }
        const html = anexo === 4
          ? htmlAnexo4(respuesta, window.location.origin)
          : htmlAnexo3(respuesta, window.location.origin);
        this.cerrarVisorPdf();
        this.visorPdfCodigo = solicitud.Codigo;
        this.visorPdfTitulo = anexo === 4 ? 'Anexo N.º 04' : 'Anexo N.º 03';
        this.visorPdfSubtitulo = anexo === 4
          ? 'Aprobación de modificaciones del CMN'
          : 'Solicitud de modificación del CMN';
        this.visorPdfObjectUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        this.visorPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorPdfObjectUrl);
      },
      error: () => {
        this.cargandoPdf = false;
        this.cargandoPdfId = '';
        this.cargandoPdfAnexo = null;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  imprimirAnexo3Pdf(): void {
    const marco = document.getElementById('marcoAnexoPdf') as HTMLIFrameElement | null;
    marco?.contentWindow?.focus();
    marco?.contentWindow?.print();
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
    this.cerrarVisorPdf();
    this.accionEnCurso = null;
    this.comentario = '';
    this.tipoInclusion = '';
  }

  ngOnDestroy(): void {
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

    if (transicion.CodigoTransicion === 'CMN_VALIDAR_UA' && !this.tipoInclusion) {
      this.funciones.mensaje('info', 'Seleccione el tipo de inclusión: Ordinario o Urgente.');
      return;
    }

    this.comentarioPendiente = this.comentario.trim() || null;
    this.tipoInclusionPendiente = transicion.CodigoTransicion === 'CMN_VALIDAR_UA'
      ? this.tipoInclusion
      : null;

    this.iniciarEjecucion(solicitud, transicion);
  }

  private iniciarEjecucion(solicitud: SolicitudCmn, transicion: TransicionCmn): void {
    if (this.ejecutando) {
      return;
    }

    this.ejecutando = true;

    const tipoDocumento = DOCUMENTO_QUE_GENERA[transicion.CodigoTransicion];

    if (tipoDocumento) {
      this.paso = 'Generando el documento…';
      this.generarYRegistrarDocumento(tipoDocumento);
      return;
    }

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

        const definicion = construirAnexo3(detalle);
        const nombre = nombreArchivoAnexo3(detalle);

        this.paso = 'Subiendo el documento…';

        this.documentoService.generarYSubir(definicion, nombre, 'cmn').subscribe({
          next: (archivo: any) => {
            if (archivo?.estado !== 1) {
              this.fallar(archivo?.mensaje || 'No fue posible subir el documento al servidor de archivos.');
              return;
            }

            this.paso = 'Registrando el documento…';

            this.cmnService.registrarDocumento(
              solicitud.IdExpediente, codigoTipoDocumento,
              archivo.documento_sistema, archivo.documento_original,
              { Codigo: detalle.Codigo, Items: detalle.Items?.length || 0 }
            ).subscribe({
              next: (registro: any) => {
                if (registro?.estado !== 1) {
                  this.fallar(registro?.mensaje || 'No fue posible registrar el documento.');
                  return;
                }
                this.documentoGenerado = archivo.documento_sistema;
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

  /** Paso final: la acción del flujo propiamente dicha. */
  private enviarTransicion(): void {
    const { solicitud, transicion } = this.accionEnCurso!;
    this.paso = 'Registrando la acción…';

    this.cmnService.ejecutarTransicion(
      solicitud.IdExpediente,
      transicion.CodigoTransicion,
      solicitud.Version,
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

        this.cerrarVisorPdf();
        this.accionEnCurso = null;
        this.comentario = '';
        this.tipoInclusion = '';
        this.comentarioPendiente = null;
        this.tipoInclusionPendiente = null;

        const enlace = this.documentoGenerado
          ? `<br><br><a href="${this.documentoGenerado}" target="_blank">Ver el documento generado</a>`
          : '';
        this.documentoGenerado = '';

        this.funciones.mensaje('success', (respuesta.mensaje || 'Se registró la acción.') + enlace);
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

  /** El registro y las acciones cambian la bandeja: se recarga entera. */
  alRegistrar(): void {
    this.cargarBandeja();
  }
}
