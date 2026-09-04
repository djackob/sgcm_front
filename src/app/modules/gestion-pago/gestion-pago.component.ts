import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PagoService } from './services/pago.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentoService } from '../../core/services/documento.service';
import { FirmaDigitalService } from '../../core/services/firma-digital.service';
import { MaestraService } from '../../shared/services/maestra.service';
import { Funciones } from '../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../shared/funciones/archivo';
import {
  CARPETA_PAGO,
  ChecklistPago,
  ExpedientePagoBandeja,
  ExpedientePagoDetalle,
  OrdenPortalLocador,
  OrdenServicioSiga,
  TIPO_ANEXO_11,
  TIPO_CONSTANCIA,
  TIPO_INFORME,
  TIPO_NOTA_PAGO,
  TIPO_PAPELETA,
  TIPO_RHE_PDF,
  TIPO_RHE_XML,
  TIPO_SUSP_4TA,
  TransicionPago
} from './models/pago.model';
import { construirAnexo11, nombreArchivoAnexo11 } from './documentos/anexo11.pdfmake';
import { TIPO_ANEXO_9, construirAnexo9, nombreArchivoAnexo9 } from './documentos/anexo9.pdfmake';
import { TIPO_ANEXO_10, construirAnexo10, nombreArchivoAnexo10 } from './documentos/anexo10.pdfmake';

@Component({
  selector: 'app-gestion-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './gestion-pago.component.html',
  styleUrl: './gestion-pago.component.scss'
})
export class GestionPagoComponent implements OnInit {

  breadcrumb = ['Administración', 'Entregables y pagos'];
  codigoRol = '';
  esLocador = false;

  /* SoloMiBandeja acota a la UNIDAD del actor, no a su rol: la bandeja muestra
     todo lo de la oficina y marca con `MeToca` lo que le toca a este perfil, que
     la base devuelve ordenado primero. Ya no es un check de la pantalla —el
     mismo criterio que se aplicó en la bandeja de CMN—, y por eso queda fijo. */
  filtro = { SoloMiBandeja: true, Texto: '', Limite: 50, Desplazamiento: 0 };
  cargando = false;
  total = 0;
  expedientes: ExpedientePagoBandeja[] = [];
  ordenes: OrdenPortalLocador[] = [];

  seleccionado: ExpedientePagoDetalle | null = null;
  /** Lo que SIGA dice de la O/S del expediente abierto. Null si no se pudo leer. */
  ordenSiga: OrdenServicioSiga | null = null;

  /* Anexo 11: el PDF vive en el file server, no en memoria. `documentoAnexo11`
     es el id del generado y `anexo11Firmado` el del que devolvió el firmador,
     que es OTRO archivo. El visor muestra siempre el más reciente de los dos. */
  documentoAnexo11 = '';
  anexo11Firmado = '';
  /** Documentos del expediente, para poder abrirlos desde el detalle. */
  documentosExpediente: any[] = [];

  /* Trazabilidad, igual que el detalle del CMN: quién movió el expediente, a
     dónde y con qué comentario. Es lo que contesta «en qué anda este pago». */
  pestana: 'detalle' | 'trazabilidad' = 'detalle';
  historial: any[] = [];
  observaciones: any[] = [];
  hitos: any[] = [];
  visorPdfUrl: SafeResourceUrl | null = null;
  visorPdfObjectUrl = '';
  visorPdfTitulo = '';
  visorPdfSubtitulo = '';
  comentario = '';
  retrasoJustificado = false;
  confirmarAlerta = false;
  expedienteSiaf = '';
  notaPagoSiaf = '';
  numeroOperacion = '';
  cci = '';
  prorrogaDias = 1;
  motivoProrroga = '';
  ejecutando = false;
  paso = '';

  informeFile: File | null = null;
  rhePdfFile: File | null = null;
  rheXmlFile: File | null = null;
  suspFile: File | null = null;
  notaPagoFile: File | null = null;
  constanciaFile: File | null = null;
  papeletaFile: File | null = null;
  rheSerie = '';
  rheNumero = '';

