import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { map, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ModalRegistroRequerimientoComponent } from './modals/modal-registro/modal-registro.component';
import { ModalDetalleRequerimientoComponent } from './modals/modal-detalle/modal-detalle.component';
import { ModalAnexo3RequerimientoComponent } from './modals/modal-anexo3/modal-anexo3.component';
import { ModalSolicitarCcpComponent } from './modals/modal-solicitar-ccp/modal-solicitar-ccp.component';
import { ModalCargarCcpComponent } from './modals/modal-cargar-ccp/modal-cargar-ccp.component';
import { ModalOrdenServicioComponent } from './modals/modal-orden-servicio/modal-orden-servicio.component';
import { RequerimientoService } from './services/requerimiento.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentoService } from '../../core/services/documento.service';
import { MaestraService } from '../../shared/services/maestra.service';
import { ConfigService } from '../../core/services/config.service';
import { Funciones } from '../../shared/funciones/funciones';
import { esPdfDelFileServer, idDocumentoSistema } from '../../shared/funciones/archivo';
import {
  CARPETA_ANEXO_5,
  TIPO_ANEXO_5,
  construirAnexo5,
  nombreArchivoAnexo5
} from './documentos/anexo5.pdfmake';
import {
  CARPETA_ANEXO_3,
  TIPO_ANEXO_3
} from './documentos/anexo3.pdfmake';
import { ccpTieneDatos, normalizarCcp } from './documentos/ccp-carga.util';
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
 * Los botones de acción salen del arreglo Transiciones de cada fila
 * (requerimiento.paListarRequerimiento). La pantalla NO decide qué se puede
 * hacer: lo pinta. Deducir la acción a partir del estado significaría
 * reimplementar la máquina de estados en TypeScript y confiar en que las dos
 * copias no se separen.
 *
 * LA BIFURCACIÓN DE LA DEC (REQ-14) NO SE PROGRAMA AQUÍ
 * Que un requerimiento con DEC = Abastecimiento pase por OA y uno con DEC = DAI
 * no lo haga es una regla del motor: REQ_REMITIR_OA y REQ_REMITIR_DAI salen del
 * mismo estado de origen y la rutina ofrece la que corresponde según
 * Requerimiento.CodigoDec. Aquí sólo se dibujan los botones que llegaron.
 *
 * ALCANCE
 * Del registro a la notificación de la orden de servicio en locación (ERF
 * contratos menores ≤ 8 UIT): documentos técnicos, circuito AU (Coordinador
 * V.B. y firma del Jefe), OA/DEC, filtros de idoneidad, CCP y O/S.
 */
@Component({
  selector: 'app-gestion-requerimiento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BreadcrumbComponent,
    ModalRegistroRequerimientoComponent,
    ModalDetalleRequerimientoComponent,
    ModalAnexo3RequerimientoComponent,
    ModalSolicitarCcpComponent,
    ModalCargarCcpComponent,
    ModalOrdenServicioComponent
  ],
  templateUrl: './gestion-requerimiento.component.html',
  styleUrl: './gestion-requerimiento.component.scss',
})
export class GestionRequerimientoComponent implements OnInit, OnDestroy {

  @ViewChild(ModalRegistroRequerimientoComponent) modalRegistro!: ModalRegistroRequerimientoComponent;
  @ViewChild(ModalDetalleRequerimientoComponent) modalDetalle!: ModalDetalleRequerimientoComponent;
  @ViewChild(ModalAnexo3RequerimientoComponent) modalAnexo3!: ModalAnexo3RequerimientoComponent;
  @ViewChild(ModalSolicitarCcpComponent) modalSolicitarCcp!: ModalSolicitarCcpComponent;
  @ViewChild(ModalCargarCcpComponent) modalCargarCcp!: ModalCargarCcpComponent;
  @ViewChild(ModalOrdenServicioComponent) modalOrdenServicio!: ModalOrdenServicioComponent;

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
  cargandoPdfId = '';
  cargandoPdf = false;

  visorPdfUrl: SafeResourceUrl | null = null;
  visorPdfObjectUrl = '';
  visorPdfCodigo = '';
  visorPdfTitulo = 'Anexo';
  visorPdfSubtitulo = '';

  documentoPendienteFirma: { codigo: string; etiqueta: string; anexo: string } | null = null;
  /** Documentos a firmar en esta acción (Anexo 5 y/o Anexo 3 en locación). */
  secuenciaPendienteFirma: { codigo: string; etiqueta: string; anexo: string }[] = [];
  /** PDF firmado por sfirma, indexado por CodigoTipoDocumento. */
  firmaDigitalPorTipo: { [codigoTipo: string]: string } = {};
  documentoSistemaParaFirmar = '';
  nombreDocumentoFirmado = '';
  private popupFirma: Window | null = null;
  private popupMonitorId: number | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor(
    private requerimientoService: RequerimientoService,
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
    this.breadcrumb = ['Requerimiento', this.unidad, this.rol].filter(x => !!x);

    this.registrarListenerFirma();
    this.cargarBandeja();
  }

