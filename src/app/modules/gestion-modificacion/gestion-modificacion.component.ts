import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ModificacionService } from './services/modificacion.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentoService } from '../../core/services/documento.service';
import { FirmaDigitalService } from '../../core/services/firma-digital.service';
import { MaestraService } from '../../shared/services/maestra.service';
import { Funciones } from '../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../shared/funciones/archivo';
import {
  CARPETA_MODIFICACION, ContratoElegible, SolicitudBandeja, SolicitudDetalle, TipoSolicitud,
  TIPO_AMP_CARTA, TIPO_AMP_INFORME_AU, TIPO_AMP_SOLICITUD, TIPO_MOD_ACTA, TIPO_MOD_CARTA,
  TIPO_MOD_INFORME_AU, TIPO_MOD_SOLICITUD, TransicionModificacion
} from './models/modificacion.model';
import { construirActaModificacion, construirCartaRespuesta, nombreArchivoActa, nombreArchivoCarta } from './documentos/modificacion.pdfmake';

type Pestana = 'solicitud' | 'trazabilidad';

@Component({
  selector: 'app-gestion-modificacion',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './gestion-modificacion.component.html',
  styleUrl: './gestion-modificacion.component.scss'
})
export class GestionModificacionComponent implements OnInit {

  breadcrumb = ['Administración', 'Modificación y ampliación'];
  codigoRol = '';
  nombreActor = '';
  esProveedor = false;
  esAu = false;

  /* Sin check de «Solo en trámite»: la bandeja muestra todo, como la del CMN y
     la del requerimiento, y marca con MeToca lo pendiente. */
  filtro = { SoloMiBandeja: true, SoloVigentes: false, Tipo: '', Texto: '', Limite: 50, Desplazamiento: 0 };
  cargando = false;
  total = 0;
  solicitudes: SolicitudBandeja[] = [];

  /* Nueva solicitud: se elige el contrato vigente y el tipo. La ampliacion
     solo la pide el proveedor (7.3.5.1); el AU solo modifica. */
  nueva = false;
  contratos: ContratoElegible[] = [];
  buscarContrato = '';
  formNueva = {
    IdContrato: '', Tipo: 'MODIFICACION' as TipoSolicitud, Asunto: '', Sustento: '',
    FechaFinHechoGenerador: '', DiasSolicitados: null as number | null, DetalleModificacion: ''
  };
  solicitudFile: File | null = null;

  seleccionado: SolicitudDetalle | null = null;
  pestana: Pestana = 'solicitud';
  ejecutando = false;
  paso = '';

  formOpinion = { Resultado: 'PROCEDE' as 'PROCEDE' | 'NO_PROCEDE', Informe: '', DetalleModificacion: '' };
  informeFile: File | null = null;
  formDecision = { Resultado: 'APROBADA' as 'APROBADA' | 'DENEGADA', Motivo: '', DiasOtorgados: null as number | null, NumeroCarta: '' };
  formActa = { NumeroActa: '', RegistroPladicop: '' };
  /* El acta vive en el file server; estos son los ids del generado y del
     firmado, como el Anexo 11 en Pagos. */
  documentoActa = '';
  actaFirmada = '';
  medioManual = 'MESA_PARTES';
  detalleManual = '';

  trazaTitulo = '';
  historial: any[] = [];
  documentos: any[] = [];

  visorPdfUrl: SafeResourceUrl | null = null;
  visorPdfObjectUrl = '';
  visorPdfTitulo = '';
  visorPuedeFirmar = false;

  constructor(
    private servicio: ModificacionService,
    private sesion: SessionService,
    private documentosSrv: DocumentoService,
    private firma: FirmaDigitalService,
    private maestra: MaestraService,
    private funciones: Funciones,
    private sanitizer: DomSanitizer,
    private ruta: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const usuario = this.sesion.getUsuario();
    const perfil = usuario?.detalle?.[0]?.perfil?.[0];
    this.codigoRol = perfil?.cod_perfil || '';
    this.nombreActor = [usuario?.nombre, usuario?.apellido_paterno, usuario?.apellido_materno].filter(Boolean).join(' ');
    this.esProveedor = this.codigoRol === 'PROVEEDOR';
    this.esAu = this.codigoRol.startsWith('AREA_');
    this.cargar();

    /* Desde el detalle del contrato en Ejecucion se llega con el contrato y el
       tipo ya elegidos. */
    const params = this.ruta.snapshot.queryParamMap;
    const contrato = params.get('contrato');
    if (contrato && (this.esProveedor || this.esAu)) {
      this.abrirNueva();
      this.formNueva.IdContrato = contrato;
      const tipo = params.get('tipo');
      if (tipo === 'AMPLIACION_PLAZO' && this.esProveedor) {
        this.formNueva.Tipo = 'AMPLIACION_PLAZO';
      }
    }
  }