  constructor(
    private pago: PagoService,
    private sesion: SessionService,
    private documentos: DocumentoService,
    private firma: FirmaDigitalService,
    private maestra: MaestraService,
    private funciones: Funciones,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    const perfil = this.sesion.getUsuario()?.detalle?.[0]?.perfil?.[0];
    this.codigoRol = perfil?.cod_perfil || '';
    this.esLocador = this.codigoRol === 'PROVEEDOR';
    this.cargar();
  }

  get desde(): number {
    return this.total === 0 ? 0 : this.filtro.Desplazamiento + 1;
  }

  get hasta(): number {
    return Math.min(this.filtro.Desplazamiento + this.filtro.Limite, this.total);
  }

  cargar(): void {
    if (this.esLocador) {
      this.cargarPortal();
      return;
    }
    this.cargando = true;
    this.pago.listarPago(this.filtro).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No se pudo listar.');
          return;
        }
        this.expedientes = r.Expedientes || [];
        this.total = r.total || 0;
      },
      error: () => {
        this.cargando = false;
        this.funciones.mensaje('error', 'No fue posible comunicar con el servicio de pagos.');
      }
    });
  }

  cargarPortal(): void {
    this.cargando = true;
    this.pago.listarPortalLocador().subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No se pudo abrir el portal.');
          return;
        }
        this.ordenes = r.Ordenes || [];
      },
      error: () => {
        this.cargando = false;
        this.funciones.mensaje('error', 'No fue posible abrir el portal del locador.');
      }
    });
  }

  buscar(): void {
    this.filtro.Desplazamiento = 0;
    this.cargar();
  }

  pagina(delta: number): void {
    this.filtro.Desplazamiento = Math.max(0, this.filtro.Desplazamiento + delta * this.filtro.Limite);
    this.cargar();
  }

  abrir(fila: { IdExpediente: string }): void {
    this.pago.obtenerPago(fila.IdExpediente).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No se pudo abrir el expediente.');
          return;
        }
        this.seleccionado = r.Expediente;
        this.comentario = this.seleccionado?.ObservacionAu || '';
        this.expedienteSiaf = this.seleccionado?.ExpedienteSiaf || '';
        this.notaPagoSiaf = this.seleccionado?.NotaPagoSiaf || '';
        this.numeroOperacion = this.seleccionado?.NumeroOperacion || '';
        this.cci = this.seleccionado?.Cci || '';
        this.retrasoJustificado = !!this.seleccionado?.RetrasoJustificado;
        this.confirmarAlerta = false;
        this.pestana = 'detalle';
        this.hitos = this.seleccionado?.Hitos || [];
        this.leerOrdenSiga(fila.IdExpediente);
        this.leerAnexo11(fila.IdExpediente);
        this.leerTrazabilidad(fila.IdExpediente);
      },
      error: () => this.funciones.mensaje('error', 'No se pudo obtener el expediente.')
    });
  }

  /**
   * Estado de la O/S en SIGA (hitos 1 y 4).
   *
   * No condiciona la apertura del expediente: si SIGA no responde, el detalle
   * ya está en pantalla y lo único que falta es este dato. Por eso el error se
   * traga y `ordenSiga` se queda en null.
   *
   * El expediente SIAF que devuelve SIGA se propone en el campo del devengado
   * cuando Contabilidad todavía no escribió ninguno: hoy ese número se teclea
   * copiándolo de SIGA, y ahí ya está.
   */
  private leerOrdenSiga(idExpediente: string): void {
    this.ordenSiga = null;
    this.pago.sincronizarOrdenSiga(idExpediente).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) {
          return;
        }
        this.ordenSiga = r;
        if (!this.expedienteSiaf && r.ExpedienteSiaf) {
          this.expedienteSiaf = r.ExpedienteSiaf;
        }
      },
      error: () => { }
    });
  }

  /**
   * Recupera el Anexo 11 que ya esté registrado en el expediente.
   *
   * Sin esto, volver a abrir el expediente perdía el documento generado y el
   * botón ofrecía generarlo otra vez, dejando dos PDF para la misma acta.
   */
  private leerAnexo11(idExpediente: string): void {
    this.documentoAnexo11 = '';
    this.anexo11Firmado = '';
    this.documentosExpediente = [];
    this.pago.listarDocumento(idExpediente).subscribe({
      next: (r: any) => {
        this.documentosExpediente = r?.Documentos || r?.documentos || [];
        const doc = this.documentosExpediente.find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_11);
        this.documentoAnexo11 = idDocumentoSistema(doc?.GeneradoDocumento);
      },
      error: () => { }
    });
  }

  private leerTrazabilidad(idExpediente: string): void {
    this.historial = [];
    this.observaciones = [];
    this.hitos = [];
    this.pago.obtenerTrazabilidad(idExpediente).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) {
          return;
        }
        this.historial = r.Historial || [];
        this.observaciones = r.Observaciones || [];
      },
      error: () => { }
    });
  }

  /** Abre el expediente directamente en la pestaña de trazabilidad. */
  abrirTrazabilidad(fila: { IdExpediente: string }): void {
    this.abrir(fila);
    this.pestana = 'trazabilidad';
  }

  /**
   * Atajo desde la bandeja al Acta de Conformidad, que es el documento que se
   * quiere revisar sin entrar al expediente. Si todavía no existe se dice, en
   * vez de abrir un visor vacío.
   */
  verActaDesdeBandeja(fila: { IdExpediente: string }): void {
    this.pago.listarDocumento(fila.IdExpediente).subscribe({
      next: (r: any) => {
        const documentos = r?.Documentos || r?.documentos || [];
        const doc = documentos.find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_11);
        const id = idDocumentoSistema(doc?.GeneradoDocumento);
        if (!id) {
          this.funciones.mensaje('info',
            'Este expediente todavía no tiene el Acta de Conformidad (Anexo 11).');
          return;
        }
        this.abrirVisorPdf(id, 'Anexo 11 · Acta de Conformidad',
          doc.Estado === 'FIRMADO' ? 'Firmado digitalmente' : 'Sin firma');
      },
      error: () => this.funciones.mensaje('error', 'No fue posible consultar los documentos.')
    });
  }

  /** Abre cualquier documento del expediente desde la lista del detalle. */
  verDocumento(doc: any): void {
    const id = idDocumentoSistema(doc?.GeneradoDocumento);
    if (!id) {
      this.funciones.mensaje('info', 'Este documento no tiene archivo en el file server.');
      return;
    }
    this.abrirVisorPdf(id, doc.Nombre || doc.CodigoTipoDocumento,
      doc.Estado === 'FIRMADO' ? 'Firmado digitalmente' : 'Sin firma');
  }

  cerrarDetalle(): void {
    this.seleccionado = null;
    this.cerrarVisorPdf();
  }

  /**
   * Color de la píldora de estado, con la misma paleta que CMN y Requerimiento.
   *
   * Sin esto la píldora salía sin modificador y el estado se leía como texto
   * gris: el usuario tenía que leer la frase entera para saber si el expediente
   * iba bien, estaba observado o ya estaba cerrado.
   */
  tonoEstado(codigoEstado: string): string {
    if (codigoEstado === 'PAG_PAGO_EFECTUADO') return 'success';
    /* Toda observación se pinta igual —de Contabilidad o del área usuaria—:
       para quien mira la bandeja lo que cambia es a quién responder, no la
       gravedad. La alerta de resolución va aparte, dentro del expediente. */
    if (codigoEstado.startsWith('PAG_OBS')) return 'warning';
    if (codigoEstado === 'PAG_PENDIENTE') return 'neutral';
    return 'info';
  }

  monto(valor: number | null | undefined): string {
    return Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fecha(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-PE');
  }

  urlArchivo(id: string | null | undefined): string {
    return this.maestra.urlDescarga(idDocumentoSistema(id || ''), CARPETA_PAGO);
  }

  onFile(event: Event, campo: 'informe' | 'rhePdf' | 'rheXml' | 'susp' | 'nota' | 'constancia' | 'papeleta'): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (campo === 'informe') this.informeFile = file;
    if (campo === 'rhePdf') this.rhePdfFile = file;
    if (campo === 'rheXml') this.rheXmlFile = file;
    if (campo === 'susp') this.suspFile = file;
    if (campo === 'nota') this.notaPagoFile = file;
    if (campo === 'constancia') this.constanciaFile = file;
    if (campo === 'papeleta') this.papeletaFile = file;
  }

  ejecutar(transicion: TransicionPago): void {
    if (!this.seleccionado || this.ejecutando) {
      return;
    }
    const codigo = transicion.CodigoTransicion;
    if (codigo === 'PAG_PRESENTAR' || codigo === 'PAG_SUBSANAR') {
      this.presentar();
      return;
    }
    if (codigo === 'PAG_OBSERVAR_AU') {
      this.observar();
      return;
    }
    if (codigo === 'PAG_APROBAR_TECNICO') {
      this.aprobarTecnico();
      return;
    }
    if (codigo === 'PAG_FIRMAR_ANEXO11') {
      this.firmarAnexo11();
      return;
    }
    if (codigo === 'PAG_LIQUIDAR') {
      this.liquidar();
      return;
    }
    if (codigo === 'PAG_APROBAR_DEVENGADO') {
      this.devengar();
      return;
    }
    if (codigo === 'PAG_CONFIRMAR_PAGO') {
      this.girar();
      return;
    }
    if (transicion.RequiereComentario && !this.comentario.trim()) {
      this.funciones.mensaje('info', 'Indique el comentario u observación.');
      return;
    }
    this.ejecutando = true;
    this.pago.ejecutarTransicion(
      this.seleccionado.IdExpediente,
      codigo,
      this.seleccionado.Version,
      this.comentario.trim() || null
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  private presentar(): void {
    if (!this.seleccionado) {
      return;
    }
    if (!this.informeFile || !this.rhePdfFile || !this.rheXmlFile) {
      this.funciones.mensaje('info', 'Cargue el informe PDF y el RHE (PDF y XML).');
      return;
    }
    this.ejecutando = true;
    const id = this.seleccionado.IdExpediente;
    const version = this.seleccionado.Version;
    const ups = [
      this.documentos.subirArchivo(this.informeFile, CARPETA_PAGO),
      this.documentos.subirArchivo(this.rhePdfFile, CARPETA_PAGO),
      this.documentos.subirArchivo(this.rheXmlFile, CARPETA_PAGO),
      this.suspFile ? this.documentos.subirArchivo(this.suspFile, CARPETA_PAGO) : of(null)
    ];
    forkJoin(ups).pipe(
      switchMap((archivos: any[]) => {
        const inf = archivos[0]?.documento_sistema;
        const pdf = archivos[1]?.documento_sistema;
        const xml = archivos[2]?.documento_sistema;
        const sus = archivos[3]?.documento_sistema || null;
        return forkJoin({
          a: this.pago.registrarDocumento(id, TIPO_INFORME, inf, this.informeFile!.name),
          b: this.pago.registrarDocumento(id, TIPO_RHE_PDF, pdf, this.rhePdfFile!.name),
          c: this.pago.registrarDocumento(id, TIPO_RHE_XML, xml, this.rheXmlFile!.name),
          d: sus ? this.pago.registrarDocumento(id, TIPO_SUSP_4TA, sus, this.suspFile!.name)
                 : of({ estado: 1 })
        }).pipe(switchMap(() => this.pago.presentarEntregable({
          IdExpediente: id,
          Version: version,
          InformeDocumento: inf,
          RhePdfDocumento: pdf,
          RheXmlDocumento: xml,
          Suspension4taDocumento: sus,
          RheSerie: this.rheSerie,
          RheNumero: this.rheNumero
        })));
      })
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  private observar(): void {
    if (!this.seleccionado || !this.comentario.trim()) {
      this.funciones.mensaje('info', 'Registre las observaciones técnicas.');
      return;
    }
    this.ejecutando = true;
    this.pago.observarEntregable(
      this.seleccionado.IdExpediente,
      this.seleccionado.Version,
      this.comentario.trim()
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  private aprobarTecnico(): void {
    if (!this.seleccionado) {
      return;
    }
    this.ejecutando = true;
    this.pago.aprobarConformidadTecnica(
      this.seleccionado.IdExpediente,
      this.seleccionado.Version,
      this.retrasoJustificado
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  /** Los Anexos 9 y 10 los emite la DEC al liquidar. */
  get puedeGenerarAnexos910(): boolean {
    return !!this.seleccionado
      && this.seleccionado.CodigoEstado === 'PAG_CONFORMIDAD_APROBADA'
      && (this.codigoRol === 'ABAST_ESPECIALISTA' || this.codigoRol === 'ABAST_COORDINADOR');
  }

  /**
   * El Anexo 10 es la liquidación de penalidad POR MORA: si no hubo mora, no hay
   * nada que liquidar. La propia Directiva lo pone «de corresponder», y por eso
   * `PENALIDAD_A10` es el único ítem no obligatorio del check list junto con la
   * suspensión de 4ta. Sin atraso penalizable se emite sólo el Anexo 9.
   */
  get correspondeAnexo10(): boolean {
    return !!this.seleccionado
      && Number(this.seleccionado.MontoPenalidad || 0) > 0;
  }

  get etiquetaAnexos910(): string {
    return this.correspondeAnexo10 ? 'Generar Anexos 9 y 10' : 'Generar Anexo 9';
  }

  /**
   * Genera el Check list (Anexo 9) y, si corresponde, la Determinación de
   * penalidades (Anexo 10); los deja en el file server y abre el primero.
   *
   * Ninguno se firma digitalmente: la Directiva los cierra con visados y
   * `PAG_LIQUIDAR` no exige firma.
   *
   * El checklist se toma de la pantalla, no de lo grabado: si la DEC acaba de
   * marcar casillas y todavía no pulsó la acción, el PDF tiene que reflejar lo
   * que está viendo.
   */
  generarAnexos910(): void {
    if (!this.seleccionado || this.ejecutando) {
      return;
    }
    const det = this.seleccionado;
    const conPenalidad = this.correspondeAnexo10;
    this.ejecutando = true;
    this.paso = conPenalidad ? 'Generando los Anexos 9 y 10…' : 'Generando el Anexo 9…';

    const pdfs: Promise<Blob>[] = [this.documentos.generarPdf(construirAnexo9(det, det.Checklist || []))];
    if (conPenalidad) {
      pdfs.push(this.documentos.generarPdf(construirAnexo10(det)));
    }

    Promise.all(pdfs).then((blobs: Blob[]) => {
      const nombre9 = nombreArchivoAnexo9(det);
      const nombre10 = nombreArchivoAnexo10(det);
      forkJoin({
        a9: this.documentos.subirArchivo(
          new File([blobs[0]], nombre9, { type: 'application/pdf' }), CARPETA_PAGO),
        a10: conPenalidad
          ? this.documentos.subirArchivo(
              new File([blobs[1]], nombre10, { type: 'application/pdf' }), CARPETA_PAGO)
          : of(null)
      }).pipe(
        switchMap((subidos: any) => forkJoin({
          r9: this.pago.registrarDocumento(det.IdExpediente, TIPO_ANEXO_9,
                subidos.a9.documento_sistema, nombre9, det),
          r10: subidos.a10
            ? this.pago.registrarDocumento(det.IdExpediente, TIPO_ANEXO_10,
                subidos.a10.documento_sistema, nombre10, det)
            : of({ estado: 1 })
        }).pipe(map(() => idDocumentoSistema(subidos.a9.documento_sistema))))
      ).subscribe({
        next: (id9: string) => {
          this.ejecutando = false;
          this.paso = '';
          this.funciones.mensaje('success', conPenalidad
            ? 'Anexos 9 y 10 registrados en el expediente.'
            : 'Anexo 9 registrado en el expediente. Sin mora no corresponde el Anexo 10.');
          this.leerAnexo11(det.IdExpediente);
          this.abrirVisorPdf(id9, 'Anexo 9 · Check list de control de pagos', 'Generado');
        },
        error: () => this.fallar()
      });
    }).catch(() => this.fallar());
  }

  /** El Anexo 11 lo genera y firma el Jefe del Área usuaria, antes de la acción. */
  get puedeGenerarAnexo11(): boolean {
    return !!this.seleccionado
      && this.seleccionado.CodigoEstado === 'PAG_CONFORMIDAD_PEND_FIRMA'
      && this.codigoRol === 'AREA_JEFE';
  }

  get omitirFirma(): boolean {
    return this.firma.omitirDispositivo;
  }

  /**
   * Genera el Acta de Conformidad, la deja en el file server y la abre.
   *
   * El PDF no se queda en memoria: se sube y se registra en el expediente, y lo
   * que el visor muestra es el archivo del servidor. Así el documento que se
   * firma es exactamente el que quedó guardado, que es como se hace en CMN y en
   * Requerimiento.
   */
  generarAnexo11(): void {
    if (!this.seleccionado || this.ejecutando) {
      return;
    }
    const det = this.seleccionado;
    const nombre = nombreArchivoAnexo11(det);
    this.ejecutando = true;
    this.paso = 'Generando el Anexo 11…';

    this.documentos.generarPdf(construirAnexo11(det)).then(blob => {
      const archivo = new File([blob], nombre, { type: 'application/pdf' });
      this.documentos.subirArchivo(archivo, CARPETA_PAGO).pipe(
        switchMap((sub: any) => this.pago.registrarDocumento(
          det.IdExpediente, TIPO_ANEXO_11, sub.documento_sistema, nombre, det
        ).pipe(map(() => idDocumentoSistema(sub.documento_sistema))))
      ).subscribe({
        next: (id: string) => {
          this.ejecutando = false;
          this.paso = '';
          this.documentoAnexo11 = id;
          this.anexo11Firmado = '';
          this.abrirVisorAnexo11(id, 'Generado, pendiente de firma');
        },
        error: () => this.fallar()
      });
    }).catch(() => this.fallar());
  }

  /** Abre el Anexo 11 que ya está en el expediente, sin volver a generarlo. */
  verAnexo11(): void {
    const id = this.anexo11Firmado || this.documentoAnexo11;
    if (!id) {
      this.generarAnexo11();
      return;
    }
    this.abrirVisorAnexo11(id, this.anexo11Firmado ? 'Firmado digitalmente' : 'Pendiente de firma');
  }

  private abrirVisorAnexo11(documentoSistema: string, subtitulo: string): void {
    this.abrirVisorPdf(documentoSistema, 'Anexo 11 · Acta de Conformidad', subtitulo);
  }

  /** Trae el PDF del file server y lo muestra dentro del modal. */
  private abrirVisorPdf(documentoSistema: string, titulo: string, subtitulo: string): void {
    this.maestra.descargarArchivo(documentoSistema, CARPETA_PAGO).subscribe({
      next: (blob: Blob) => {
        this.cerrarVisorPdf();
        this.visorPdfTitulo = titulo;
        this.visorPdfSubtitulo = subtitulo;
        this.visorPdfObjectUrl = URL.createObjectURL(
          blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
        );
        this.visorPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorPdfObjectUrl);
      },
      error: () => this.funciones.mensaje('error',
        `El documento se registró, pero no fue posible abrirlo (${documentoSistema}).`)
    });
  }

  cerrarVisorPdf(): void {
    if (this.visorPdfObjectUrl) {
      URL.revokeObjectURL(this.visorPdfObjectUrl);
    }
    this.visorPdfObjectUrl = '';
    this.visorPdfUrl = null;
    this.visorPdfTitulo = '';
    this.visorPdfSubtitulo = '';
  }

  /**
   * Firma el Anexo 11 desde el visor: abre el firmador con el PDF del servidor,
   * y el PDF firmado que devuelve reemplaza al anterior en DocumentoVersion y
   * pasa a ser el que muestra el visor.
   */
  firmarAnexo11DesdeVisor(): void {
    if (!this.seleccionado || !this.documentoAnexo11 || this.ejecutando) {
      return;
    }
    const det = this.seleccionado;
    this.ejecutando = true;
    this.paso = 'Firmando…';
    let firmado = false;

    this.firma.abrir({
      documentoSistema: this.documentoAnexo11,
      subcarpeta: CARPETA_PAGO,
      descripcion: 'Acta de Conformidad (Anexo 11)'
    }).pipe(
      switchMap((idFirmado: string) => {
        firmado = true;
        this.anexo11Firmado = idFirmado;
        return this.pago.firmarDocumento(det.IdExpediente, TIPO_ANEXO_11,
          { GeneradoDocumento: idFirmado });
      })
    ).subscribe({
      next: (r: any) => {
        this.ejecutando = false;
        this.paso = '';
        if (r?.estado !== 1 && r?.codigo !== 51616) {
          this.funciones.mensaje('error', r?.mensaje || 'No se pudo registrar la firma.');
          return;
        }
        this.funciones.mensaje('success', 'Firma registrada. Confirme la acción para continuar.');
        this.abrirVisorAnexo11(this.anexo11Firmado, 'Firmado digitalmente');
      },
      error: (e: any) => {
        this.ejecutando = false;
        this.paso = '';
        this.funciones.mensaje('error',
          typeof e === 'string' ? e : 'No fue posible comunicarse con el servicio.');
      },
      complete: () => {
        if (!firmado) {
          this.ejecutando = false;
          this.paso = '';
          this.funciones.mensaje('info', 'Proceso de firma digital cancelado.');
        }
      }
    });
  }

  /**
   * La acción del flujo. El documento ya tiene que existir: si no se generó, no
   * hay nada que firmar y se dice, en vez de fabricar un PDF a espaldas del
   * usuario en el mismo clic que mueve el expediente.
   *
   * Con `firma.omitir_dispositivo` en true se registra la firma sobre el PDF sin
   * firmar —paFirmarDocumento sólo anota quién firmó—, que es lo que permite
   * recorrer el flujo desde un equipo sin el token.
   */
  private firmarAnexo11(): void {
    if (!this.seleccionado) {
      return;
    }
    if (!this.documentoAnexo11) {
      this.funciones.mensaje('info',
        'Genere el Acta de Conformidad (Anexo 11) antes de firmarla.');
      return;
    }
    if (!this.omitirFirma && !this.anexo11Firmado) {
      this.funciones.mensaje('info',
        'Firme digitalmente el Anexo 11 desde el visor antes de confirmar.');
      return;
    }

    const det = this.seleccionado;
    this.ejecutando = true;
    this.pago.firmarDocumento(det.IdExpediente, TIPO_ANEXO_11,
      this.anexo11Firmado ? { GeneradoDocumento: this.anexo11Firmado } : {}
    ).pipe(
      switchMap(() => this.pago.marcarConformidadFirmada(det.IdExpediente, det.Version))
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  private liquidar(): void {
    if (!this.seleccionado) {
      return;
    }
    const checklist = (this.seleccionado.Checklist || []).map((c: ChecklistPago) => ({
      CodigoItem: c.CodigoItem,
      Valor: c.Valor,
      Observacion: c.Observacion || null
    }));
    this.ejecutando = true;
    this.pago.registrarChecklist(this.seleccionado.IdExpediente, checklist).pipe(
      switchMap((r: any) => {
        if (r?.estado !== 1) {
          throw r;
        }
        return this.pago.liquidarExpediente(
          this.seleccionado!.IdExpediente,
          this.seleccionado!.Version,
          this.confirmarAlerta
        );
      })
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: (e) => {
        this.ejecutando = false;
        const msg = e?.mensaje || 'No se pudo liquidar el expediente.';
        if (/ALERTA_RESOLUCION/i.test(msg)) {
          this.funciones.mensaje('error', msg);
          return;
        }
        this.funciones.mensaje('error', msg);
      }
    });
  }

  private devengar(): void {
    if (!this.seleccionado || !this.expedienteSiaf.trim()) {
      this.funciones.mensaje('info', 'Indique el N.° de expediente SIAF del devengado.');
      return;
    }
    this.ejecutando = true;
    this.pago.registrarDevengado(
      this.seleccionado.IdExpediente,
      this.seleccionado.Version,
      this.expedienteSiaf.trim()
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  private girar(): void {
    if (!this.seleccionado) {
      return;
    }
    if (!this.notaPagoFile || !this.constanciaFile) {
      this.funciones.mensaje('info', 'Adjunte la Nota de Pago SIAF y la constancia de transferencia.');
      return;
    }
    if (!this.notaPagoSiaf.trim()) {
      this.funciones.mensaje('info', 'Indique el N.° de Nota de Pago SIAF.');
      return;
    }
    this.ejecutando = true;
    const id = this.seleccionado.IdExpediente;
    const version = this.seleccionado.Version;
    const hayPenalidad = Number(this.seleccionado.MontoPenalidad || 0) > 0;
    forkJoin({
      nota: this.documentos.subirArchivo(this.notaPagoFile, CARPETA_PAGO),
      cons: this.documentos.subirArchivo(this.constanciaFile, CARPETA_PAGO),
      pap: hayPenalidad && this.papeletaFile
        ? this.documentos.subirArchivo(this.papeletaFile, CARPETA_PAGO)
        : of(null)
    }).pipe(
      switchMap((arch: any) => forkJoin({
        a: this.pago.registrarDocumento(id, TIPO_NOTA_PAGO, arch.nota.documento_sistema, this.notaPagoFile!.name),
        b: this.pago.registrarDocumento(id, TIPO_CONSTANCIA, arch.cons.documento_sistema, this.constanciaFile!.name),
        c: arch.pap
          ? this.pago.registrarDocumento(id, TIPO_PAPELETA, arch.pap.documento_sistema, this.papeletaFile!.name)
          : of({ estado: 1 })
      }).pipe(switchMap(() => this.pago.registrarGiro({
        IdExpediente: id,
        Version: version,
        NotaPagoSiaf: this.notaPagoSiaf.trim(),
        NumeroOperacion: this.numeroOperacion.trim(),
        Cci: this.cci.trim(),
        NotaPagoDocumento: arch.nota.documento_sistema,
        ConstanciaDocumento: arch.cons.documento_sistema,
        PapeletaPenalidadDocumento: arch.pap?.documento_sistema || null
      }))))
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  guardarProrroga(): void {
    if (!this.seleccionado) {
      return;
    }
    this.pago.registrarProrroga(this.seleccionado.IdExpediente, this.prorrogaDias, this.motivoProrroga).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No se registro la prorroga.');
          return;
        }
        this.funciones.mensaje('success', r.mensaje);
        this.abrir(this.seleccionado!);
      },
      error: () => this.funciones.mensaje('error', 'No se pudo registrar la prorroga.')
    });
  }

  private terminar(respuesta: any): void {
    this.ejecutando = false;
    if (respuesta?.estado !== 1) {
      this.funciones.mensaje('error', respuesta?.mensaje || 'No se pudo ejecutar la acción.');
      return;
    }
    this.funciones.mensaje('success', respuesta.mensaje || 'Se registró la acción.');
    const id = this.seleccionado?.IdExpediente;
    this.cargar();
    if (id) {
      this.abrir({ IdExpediente: id });
    }
  }

  private fallar(): void {
    this.ejecutando = false;
    this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
  }
}