  ngOnDestroy(): void {
    this.cerrarPopupFirma();
    this.quitarListenerFirma();
    this.cerrarVisorPdf();
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
        this.acciones = {};
        for (const r of this.requerimientos) {
          this.acciones[r.IdExpediente] = this.transicionesDeFila(r);
        }
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.requerimientos = [];
      }
    });
  }

  /**
   * Acciones de la grilla. REQ_REMITIR_DAI está apagado en la semilla y aquí
   * por si alguna fila lo trae. REQ_SUBSANAR sí se muestra: es el botón con el
   * que el Especialista AU abre la corrección cuando Abastecimiento observó.
   */
  accionesDe(requerimiento: RequerimientoBandeja): TransicionRequerimiento[] {
    return this.transicionesCompletasDe(requerimiento)
      .filter(t => t.CodigoTransicion !== 'REQ_REMITIR_DAI');
  }

  /** Transiciones que vienen en la fila. Si el motor las serializó como
   *  texto, se parsean para que la bandeja siempre reciba un arreglo. */
  private transicionesDeFila(requerimiento: RequerimientoBandeja): TransicionRequerimiento[] {
    const raw: any = requerimiento.Transiciones;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private transicionesCompletasDe(requerimiento: RequerimientoBandeja): TransicionRequerimiento[] {
    return this.acciones[requerimiento.IdExpediente] || this.transicionesDeFila(requerimiento);
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
    const disponibles = this.transicionesCompletasDe(requerimiento);
    return disponibles.some(t =>
      t.CodigoTransicion === 'REQ_SUBSANAR' || t.CodigoTransicion === 'REQ_ELABORAR_DOC');
  }

  /** Hay botón de transición en la grilla (no solo el lápiz de edición). */
  tieneAccionVisible(requerimiento: RequerimientoBandeja): boolean {
    return this.accionesDe(requerimiento).length > 0;
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
    if (codigoEstado === 'REQ_CONFORME' || codigoEstado === 'REQ_NOTIFICADO') return 'success';
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

  puedeVerAnexo5(item: RequerimientoBandeja): boolean {
    return item.CodigoTipoContratacion === 'LOCACION'
      || item.CodigoTipoDocumento === TIPO_ANEXO_5
      || !!this.idPdfAnexo5(item);
  }

  puedeVerAnexo3(item: RequerimientoBandeja): boolean {
    return item.CodigoTipoContratacion === 'LOCACION'
      || item.CodigoTipoDocumento === TIPO_ANEXO_3;
  }

  iconoPdfFila(item: RequerimientoBandeja): string {
    return this.cargandoPdfId === item.IdRequerimiento
      ? 'mdi-loading mdi-spin'
      : 'mdi-file-pdf-box';
  }

  abrirAnexo3(idRequerimiento: string): void {
    if (!idRequerimiento) {
      return;
    }
    this.modalAnexo3.abrir(idRequerimiento);
  }

  /**
   * paListarDocumento a veces devuelve Documentos ya como arreglo y a veces
   * como texto JSON. Sin normalizar, `.find` / `.some` fallan y la firma cree
   * que falta el Anexo 3 aunque esté grabado.
   */
  private documentosDeRespuesta(respuesta: any): any[] {
    const raw = respuesta?.Documentos;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  verAnexo3Pdf(item: RequerimientoBandeja): void {
    if (!item || this.cargandoPdfId) {
      return;
    }

    const idSesion = idDocumentoSistema(this.firmaDigitalPorTipo[TIPO_ANEXO_3] || '');
    if (idSesion) {
      this.abrirPdfAnexo(
        item,
        idSesion,
        'Anexo 3',
        'Términos de referencia',
        CARPETA_ANEXO_3,
        'No fue posible abrir el Anexo 3.'
      );
      return;
    }

    this.cargandoPdfId = item.IdRequerimiento;
    this.requerimientoService.listarDocumento(item.IdExpediente).subscribe({
      next: (respuesta: any) => {
        if (respuesta?.estado !== 1) {
          this.cargandoPdfId = '';
          this.funciones.mensaje('error',
            respuesta?.mensaje || 'No fue posible consultar el documento del expediente.');
          return;
        }
        const documentos = this.documentosDeRespuesta(respuesta);
        const doc = documentos.find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_3);
        const id = esPdfDelFileServer(doc?.GeneradoDocumento)
          ? idDocumentoSistema(doc.GeneradoDocumento)
          : '';
        if (id) {
          this.abrirPdfAnexo(
            item,
            id,
            'Anexo 3',
            'Términos de referencia',
            CARPETA_ANEXO_3,
            'No fue posible abrir el Anexo 3.'
          );
          return;
        }
        this.cargandoPdfId = '';
        this.abrirAnexo3(item.IdRequerimiento);
      },
      error: (err) => {
        this.cargandoPdfId = '';
        const detalle = err?.mensaje || err?.message || err?.statusText;
        this.funciones.mensaje('error',
          detalle
            ? `No fue posible consultar el documento del expediente: ${detalle}`
            : 'No fue posible consultar el documento del expediente.');
      }
    });
  }

  verAnexo5Pdf(item: RequerimientoBandeja): void {
    if (!item || this.cargandoPdfId) {
      return;
    }

    const idSesion = idDocumentoSistema(this.firmaDigitalPorTipo[TIPO_ANEXO_5] || '');
    if (idSesion) {
      this.abrirPdfAnexo(
        item,
        idSesion,
        'Anexo 5',
        'Propuesta del Área usuaria',
        CARPETA_ANEXO_5
      );
      return;
    }

    if (!item.IdExpediente) {
      this.funciones.mensaje('info',
        'El Anexo 5 aún no fue generado. Vuelva a guardar el requerimiento.');
      return;
    }

    this.cargandoPdfId = item.IdRequerimiento;
    this.requerimientoService.listarDocumento(item.IdExpediente).subscribe({
      next: (respuesta: any) => {
        if (respuesta?.estado !== 1) {
          this.cargandoPdfId = '';
          this.funciones.mensaje('error',
            respuesta?.mensaje || 'No fue posible consultar el documento del expediente.');
          return;
        }

        const documentos = this.documentosDeRespuesta(respuesta);
        const doc = documentos.find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_5);
        const id = esPdfDelFileServer(doc?.GeneradoDocumento)
          ? idDocumentoSistema(doc.GeneradoDocumento)
          : '';
        if (id) {
          item.DocumentoSistema = id;
          item.CodigoTipoDocumento = TIPO_ANEXO_5;
          this.abrirPdfAnexo(
            item,
            id,
            'Anexo 5',
            'Propuesta del Área usuaria',
            CARPETA_ANEXO_5
          );
          return;
        }
        this.cargandoPdfId = '';
        this.funciones.mensaje('info',
          'El Anexo 5 aún no fue generado. Vuelva a guardar el requerimiento o use «Firmar» para registrarlo.');
      },
      error: (err) => {
        this.cargandoPdfId = '';
        const detalle = err?.mensaje || err?.message || err?.statusText;
        this.funciones.mensaje('error',
          detalle
            ? `No fue posible consultar el documento del expediente: ${detalle}`
            : 'No fue posible consultar el documento del expediente.');
      }
    });
  }

  private idPdfAnexo5(item: RequerimientoBandeja): string {
    if (item.CodigoTipoDocumento && item.CodigoTipoDocumento !== TIPO_ANEXO_5) {
      return esPdfDelFileServer(item.DocumentoSistema)
        ? idDocumentoSistema(item.DocumentoSistema)
        : '';
    }
    return esPdfDelFileServer(item.DocumentoSistema)
      ? idDocumentoSistema(item.DocumentoSistema)
      : '';
  }

  private abrirPdfAnexo(
    item: RequerimientoBandeja,
    id: string,
    titulo: string,
    subtitulo: string,
    carpeta: string,
    mensajeError?: string
  ): void {
    if (this.debeInvocarFirmaDigital) {
      this.abrirPdfEnVisor(item, id, titulo, subtitulo, true, carpeta);
      return;
    }
    this.abrirPdfRegistrado(
      item,
      id,
      mensajeError || `No fue posible abrir el ${titulo}.`,
      carpeta
    );
  }

  private descargarPdfRequerimiento(id: string, carpeta: string) {
    return this.maestraService.descargarArchivoConFallback(id, carpeta, ['cmn']);
  }

  private abrirPdfRegistrado(
    item: RequerimientoBandeja,
    id: string,
    mensajeError = 'No fue posible abrir el Anexo 5.',
    carpeta = CARPETA_ANEXO_5
  ): void {
    this.cargandoPdfId = item.IdRequerimiento;
    this.descargarPdfRequerimiento(id, carpeta).subscribe({
      next: (blob: Blob) => {
        this.cargandoPdfId = '';
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.cargandoPdfId = '';
        this.funciones.mensaje('error', mensajeError);
      }
    });
  }

  private generarYRegistrarAnexo5(requerimiento: RequerimientoBandeja) {
    this.paso = 'Armando el Anexo 5…';
    return this.requerimientoService.obtenerRequerimiento(requerimiento.IdRequerimiento).pipe(
      switchMap((detalle: any) => {
        if (detalle?.estado !== 1) {
          return throwError(() => new Error(detalle?.mensaje || 'No fue posible leer el requerimiento.'));
        }
        const definicion = construirAnexo5(detalle);
        const nombre = nombreArchivoAnexo5(detalle);
        this.paso = 'Subiendo el Anexo 5…';
        return this.documentoService.generarYSubir(definicion, nombre, CARPETA_ANEXO_5).pipe(
          switchMap((archivo: any) => {
            const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
            if (archivo?.estado !== 1 || !documentoSistema) {
              return throwError(() => new Error(archivo?.mensaje || 'No se pudo subir el Anexo 5.'));
            }
            this.paso = 'Registrando el Anexo 5…';
            return this.requerimientoService.registrarDocumento(
              detalle.IdExpediente,
              TIPO_ANEXO_5,
              documentoSistema,
              archivo.documento_original,
              { Codigo: detalle.Codigo }
            ).pipe(
              map((alta: any) => ({ ...alta, GeneradoDocumento: documentoSistema }))
            );
          })
        );
      })
    );
  }

  /**
   * Toda acción pasa por confirmación, incluso las que no exigen comentario: son
   * cambios de estado con efectos fuera de la pantalla —firmas, remisiones a
   * otra unidad— y no deben depender de un clic accidental.
   */
  pedirConfirmacion(requerimiento: RequerimientoBandeja, transicion: TransicionRequerimiento): void {
    if (transicion.CodigoTransicion === 'REQ_CONFIRMAR_FILTROS') {
      this.modalSolicitarCcp.abrir(requerimiento);
      return;
    }

    if (transicion.CodigoTransicion === 'REQ_REGISTRAR_CCP') {
      this.modalCargarCcp.abrir(requerimiento);
      return;
    }

    if (transicion.CodigoTransicion === 'REQ_EMITIR_OS') {
      this.requerimientoService.obtenerRequerimiento(requerimiento.IdRequerimiento).subscribe({
        next: (detalle: any) => {
          const ccp = normalizarCcp(detalle);
          if (!ccpTieneDatos(ccp)) {
            this.funciones.mensaje(
              'info',
              'Primero registre la CCP en SCM (número, SIAF, montos y PDF). La CCP no se carga en SIGA; allí solo se emite la orden de servicio.'
            );
            this.modalCargarCcp.abrir(requerimiento, { completarCcp: detalle?.CodigoEstado === 'REQ_CCP_CARGADA' });
            return;
          }
          this.modalOrdenServicio.abrir(requerimiento, ccp);
        },
        error: () => {
          this.funciones.mensaje('error', 'No fue posible verificar la CCP del expediente.');
        }
      });
      return;
    }

    this.cerrarPopupFirma();
    this.limpiarEstadoFirma();
    this.cerrarVisorPdf();
    this.documentoPendienteFirma = null;
    this.secuenciaPendienteFirma = [];
    this.accionEnCurso = { requerimiento, transicion };
    this.comentario = '';
    this.paso = '';

    if (transicion.RequiereFirma) {
      this.prepararDocumentoParaFirmar();
    }
  }

  cancelarAccion(): void {
    this.cerrarPopupFirma();
    this.limpiarEstadoFirma();
    this.cerrarVisorPdf();
    this.documentoPendienteFirma = null;
    this.secuenciaPendienteFirma = [];
    this.accionEnCurso = null;
    this.comentario = '';
    this.paso = '';
    this.ejecutando = false;
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

    if (transicion.CodigoTransicion === 'REQ_ENVIAR_FILTROS_COORD'
      || transicion.CodigoTransicion === 'REQ_ENVIAR_FILTROS_JEFE') {
      this.paso = 'Validando filtros de idoneidad…';
      this.requerimientoService.obtenerRequerimiento(requerimiento.IdRequerimiento).pipe(
        switchMap((detalle: any) => {
          const version = detalle?.Version ?? requerimiento.Version;
          return this.requerimientoService.derivarFiltrosIdoneidad(
            requerimiento.IdRequerimiento,
            version,
            transicion.CodigoTransicion
          );
        })
      ).subscribe({
        next: (respuesta: any) => this.terminarAccion(respuesta, transicion),
        error: (err) => this.fallar(
          err?.mensaje
            || err?.error?.mensaje
            || 'No fue posible derivar los filtros de idoneidad.'
        )
      });
      return;
    }

    if (transicion.CodigoTransicion === 'REQ_NOTIFICAR_OS') {
      this.paso = 'Enviando la notificación…';
      this.requerimientoService.notificarOrdenServicio(
        requerimiento.IdRequerimiento, requerimiento.Version
      ).subscribe({
        next: (respuesta: any) => this.terminarAccion(respuesta, transicion),
        error: () => this.fallar('No fue posible notificar la orden de servicio.')
      });
      return;
    }

    /* Firmar: primero paFirmarDocumento (deja la versión vigente en FIRMADO) y
       recién entonces la transición. El PDF se abre al pedir confirmación, igual
       que en CMN, para que el usuario vea y firme digitalmente antes de Confirmar. */
    if (transicion.RequiereFirma) {
      this.paso = 'Registrando la firma…';
      this.resolverYFirmar(requerimiento, transicion);
      return;
    }

    this.enviarTransicion(requerimiento, transicion);
  }

  /**
   * Qué documentos se firman en este módulo.
   *
   * El mapa DOCUMENTO_TECNICO incluye EETT (Anexo 1) para bienes, pero la
   * pantalla de locación registra Anexo 5 y Anexo 3. Si el expediente ya tiene
   * esos tipos —o el objeto es locación—, se firman esos y no se exige EETT.
   */
  private secuenciaAFirmar(requerimiento: RequerimientoBandeja, registrados: any[]):
      { codigo: string; etiqueta: string; anexo: string }[] {
    const locacion = DOCUMENTO_TECNICO.LOCACION;
    const tieneLocacion = registrados.some((d: any) =>
      d.CodigoTipoDocumento === TIPO_ANEXO_5 || d.CodigoTipoDocumento === TIPO_ANEXO_3);

    if (requerimiento.CodigoTipoContratacion === 'LOCACION' || tieneLocacion) {
      return locacion;
    }

    const deTipo = DOCUMENTO_TECNICO[requerimiento.CodigoTipoContratacion] || [];
    if (deTipo.some(d => d.codigo === 'REQ_EETT_BIEN')) {
      return locacion;
    }
    return deTipo;
  }

  /**
   * Al abrir el panel de firma: localiza los PDF pendientes (Anexo 5 y Anexo 3
   * en locación), muestra el primero en el visor y ofrece el firmador digital.
   */
  private prepararDocumentoParaFirmar(): void {
    const accion = this.accionEnCurso;
    if (!accion) {
      return;
    }

    const { requerimiento, transicion } = accion;
    this.paso = 'Buscando el documento a firmar…';

    this.requerimientoService.listarDocumento(requerimiento.IdExpediente).subscribe({
      next: (respuesta: any) => {
        const registrados = this.documentosDeRespuesta(respuesta);
        const pendientes = this.pendientesDeFirma(requerimiento, transicion, registrados);

        if (pendientes.length === 0) {
          this.paso = '';
          this.documentoPendienteFirma = null;
          this.secuenciaPendienteFirma = [];
          return;
        }

        const faltaAnexo3 = pendientes.find(p => p.codigo === TIPO_ANEXO_3)
          && !registrados.some((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_3);
        if (faltaAnexo3) {
          this.paso = '';
          this.funciones.mensaje('info',
            'Falta grabar el TDR (Anexo 3) antes de firmarlo. Complete el formulario y pulse Grabar.');
          this.cancelarAccion();
          this.abrirAnexo3(requerimiento.IdRequerimiento);
          return;
        }

        this.secuenciaPendienteFirma = pendientes;
        this.abrirPendienteParaFirma(requerimiento, pendientes[0], registrados);
      },
      error: () => {
        this.paso = '';
        this.funciones.mensaje('error', 'No fue posible consultar los documentos del expediente.');
      }
    });
  }

  /** Documentos que este rol aún debe firmar en esta acción. */
  private pendientesDeFirma(
    requerimiento: RequerimientoBandeja,
    transicion: TransicionRequerimiento,
    registrados: any[]
  ): { codigo: string; etiqueta: string; anexo: string }[] {
    if (transicion.DocumentoRequerido) {
      const doc = registrados.find((d: any) => d.CodigoTipoDocumento === transicion.DocumentoRequerido);
      if (doc && this.rolYaFirmoDocumento(doc)) {
        return [];
      }
      return [{
        codigo: transicion.DocumentoRequerido,
        etiqueta: transicion.DocumentoRequerido === TIPO_ANEXO_3
          ? 'TDR'
          : 'Propuesta del Área usuaria',
        anexo: transicion.DocumentoRequerido === TIPO_ANEXO_3 ? 'Anexo 3' : 'Anexo 5'
      }];
    }

    return this.secuenciaAFirmar(requerimiento, registrados).filter(item => {
      const doc = registrados.find((d: any) => d.CodigoTipoDocumento === item.codigo);
      if (!doc) {
        return true;
      }
      return !this.rolYaFirmoDocumento(doc);
    });
  }

  /** paListarDocumento marca si el rol de la sesión ya dejó su firma. */
  private rolYaFirmoDocumento(doc: any): boolean {
    if (doc?.EsteRolYaFirmo === true || doc?.EsteRolYaFirmo === 1) {
      return true;
    }
    return doc?.Estado === 'FIRMADO';
  }

  private abrirPendienteParaFirma(
    requerimiento: RequerimientoBandeja,
    esperado: { codigo: string; etiqueta: string; anexo: string },
    registrados: any[]
  ): void {
    this.documentoPendienteFirma = esperado;
    this.nombreDocumentoFirmado = this.firmaDigitalPorTipo[esperado.codigo] || '';
    const doc = registrados.find((d: any) => d.CodigoTipoDocumento === esperado.codigo);
    const pdfListo = esPdfDelFileServer(doc?.GeneradoDocumento);

    if (esperado.codigo === TIPO_ANEXO_5 && !pdfListo) {
      this.generarYRegistrarAnexo5(requerimiento).subscribe({
        next: (alta: any) => {
          if (alta?.estado !== 1) {
            this.paso = '';
            this.funciones.mensaje('error', alta?.mensaje || 'No fue posible registrar el Anexo 5.');
            return;
          }
          const id = idDocumentoSistema(alta?.GeneradoDocumento)
            || idDocumentoSistema(requerimiento.DocumentoSistema);
          this.paso = '';
          if (id) {
            requerimiento.DocumentoSistema = id;
            requerimiento.CodigoTipoDocumento = TIPO_ANEXO_5;
            this.abrirPdfEnVisor(requerimiento, id, esperado.anexo, esperado.etiqueta, true, CARPETA_ANEXO_5);
            return;
          }
          this.requerimientoService.listarDocumento(requerimiento.IdExpediente).subscribe({
            next: (otra: any) => {
              const regenerado = this.documentosDeRespuesta(otra)
                .find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_5);
              const idNuevo = idDocumentoSistema(regenerado?.GeneradoDocumento);
              if (idNuevo) {
                this.abrirPdfEnVisor(requerimiento, idNuevo, esperado.anexo, esperado.etiqueta, true, CARPETA_ANEXO_5);
                return;
              }
              this.funciones.mensaje('info', 'El Anexo 5 quedó registrado. Ábralo con «Ver PDF» para firmarlo digitalmente.');
            },
            error: () => this.funciones.mensaje('info', 'El Anexo 5 quedó registrado. Ábralo con «Ver PDF» para firmarlo digitalmente.')
          });
        },
        error: (err) => {
          this.paso = '';
          this.funciones.mensaje('error', err?.message || 'No fue posible registrar el Anexo 5.');
        }
      });
      return;
    }

    if (!doc) {
      this.paso = '';
      if (esperado.codigo === TIPO_ANEXO_3) {
        this.funciones.mensaje('info',
          'Falta grabar el TDR (Anexo 3) antes de firmarlo. Complete el formulario y pulse Grabar.');
        this.cancelarAccion();
        this.abrirAnexo3(requerimiento.IdRequerimiento);
        return;
      }
      this.funciones.mensaje('error',
        `Falta registrar el ${esperado.etiqueta} (${esperado.anexo}) antes de firmarlo.`);
      return;
    }

    const id = idDocumentoSistema(doc.GeneradoDocumento);
    this.paso = '';
    if (!id || !esPdfDelFileServer(doc.GeneradoDocumento)) {
      this.funciones.mensaje('info',
        `El ${esperado.anexo} no tiene un PDF en el servidor. Vuelva a grabar el requerimiento.`);
      return;
    }
    const carpetaPendiente = esperado.codigo === TIPO_ANEXO_3 ? CARPETA_ANEXO_3 : CARPETA_ANEXO_5;
    this.abrirPdfEnVisor(requerimiento, id, esperado.anexo, esperado.etiqueta, true, carpetaPendiente);
  }

  get debeInvocarFirmaDigital(): boolean {
    return !!this.accionEnCurso?.transicion.RequiereFirma;
  }

  get etiquetaDocumentoFirma(): string {
    if (this.secuenciaPendienteFirma.length > 1) {
      return this.secuenciaPendienteFirma
        .map(d => `${d.etiqueta} (${d.anexo})`)
        .join(' y ');
    }
    const doc = this.documentoPendienteFirma;
    if (!doc) {
      return 'documento técnico';
    }
    return `${doc.etiqueta} (${doc.anexo})`;
  }

  firmaDigitalDe(codigoTipo: string): string {
    return this.firmaDigitalPorTipo[codigoTipo] || '';
  }

  get todasFirmasDigitalesListas(): boolean {
    if (this.secuenciaPendienteFirma.length === 0) {
      return !!this.nombreDocumentoFirmado;
    }
    return this.secuenciaPendienteFirma.every(d => !!this.firmaDigitalPorTipo[d.codigo]);
  }

  abrirDocumentoSecuenciaFirma(item: { codigo: string; etiqueta: string; anexo: string }): void {
    const accion = this.accionEnCurso;
    if (!accion) {
      return;
    }
    this.documentoPendienteFirma = item;
    this.nombreDocumentoFirmado = this.firmaDigitalPorTipo[item.codigo] || '';
    if (item.codigo === TIPO_ANEXO_3) {
      this.verAnexo3Pdf(accion.requerimiento);
      return;
    }
    this.verAnexo5Pdf(accion.requerimiento);
  }

  verPdfDelPendiente(): void {
    const accion = this.accionEnCurso;
    const pendiente = this.documentoPendienteFirma;
    if (!accion || !pendiente) {
      return;
    }
    this.abrirDocumentoSecuenciaFirma(pendiente);
  }

  /**
   * Resuelve qué documentos se firman y los firma en orden (Anexo 5, luego Anexo 3).
   *
   * Siempre vuelve a listar: si solo se usara la secuencia del modal, bastaba
   * firmar el Anexo 5 y el 3 llegaba al Coordinador AU sin la firma del
   * Especialista.
   */
  private resolverYFirmar(requerimiento: RequerimientoBandeja,
                          transicion: TransicionRequerimiento): void {
    if (transicion.DocumentoRequerido) {
      this.firmarDocumentosEnCadena(
        requerimiento,
        transicion,
        [{
          codigo: transicion.DocumentoRequerido,
          etiqueta: transicion.DocumentoRequerido === TIPO_ANEXO_3 ? 'TDR' : 'Propuesta del Área usuaria',
          anexo: transicion.DocumentoRequerido === TIPO_ANEXO_3 ? 'Anexo 3' : 'Anexo 5'
        }],
        0
      );
      return;
    }

    this.requerimientoService.listarDocumento(requerimiento.IdExpediente).subscribe({
      next: (respuesta: any) => {
        const registrados = this.documentosDeRespuesta(respuesta);
        const secuencia = this.secuenciaAFirmar(requerimiento, registrados);

        if (secuencia.some(s => s.codigo === TIPO_ANEXO_3)
          && !registrados.some((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_3)) {
          this.fallar(
            'Falta grabar el TDR (Anexo 3) antes de firmarlo. Complete el formulario y pulse Grabar.');
          this.cancelarAccion();
          this.abrirAnexo3(requerimiento.IdRequerimiento);
          return;
        }

        const pendientes = this.pendientesDeFirma(requerimiento, transicion, registrados);
        this.secuenciaPendienteFirma = pendientes.length > 0
          ? pendientes
          : this.secuenciaPendienteFirma;

        if (pendientes.length === 0) {
          this.enviarTransicion(requerimiento, transicion);
          return;
        }

        this.documentoPendienteFirma = pendientes[0];
        const primero = pendientes[0];
        const docPendiente = registrados.find(d => d.CodigoTipoDocumento === primero.codigo);
        const pdfListo = esPdfDelFileServer(docPendiente?.GeneradoDocumento);

        if (primero.codigo === TIPO_ANEXO_5 && !pdfListo) {
          this.generarYRegistrarAnexo5(requerimiento).subscribe({
            next: (alta: any) => {
              if (alta?.estado !== 1) {
                this.fallar(alta?.mensaje || 'No fue posible registrar el Anexo 5.');
                return;
              }
              this.paso = 'Firmando el Anexo 5…';
              this.firmarDocumentosEnCadena(requerimiento, transicion, pendientes, 0);
            },
            error: (err) => this.fallar(err?.message || 'No fue posible registrar el Anexo 5.')
          });
          return;
        }

        if (!docPendiente) {
          this.fallar(`Falta registrar el ${primero.etiqueta} (${primero.anexo}) antes de firmarlo.`);
          return;
        }

        this.firmarDocumentosEnCadena(requerimiento, transicion, pendientes, 0);
      },
      error: () => this.fallar('No fue posible consultar los documentos del expediente.')
    });
  }

  /**
   * Firma cada documento pendiente (Anexo 5, luego Anexo 3) y al terminar mueve el expediente.
   */
  private firmarDocumentosEnCadena(
    requerimiento: RequerimientoBandeja,
    transicion: TransicionRequerimiento,
    pendientes: { codigo: string; etiqueta: string; anexo: string }[],
    indice: number
  ): void {
    if (indice >= pendientes.length) {
      this.verificarFirmasDelRolYTransicionar(requerimiento, transicion);
      return;
    }

    const item = pendientes[indice];
    this.documentoPendienteFirma = item;
    const firmado = idDocumentoSistema(this.firmaDigitalPorTipo[item.codigo] || '');
    this.paso = firmado
      ? `Registrando la firma digital del ${item.anexo}…`
      : `Registrando la firma del ${item.anexo}…`;

    this.requerimientoService.firmarDocumento(
      requerimiento.IdExpediente,
      item.codigo,
      firmado ? { GeneradoDocumento: firmado } : {}
    ).subscribe({
      next: (respuesta: any) => {
        const yaFirmado = respuesta?.codigo === 51616;

        if (respuesta?.estado !== 1 && !yaFirmado) {
          this.fallar(respuesta?.mensaje || `No fue posible registrar la firma del ${item.anexo}.`);
          return;
        }

        if (firmado && item.codigo === TIPO_ANEXO_5) {
          requerimiento.DocumentoSistema = firmado;
        }

        this.firmarDocumentosEnCadena(requerimiento, transicion, pendientes, indice + 1);
      },
      error: () => this.fallar(`No fue posible registrar la firma del ${item.anexo}.`)
    });
  }

  /**
   * No mueve el expediente si al Especialista le falta firmar Anexo 5 o Anexo 3.
   * Evita que el Coordinador AU reciba el TDR sin la firma del Especialista.
   */
  private verificarFirmasDelRolYTransicionar(
    requerimiento: RequerimientoBandeja,
    transicion: TransicionRequerimiento
  ): void {
    this.paso = 'Comprobando firmas del expediente…';
    this.requerimientoService.listarDocumento(requerimiento.IdExpediente).subscribe({
      next: (respuesta: any) => {
        const registrados = this.documentosDeRespuesta(respuesta);
        const pendientes = this.pendientesDeFirma(requerimiento, transicion, registrados);
        if (pendientes.length > 0) {
          this.secuenciaPendienteFirma = pendientes;
          this.documentoPendienteFirma = pendientes[0];
          this.fallar(
            `Falta registrar la firma de: ${pendientes.map(p => p.anexo).join(', ')}. `
            + 'Ábralo, fírmelo digitalmente si corresponde y vuelva a confirmar.'
          );
          return;
        }
        this.enviarTransicion(requerimiento, transicion);
      },
      error: () => this.fallar('No fue posible comprobar las firmas del expediente.')
    });
  }

  /**
   * Firma un solo documento y mueve el expediente (atajo cuando hay DocumentoRequerido).
   *
   * Si sfirma devolvió un PDF nuevo, se envía como GeneradoDocumento para que
   * reemplace al archivo sin firma en DocumentoVersion (bandeja, visor, etc.).
   */
  private firmarYEjecutar(requerimiento: RequerimientoBandeja,
                          transicion: TransicionRequerimiento,
                          codigoTipoDocumento: string): void {
    this.firmarDocumentosEnCadena(
      requerimiento,
      transicion,
      [{
        codigo: codigoTipoDocumento,
        etiqueta: codigoTipoDocumento === TIPO_ANEXO_3 ? 'TDR' : 'Propuesta del Área usuaria',
        anexo: codigoTipoDocumento === TIPO_ANEXO_3 ? 'Anexo 3' : 'Anexo 5'
      }],
      0
    );
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
      next: (respuesta: any) => this.terminarAccion(respuesta, transicion),
      error: () => this.fallar('No fue posible comunicarse con el servicio.')
    });
  }

  private terminarAccion(respuesta: any, _transicion?: TransicionRequerimiento): void {
    this.ejecutando = false;
    this.paso = '';

    if (respuesta?.estado !== 1) {
      const mensaje = respuesta?.mensaje || 'No fue posible ejecutar la acción.';
      if (/CONFLICTO_VERSION|CONFLICTO_TRANSICION/i.test(mensaje)) {
        this.cargarBandeja();
      }
      this.funciones.mensaje('error', mensaje);
      return;
    }

    const idParaEditar =
      _transicion?.CodigoTransicion === 'REQ_SUBSANAR'
        ? this.accionEnCurso?.requerimiento.IdRequerimiento
        : null;

    this.cerrarPopupFirma();
    this.limpiarEstadoFirma();
    this.cerrarVisorPdf();
    this.documentoPendienteFirma = null;
    this.accionEnCurso = null;
    this.comentario = '';
    this.funciones.mensaje('success', respuesta.mensaje || 'Se registró la acción.');
    this.cargarBandeja();

    if (idParaEditar) {
      this.editarRequerimiento({ IdRequerimiento: idParaEditar } as RequerimientoBandeja);
    }
  }

  private fallar(mensaje: string): void {
    this.ejecutando = false;
    this.paso = '';
    this.funciones.mensaje('error', mensaje);
  }

  private abrirPdfEnVisor(
    item: RequerimientoBandeja,
    id: string,
    titulo: string,
    subtitulo: string,
    invocarFirma: boolean,
    carpeta = CARPETA_ANEXO_5
  ): void {
    this.documentoSistemaParaFirmar = id;
    this.cargandoPdf = true;
    this.cargandoPdfId = item.IdRequerimiento;
    this.descargarPdfRequerimiento(id, carpeta).subscribe({
      next: (blob: Blob) => {
        this.cargandoPdf = false;
        this.cargandoPdfId = '';
        this.abrirVisorPdfBlob(item, this.blobParaVisor(blob, id), titulo, subtitulo);
        const yaFirmadoEnSesion = !!this.firmaDigitalPorTipo[
          carpeta === CARPETA_ANEXO_3 ? TIPO_ANEXO_3 : TIPO_ANEXO_5
        ];
        if (invocarFirma && this.debeInvocarFirmaDigital && !yaFirmadoEnSesion) {
          this.abrirFirmaPopup(id, item.Codigo);
        }
      },
      error: () => {
        this.cargandoPdf = false;
        this.cargandoPdfId = '';
        this.funciones.mensaje('error', `No fue posible abrir el ${titulo}.`);
      }
    });
  }

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

  private abrirVisorPdfBlob(
    item: RequerimientoBandeja,
    blob: Blob,
    titulo: string,
    subtitulo: string
  ): void {
    this.cerrarVisorPdf();
    this.visorPdfCodigo = item.Codigo;
    this.visorPdfTitulo = titulo;
    this.visorPdfSubtitulo = subtitulo;
    this.visorPdfObjectUrl = URL.createObjectURL(blob);
    this.visorPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorPdfObjectUrl);
  }

  imprimirPdfVisor(): void {
    const marco = document.getElementById('marcoAnexoPdfReq') as HTMLIFrameElement | null;
    marco?.contentWindow?.focus();
    marco?.contentWindow?.print();
  }

  firmarDigitalDesdeVisor(): void {
    const requerimiento = this.accionEnCurso?.requerimiento;
    if (!requerimiento) {
      return;
    }

    const archivo = idDocumentoSistema(this.documentoSistemaParaFirmar);
    if (!archivo) {
      this.funciones.mensaje('info', 'No hay archivo para firmar digitalmente. Abra el PDF primero.');
      return;
    }

    const descripcion = this.documentoPendienteFirma
      ? `${requerimiento.Codigo} · ${this.documentoPendienteFirma.anexo}`
      : requerimiento.Codigo;
    this.abrirFirmaPopup(archivo, descripcion);
  }

  urlDocumentoFirmado(): string {
    const id = this.nombreDocumentoFirmado
      || (this.documentoPendienteFirma
        ? this.firmaDigitalPorTipo[this.documentoPendienteFirma.codigo]
        : '');
    if (!id) {
      return '';
    }
    const carpeta = this.documentoPendienteFirma?.codigo === TIPO_ANEXO_3
      ? CARPETA_ANEXO_3
      : CARPETA_ANEXO_5;
    return this.maestraService.urlDescarga(id, carpeta);
  }

  cerrarVisorPdf(): void {
    if (this.visorPdfObjectUrl) {
      URL.revokeObjectURL(this.visorPdfObjectUrl);
    }
    this.visorPdfObjectUrl = '';
    this.visorPdfUrl = null;
    this.visorPdfCodigo = '';
    this.visorPdfTitulo = 'Anexo';
    this.visorPdfSubtitulo = '';
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

    if (origenEvento !== origenFirma && origenEvento !== origenApp) {
      return;
    }

    const rpta = this.leerRespuestaFirma(event.data);
    if (!rpta) {
      return;
    }

    if (rpta.estado == 1) {
      const idFirmado = idDocumentoSistema(rpta.documento_sistema) || String(rpta.documento_sistema || '');
      if (!idFirmado) {
        this.funciones.mensaje('error', 'sfirma no devolvió el identificador del PDF firmado.');
        return;
      }
      this.cerrarPopupFirma();
      this.alCompletarFirmaDigital(idFirmado);
      return;
    }

    this.funciones.mensaje('info', 'Proceso de firma digital cancelado.');
  }

  /**
   * Persiste de inmediato el PDF firmado en DocumentoVersion (GeneradoDocumento)
   * y avanza al siguiente anexo pendiente (Anexo 5 → Anexo 3).
   */
  private alCompletarFirmaDigital(idFirmado: string): void {
    const pendiente = this.documentoPendienteFirma;
    const accion = this.accionEnCurso;
    if (!pendiente || !accion) {
      this.nombreDocumentoFirmado = idFirmado;
      this.mostrarPdfFirmado(idFirmado);
      return;
    }

    this.nombreDocumentoFirmado = idFirmado;
    this.firmaDigitalPorTipo[pendiente.codigo] = idFirmado;
    this.documentoSistemaParaFirmar = idFirmado;

    this.paso = `Registrando el ${pendiente.anexo} firmado…`;
    this.requerimientoService.firmarDocumento(
      accion.requerimiento.IdExpediente,
      pendiente.codigo,
      { GeneradoDocumento: idFirmado }
    ).subscribe({
      next: (respuesta: any) => {
        this.paso = '';
        const ok = respuesta?.estado === 1 || respuesta?.codigo === 51616;
        if (!ok) {
          this.funciones.mensaje(
            'info',
            respuesta?.mensaje
              || `El PDF firmado del ${pendiente.anexo} quedó en el servidor, pero no se registró en el expediente. Confirme la acción para reintentar.`
          );
          this.continuarTrasFirmaDigital(idFirmado);
          return;
        }

        if (pendiente.codigo === TIPO_ANEXO_5) {
          accion.requerimiento.DocumentoSistema = idFirmado;
        }

        this.continuarTrasFirmaDigital(idFirmado);
      },
      error: () => {
        this.paso = '';
        this.funciones.mensaje(
          'info',
          `El PDF firmado del ${pendiente.anexo} quedó en el servidor, pero no se registró en el expediente. Confirme la acción para reintentar.`
        );
        this.continuarTrasFirmaDigital(idFirmado);
      }
    });
  }

  private continuarTrasFirmaDigital(idFirmado: string): void {
    const siguiente = this.secuenciaPendienteFirma.find(d => !this.firmaDigitalPorTipo[d.codigo]);
    if (siguiente && this.accionEnCurso) {
      this.funciones.mensaje(
        'success',
        `Se registró la firma digital del ${this.documentoPendienteFirma?.anexo || 'documento'}. Continúe con el ${siguiente.anexo}.`
      );
      this.abrirDocumentoSecuenciaFirma(siguiente);
      return;
    }

    this.funciones.mensaje(
      'success',
      'Firma digital completada en los anexos pendientes. Confirme la acción para continuar el flujo.'
    );
    this.mostrarPdfFirmado(idFirmado);
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
    const requerimiento = this.accionEnCurso?.requerimiento;
    if (!requerimiento) {
      return;
    }

    const id = idDocumentoSistema(documentoSistema);
    if (!id) {
      return;
    }

    const carpeta = this.documentoPendienteFirma?.codigo === TIPO_ANEXO_3
      ? CARPETA_ANEXO_3
      : CARPETA_ANEXO_5;

    this.descargarPdfRequerimiento(id, carpeta).subscribe({
      next: (blob: Blob) => {
        this.documentoSistemaParaFirmar = id;
        this.abrirVisorPdfBlob(
          requerimiento,
          this.blobParaVisor(blob, id),
          this.documentoPendienteFirma?.anexo || 'Anexo',
          'Documento firmado digitalmente'
        );
      },
      error: () => {
        this.funciones.mensaje(
          'error',
          `La firma quedó registrada, pero no fue posible abrir el PDF firmado (${id}).`
        );
      }
    });
  }

  /**
   * Carpeta que usa sfirma para Anexo 5/3. config.json trae DESARROLLO/cmn (CMN);
   * los PDF de requerimiento viven en DESARROLLO/requerimiento (misma base, otra subcarpeta).
   */
  private carpetaFirmaRequerimiento(): string {
    const configurada = String(ConfigService.settings?.firma?.ruta_carpeta || 'DESARROLLO/cmn')
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    const partes = configurada.split('/').filter(Boolean);
    if (partes.length >= 2) {
      partes[partes.length - 1] = CARPETA_ANEXO_5;
      return partes.join('/');
    }
    return partes.length === 1 && partes[0] === 'cmn'
      ? CARPETA_ANEXO_5
      : `${configurada}/${CARPETA_ANEXO_5}`.replace(/^\/+/, '');
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

    /* Cerrar el popup anterior: si se reutiliza el de Anexo 5 al pasar al 3,
       sfirma sigue firmando el archivo viejo y el PDF firmado no queda ligado. */
    if (this.popupFirma && !this.popupFirma.closed) {
      this.cerrarPopupFirma();
    }

    this.documentoSistemaParaFirmar = documentoSistema;
    this.nombreDocumentoFirmado = this.documentoPendienteFirma
      ? (this.firmaDigitalPorTipo[this.documentoPendienteFirma.codigo] || '')
      : '';

    const origenApp = window.location.origin.replace(/\/+$/, '');
    const rutaRespuesta =
      (firma.ruta_respuesta || `${origenApp}/assets/formats/doc_firmado.html?firmado=&strdoc=`)
      + documentoSistema;
    const carpetaFirma = this.carpetaFirmaRequerimiento();
    const baseArchivo = String(firma.ruta_archivo).replace(/\/+$/, '') + '/';
    const rutaArchivo = baseArchivo + carpetaFirma + '/' + documentoSistema;

    const urlFirma =
      firma.ruta_iframe +
      '?v=1.' +
      String(new Date().getTime()) +
      '&strcarpeta=' +
      encodeURIComponent(carpetaFirma) +
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

    this.funciones.mensaje('info', this.guiaColocacionFirmaDigital());
    this.iniciarMonitoreoPopup();
  }

  /**
   * sfirma/ONPE no acepta coordenadas por URL: el sello se coloca a mano.
   * Si cae sobre otra firma ya existente, ONPE responde con error de superposición.
   */
  private guiaColocacionFirmaDigital(): string {
    const dondePorRol: { [rol: string]: string } = {
      AREA_ESPECIALISTA: 'el espacio de la IZQUIERDA (1. Especialista AU)',
      AREA_JEFE: 'el espacio de la DERECHA (2. Jefe AU)',
      ABAST_ESPECIALISTA: 'un espacio libre para Especialista de Abastecimiento',
      ABAST_COORDINADOR: 'un espacio libre para Coordinador de Abastecimiento',
      ABAST_JEFE: 'un espacio libre para Jefe de Abastecimiento'
    };
    const donde = dondePorRol[this.codigoRol] || 'un espacio libre del documento';
    return `Coloque la representación gráfica en ${donde}, sin superponerla a otra firma. `
      + 'Si ONPE indica superposición, mueva el sello a otra zona y confirme de nuevo.';
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
    this.firmaDigitalPorTipo = {};
    this.secuenciaPendienteFirma = [];
  }

  /** Tras registrar la CCP, abre el asistente de generación de la orden de servicio. */
  abrirAsistenteOrden(evento: { fila: RequerimientoBandeja; ccp: Record<string, unknown> }): void {
    this.modalOrdenServicio.abrir(evento.fila, evento.ccp);
  }

  completarCcpDesdeOrden(fila: RequerimientoBandeja): void {
    this.modalCargarCcp.abrir(fila, { completarCcp: true });
  }

  /** El registro y las acciones cambian la bandeja: se recarga entera. */
  alRegistrar(): void {
    this.cargarBandeja();
  }

  /**
   * Tras guardar Anexo 5 y Anexo 3: pasa a documento pendiente (si aplica) y
   * abre el flujo «Firmar anexos» (firma digital de Anexo 5 y Anexo 3).
   */
  iniciarFirmaAnexos(payload: { IdRequerimiento: string; IdExpediente: string; Version: number }): void {
    this.requerimientoService.listarTransicionDisponible(payload.IdExpediente).subscribe({
      next: (respuesta: any) => {
        const transiciones: TransicionRequerimiento[] = respuesta?.Transiciones
          || respuesta?.transiciones
          || [];

        const elaborar = transiciones.find(t => t.CodigoTransicion === 'REQ_ELABORAR_DOC');
        const firmar = transiciones.find(t => t.CodigoTransicion === 'REQ_DERIVAR_COORD');

        const continuarConFirma = (version: number) => {
          this.requerimientoService.listarRequerimiento(this.filtro).subscribe({
            next: (bandeja: any) => {
              const fila = (bandeja?.Requerimientos || bandeja?.requerimientos || [])
                .find((r: RequerimientoBandeja) => r.IdRequerimiento === payload.IdRequerimiento);
              if (!fila) {
                this.cargarBandeja();
                this.funciones.mensaje('info',
                  'Los anexos quedaron guardados. Use «Firmar anexos» en la bandeja cuando el expediente aparezca.');
                return;
              }
              const transicionFirma = this.transicionesDeFila(fila)
                .find(t => t.CodigoTransicion === 'REQ_DERIVAR_COORD') || firmar;
              if (!transicionFirma) {
                this.cargarBandeja();
                this.funciones.mensaje('info',
                  'Los anexos quedaron guardados. La acción «Firmar anexos» no está disponible en este momento.');
                return;
              }
              this.requerimientos = bandeja?.Requerimientos || bandeja?.requerimientos || [];
              this.total = bandeja?.Total ?? bandeja?.total ?? this.requerimientos.length;
              this.pedirConfirmacion({ ...fila, Version: version }, transicionFirma);
            },
            error: () => {
              this.cargarBandeja();
              this.funciones.mensaje('info',
                'Los anexos quedaron guardados. Use «Firmar anexos» en la bandeja.');
            }
          });
        };

        if (elaborar) {
          this.requerimientoService.ejecutarTransicion(
            payload.IdExpediente,
            'REQ_ELABORAR_DOC',
            payload.Version
          ).subscribe({
            next: (resp: any) => {
              if (resp?.estado !== 1) {
                this.funciones.mensaje('error', resp?.mensaje || 'No fue posible avanzar el expediente.');
                this.cargarBandeja();
                return;
              }
              continuarConFirma(resp.Version ?? payload.Version + 1);
            },
            error: () => {
              this.funciones.mensaje('error', 'No fue posible avanzar el expediente al documento técnico.');
              this.cargarBandeja();
            }
          });
          return;
        }

        if (firmar) {
          continuarConFirma(payload.Version);
          return;
        }

        this.cargarBandeja();
        this.funciones.mensaje('info',
          'Los anexos quedaron guardados. Use «Firmar anexos» en la bandeja cuando corresponda.');
      },
      error: () => {
        this.cargarBandeja();
        this.funciones.mensaje('info',
          'Los anexos quedaron guardados. Use «Firmar anexos» en la bandeja.');
      }
    });
  }
}