  /* ------------------------------------------------------------------ bandeja */

  get desde(): number { return this.total === 0 ? 0 : this.filtro.Desplazamiento + 1; }
  get hasta(): number { return Math.min(this.filtro.Desplazamiento + this.filtro.Limite, this.total); }

  cargar(): void {
    this.cargando = true;
    const f: any = { ...this.filtro, Tipo: this.filtro.Tipo || null };
    this.servicio.listarSolicitud(f).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No se pudo listar.');
          return;
        }
        this.solicitudes = r.Solicitudes || [];
        this.total = r.total || 0;
      },
      error: () => { this.cargando = false; this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.'); }
    });
  }

  buscar(): void { this.filtro.Desplazamiento = 0; this.cargar(); }

  limpiarFiltros(): void {
    this.filtro = { ...this.filtro, Tipo: '', Texto: '', Desplazamiento: 0 };
    this.cargar();
  }
  pagina(delta: number): void { this.filtro.Desplazamiento = Math.max(0, this.filtro.Desplazamiento + delta * this.filtro.Limite); this.cargar(); }

  /* ------------------------------------------------------------ nueva solicitud */

  get puedeIniciar(): boolean { return this.esProveedor || this.esAu; }

  abrirNueva(): void {
    this.nueva = true;
    this.formNueva = {
      IdContrato: '', Tipo: 'MODIFICACION', Asunto: '', Sustento: '', FechaFinHechoGenerador: '', DiasSolicitados: null, DetalleModificacion: ''
    };
    this.solicitudFile = null;
    this.buscarContrato = '';
    this.cargarContratos();
  }

  cargarContratos(): void {
    this.servicio.listarContratoVigente(this.buscarContrato).subscribe({
      next: (r: any) => this.contratos = r?.estado === 1 ? (r.Contratos || []) : [],
      error: () => this.contratos = []
    });
  }

  registrarSolicitud(): void {
    if (this.ejecutando) { return; }
    const f = this.formNueva;
    if (!f.IdContrato || !f.Asunto.trim() || !f.Sustento.trim()) {
      this.funciones.mensaje('info', 'Elija el contrato e indique el asunto y el sustento.');
      return;
    }
    if (f.Tipo === 'AMPLIACION_PLAZO' && (!f.FechaFinHechoGenerador || !f.DiasSolicitados)) {
      this.funciones.mensaje('info', 'Indique la fecha de fin del hecho generador y los días solicitados.');
      return;
    }
    if (f.Tipo === 'MODIFICACION' && !f.DetalleModificacion.trim()) {
      this.funciones.mensaje('info', 'Indique qué se modifica del contrato.');
      return;
    }
    this.ejecutando = true;
    let idDoc: string | null = null;
    this.subir(this.solicitudFile).pipe(
      switchMap((id) => {
        idDoc = id;
        return this.servicio.registrarSolicitud({
          IdContrato: f.IdContrato, Tipo: f.Tipo, Asunto: f.Asunto.trim(), Sustento: f.Sustento.trim(),
          SolicitudDocumento: id, FechaFinHechoGenerador: f.FechaFinHechoGenerador || null,
          DiasSolicitados: f.DiasSolicitados, DetalleModificacion: f.DetalleModificacion.trim() || null
        });
      }),
      switchMap((r: any) => r?.estado === 1 && idDoc
        ? this.registrar(r.IdExpediente, f.Tipo === 'AMPLIACION_PLAZO' ? TIPO_AMP_SOLICITUD : TIPO_MOD_SOLICITUD, idDoc, this.solicitudFile?.name).pipe(map(() => r))
        : of(r))
    ).subscribe({
      next: (r: any) => {
        this.ejecutando = false;
        if (r?.estado !== 1) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo registrar.'); return; }
        this.funciones.mensaje('success', r.mensaje);
        this.nueva = false;
        this.cargar();
        if (r.IdSolicitud) { this.abrir({ IdSolicitud: r.IdSolicitud }); }
      },
      error: () => this.fallar()
    });
  }

  /* ------------------------------------------------------------------ detalle */

  abrir(fila: { IdSolicitud: string }, pestana: Pestana = 'solicitud'): void {
    this.servicio.obtenerSolicitud(fila.IdSolicitud).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo abrir la solicitud.'); return; }
        this.seleccionado = r.Solicitud;
        const s = this.seleccionado!;
        this.pestana = pestana;
        this.formOpinion = { Resultado: 'PROCEDE', Informe: '', DetalleModificacion: s.DetalleModificacion || '' };
        this.informeFile = null;
        this.formDecision = { Resultado: 'APROBADA', Motivo: '', DiasOtorgados: s.DiasSolicitados, NumeroCarta: '' };
        this.formActa = { NumeroActa: s.NumeroActa || '', RegistroPladicop: s.RegistroPladicop || '' };
        this.documentoActa = idDocumentoSistema(s.ActaDocumento || '');
        this.actaFirmada = '';
        this.detalleManual = '';
        this.verTrazabilidad(s.IdExpediente, s.Codigo);
      },
      error: () => this.funciones.mensaje('error', 'No se pudo obtener la solicitud.')
    });
  }

  abrirTrazabilidad(fila: { IdSolicitud: string }): void { this.abrir(fila, 'trazabilidad'); }
  cerrarDetalle(): void { this.seleccionado = null; this.cerrarVisorPdf(); }

  private refrescar(): void {
    const id = this.seleccionado?.IdSolicitud;
    const pestana = this.pestana;
    this.cargar();
    if (id) { this.abrir({ IdSolicitud: id }, pestana); }
  }

  /* -------------------------------------------------------------- utilidades */

  get esAmp(): boolean { return this.seleccionado?.Tipo === 'AMPLIACION_PLAZO'; }

  tipoNombre(t: string): string { return t === 'AMPLIACION_PLAZO' ? 'Ampliación de plazo' : 'Modificación'; }

  tonoEstado(codigo: string): string {
    if (codigo.endsWith('_APROBADA')) return 'success';
    if (codigo.endsWith('_DENEGADA') || codigo === 'MOD_RECHAZADA_AU') return 'warning';
    if (codigo === 'MOD_PRESENTADA' || codigo === 'AMP_PRESENTADA') return 'neutral';
    return 'info';
  }

  tonoPlazo(dias: number | null): string {
    if (dias === null || dias === undefined) return 'neutral';
    if (dias < 0) return 'danger';
    if (dias <= 1) return 'warning';
    return 'success';
  }

  textoPlazo(dias: number | null): string {
    if (dias === null || dias === undefined) return '';
    if (dias < 0) return `Vencido hace ${-dias} d`;
    if (dias === 0) return 'Vence hoy';
    return `${dias} d`;
  }

  fecha(valor: string | null | undefined): string {
    if (!valor) { return '—'; }
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    const d = soloFecha ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3])) : new Date(valor);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-PE');
  }

  monto(valor: number | null | undefined): string {
    return Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onFile(event: Event, campo: 'solicitud' | 'informe'): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (campo === 'solicitud') this.solicitudFile = file;
    if (campo === 'informe') this.informeFile = file;
  }

  private subir(archivo: File | null): Observable<string | null> {
    if (!archivo) { return of(null); }
    return this.documentosSrv.subirArchivo(archivo, CARPETA_MODIFICACION).pipe(map((s: any) => s?.documento_sistema || null));
  }

  private registrar(idExpediente: string, tipo: string, id: string | null, nombre: string | undefined, payload: any = null): Observable<any> {
    if (!id) { return of({ estado: 1 }); }
    return this.servicio.registrarDocumento(idExpediente, tipo, id, nombre || tipo, payload);
  }

  private terminar(r: any): void {
    this.ejecutando = false;
    this.paso = '';
    if (r?.estado !== 1) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo ejecutar la acción.'); return; }
    this.funciones.mensaje('success', r.mensaje || 'Se registró la acción.');
    this.refrescar();
  }

  private fallar(): void {
    this.ejecutando = false;
    this.paso = '';
    this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
  }

  /* --------------------------------------------------------- opinion del AU */

  opinar(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    if (!this.formOpinion.Informe.trim()) { this.funciones.mensaje('info', 'Registre el informe del área usuaria.'); return; }
    const s = this.seleccionado;
    const tipoDoc = this.esAmp ? TIPO_AMP_INFORME_AU : TIPO_MOD_INFORME_AU;
    this.ejecutando = true;
    this.subir(this.informeFile).pipe(
      switchMap((id) => this.registrar(s.IdExpediente, tipoDoc, id, this.informeFile?.name).pipe(map(() => id))),
      switchMap((id) => this.servicio.opinarAu({
        IdExpediente: s.IdExpediente, Version: s.Version, Resultado: this.formOpinion.Resultado,
        Informe: this.formOpinion.Informe.trim(), InformeDocumento: id,
        DetalleModificacion: this.esAmp ? null : (this.formOpinion.DetalleModificacion.trim() || null)
      }))
    ).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
  }

  /* --------------------------------------------------------- decision DEC */

  /* La denegatoria y la ampliacion aprobada llevan carta de respuesta: se
     genera, se sube y se registra ANTES de decidir, para que la decision quede
     con su documento en el mismo gesto. La modificacion aprobada no lleva
     carta: lleva acta, que emite el jefe en el paso siguiente. */
  get decisionLlevaCarta(): boolean {
    return this.formDecision.Resultado === 'DENEGADA' || this.esAmp;
  }

  decidir(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const s = this.seleccionado;
    const f = this.formDecision;
    if (!f.Motivo.trim()) { this.funciones.mensaje('info', 'Indique el motivo de la decisión.'); return; }
    if (this.esAmp && f.Resultado === 'APROBADA' && (!f.DiasOtorgados || f.DiasOtorgados < 1)) {
      this.funciones.mensaje('info', 'Indique los días que se otorgan.');
      return;
    }
    this.funciones.alertaRetorno('question', f.Resultado === 'APROBADA' ? 'Aprobar' : 'Denegar',
      `${s.Codigo} · ${this.tipoNombre(s.Tipo)}<br><br>${f.Motivo.trim()}`, true,
      (res: any) => {
        if (!res?.isConfirmed) { return; }
        this.ejecutando = true;
        this.paso = this.decisionLlevaCarta ? 'Generando la carta…' : '';
        const carta$: Observable<string | null> = this.decisionLlevaCarta
          ? from(this.documentosSrv.generarPdf(construirCartaRespuesta(s, f.Resultado, f.Motivo.trim(), f.DiasOtorgados, f.NumeroCarta.trim() || null, this.nombreActor))).pipe(
              switchMap((blob: Blob) => this.documentosSrv.subirArchivo(new File([blob], nombreArchivoCarta(s), { type: 'application/pdf' }), CARPETA_MODIFICACION)),
              switchMap((sub: any) => this.registrar(s.IdExpediente, this.esAmp ? TIPO_AMP_CARTA : TIPO_MOD_CARTA, sub.documento_sistema, nombreArchivoCarta(s), s)
                .pipe(map(() => sub.documento_sistema as string))))
          : of(null);
        carta$.pipe(
          switchMap((idCarta) => this.servicio.decidirDec({
            IdExpediente: s.IdExpediente, Version: s.Version, Resultado: f.Resultado, Motivo: f.Motivo.trim(),
            DiasOtorgados: this.esAmp ? f.DiasOtorgados : null, CartaDocumento: idCarta, NumeroCarta: f.NumeroCarta.trim() || null
          }))
        ).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
      });
  }

  /* ---------------------------------------------------------------- acta */

  get omitirFirma(): boolean { return this.firma.omitirDispositivo; }

  generarActa(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const s = this.seleccionado;
    if (!this.formActa.NumeroActa.trim()) { this.funciones.mensaje('info', 'Indique el número del acta.'); return; }
    const nombre = nombreArchivoActa(s);
    this.ejecutando = true;
    this.paso = 'Generando el acta…';
    const detalle: SolicitudDetalle = { ...s, NumeroActa: this.formActa.NumeroActa.trim() };
    from(this.documentosSrv.generarPdf(construirActaModificacion(detalle, this.nombreActor))).pipe(
      switchMap((blob: Blob) => this.documentosSrv.subirArchivo(new File([blob], nombre, { type: 'application/pdf' }), CARPETA_MODIFICACION)),
      switchMap((sub: any) => this.registrar(s.IdExpediente, TIPO_MOD_ACTA, sub.documento_sistema, nombre, detalle).pipe(map(() => sub.documento_sistema as string))),
      switchMap((id: string) => this.servicio.registrarActa({
        IdExpediente: s.IdExpediente, NumeroActa: this.formActa.NumeroActa.trim(), ActaDocumento: id,
        RegistroPladicop: this.formActa.RegistroPladicop.trim() || null
      }).pipe(map(() => id)))
    ).subscribe({
      next: (id: string) => {
        this.ejecutando = false;
        this.paso = '';
        this.documentoActa = idDocumentoSistema(id);
        this.actaFirmada = '';
        this.abrirVisorPdf(this.documentoActa, 'Acta de modificación', true);
      },
      error: () => this.fallar()
    });
  }

  verActa(): void {
    const id = this.actaFirmada || this.documentoActa;
    if (!id) { return; }
    this.abrirVisorPdf(id, 'Acta de modificación', this.seleccionado?.CodigoEstado === 'MOD_POR_FIRMA_ACTA' && this.codigoRol === 'ABAST_JEFE');
  }

  /* Firma desde el visor: el PDF firmado que devuelve el firmador reemplaza al
     generado. Con firma.omitir_dispositivo en true no se abre el firmador y la
     accion registra la firma sobre el PDF sin firmar (igual que en Pagos). */
  firmarActaDesdeVisor(): void {
    if (!this.seleccionado || !this.documentoActa || this.ejecutando) { return; }
    const s = this.seleccionado;
    this.ejecutando = true;
    this.paso = 'Firmando…';
    let firmado = false;
    this.firma.abrir({ documentoSistema: this.documentoActa, subcarpeta: CARPETA_MODIFICACION, descripcion: 'Acta de modificación del contrato' }).pipe(
      switchMap((idFirmado: string) => {
        firmado = true;
        this.actaFirmada = idFirmado;
        return this.servicio.firmarDocumento(s.IdExpediente, TIPO_MOD_ACTA, { GeneradoDocumento: idFirmado });
      })
    ).subscribe({
      next: (r: any) => {
        this.ejecutando = false; this.paso = '';
        if (r?.estado !== 1 && r?.codigo !== 51616) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo registrar la firma.'); return; }
        this.funciones.mensaje('success', 'Firma registrada. Confirme la acción para continuar.');
        this.abrirVisorPdf(this.actaFirmada, 'Acta de modificación · firmada', false);
      },
      error: (e: any) => { this.ejecutando = false; this.paso = ''; this.funciones.mensaje('error', typeof e === 'string' ? e : 'No fue posible comunicarse con el servicio.'); },
      complete: () => { if (!firmado) { this.ejecutando = false; this.paso = ''; this.funciones.mensaje('info', 'Proceso de firma digital cancelado.'); } }
    });
  }

  /* --------------------------------------------------------- transiciones */

  ejecutar(t: TransicionModificacion): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const s = this.seleccionado;
    const codigo = t.CodigoTransicion;

    if (codigo === 'MOD_FIRMAR_ACTA') {
      if (!this.documentoActa) { this.funciones.mensaje('info', 'Genere el acta de modificación antes de firmarla.'); return; }
      if (!this.omitirFirma && !this.actaFirmada) { this.funciones.mensaje('info', 'Firme digitalmente el acta desde el visor antes de confirmar.'); return; }
      this.ejecutando = true;
      this.servicio.firmarDocumento(s.IdExpediente, TIPO_MOD_ACTA, this.actaFirmada ? { GeneradoDocumento: this.actaFirmada } : {}).pipe(
        switchMap(() => this.servicio.ejecutarAccion(s.IdExpediente, s.Version, codigo))
      ).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
      return;
    }

    /* Las que traen datos propios se resuelven en sus formularios. */
    if (codigo === 'MOD_ACEPTAR_AU' || codigo === 'MOD_RECHAZAR_AU' || codigo === 'MOD_ELEVAR_SUSTENTO' || codigo === 'AMP_OPINAR_AU') {
      this.formOpinion.Resultado = codigo === 'MOD_RECHAZAR_AU' ? 'NO_PROCEDE' : 'PROCEDE';
      this.opinar();
      return;
    }
    if (codigo === 'MOD_APROBAR_DEC' || codigo === 'AMP_APROBAR') { this.formDecision.Resultado = 'APROBADA'; this.decidir(); return; }
    if (codigo === 'MOD_DENEGAR_DEC' || codigo === 'AMP_DENEGAR' || codigo === 'AMP_DENEGAR_DIRECTO') { this.formDecision.Resultado = 'DENEGADA'; this.decidir(); return; }

    this.funciones.alertaRetorno('question', t.NombreAccion, `${s.Codigo} · ${s.Asunto}<br><br>Pasa a «${t.EstadoDestino}».`, true,
      (res: any) => {
        if (!res?.isConfirmed) { return; }
        this.ejecutando = true;
        this.servicio.ejecutarAccion(s.IdExpediente, s.Version, codigo).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
      });
  }

  /** Que transiciones van al pie como boton: las que no tienen formulario propio en la pantalla. */
  get transicionesDirectas(): TransicionModificacion[] {
    const conFormulario = new Set(['MOD_ACEPTAR_AU', 'MOD_RECHAZAR_AU', 'MOD_ELEVAR_SUSTENTO', 'AMP_OPINAR_AU',
                                   'MOD_APROBAR_DEC', 'MOD_DENEGAR_DEC', 'AMP_APROBAR', 'AMP_DENEGAR', 'AMP_DENEGAR_DIRECTO']);
    return (this.seleccionado?.Transiciones || []).filter(t => !conFormulario.has(t.CodigoTransicion));
  }

  /* ---------------------------------------------------------- notificacion */

  notificarCorreo(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const s = this.seleccionado;
    this.funciones.alertaRetorno('question', 'Notificar por correo', `Se enviará la decisión a ${s.CorreoProveedor || 'el correo del proveedor'}.`, true,
      (res: any) => {
        if (!res?.isConfirmed) { return; }
        this.ejecutando = true;
        this.servicio.notificarDecision(s.IdExpediente).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
      });
  }

  notificarManual(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    if (!this.detalleManual.trim()) { this.funciones.mensaje('info', 'Indique el cargo o número con que se notificó.'); return; }
    this.ejecutando = true;
    this.servicio.marcarNotificada(this.seleccionado.IdExpediente, this.medioManual, this.detalleManual.trim())
      .subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
  }

  /* ------------------------------------------------------------- trazabilidad */

  verTrazabilidad(idExpediente: string, titulo: string): void {
    this.trazaTitulo = titulo;
    this.historial = [];
    this.documentos = [];
    this.servicio.obtenerTrazabilidad(idExpediente).subscribe({ next: (r: any) => { if (r?.estado === 1) { this.historial = r.Historial || []; } }, error: () => { } });
    this.servicio.listarDocumento(idExpediente).subscribe({ next: (r: any) => this.documentos = r?.Documentos || r?.documentos || [], error: () => { } });
  }

  /* -------------------------------------------------------------------- visor */

  verArchivo(id: string | null | undefined, titulo: string): void {
    const doc = idDocumentoSistema(id || '');
    if (!doc) { this.funciones.mensaje('info', 'Este documento no tiene archivo en el file server.'); return; }
    this.abrirVisorPdf(doc, titulo, false);
  }

  verDocumento(doc: any): void { this.verArchivo(doc?.GeneradoDocumento, doc?.Nombre || doc?.CodigoTipoDocumento); }

  private abrirVisorPdf(documentoSistema: string, titulo: string, puedeFirmar: boolean): void {
    this.maestra.descargarArchivo(documentoSistema, CARPETA_MODIFICACION).subscribe({
      next: (blob: Blob) => {
        this.cerrarVisorPdf();
        this.visorPdfTitulo = titulo;
        this.visorPuedeFirmar = puedeFirmar;
        this.visorPdfObjectUrl = URL.createObjectURL(blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' }));
        this.visorPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorPdfObjectUrl);
      },
      error: () => this.funciones.mensaje('error', `El documento se registró, pero no fue posible abrirlo (${documentoSistema}).`)
    });
  }

  cerrarVisorPdf(): void {
    if (this.visorPdfObjectUrl) { URL.revokeObjectURL(this.visorPdfObjectUrl); }
    this.visorPdfObjectUrl = '';
    this.visorPdfUrl = null;
    this.visorPdfTitulo = '';
    this.visorPuedeFirmar = false;
  }
}
