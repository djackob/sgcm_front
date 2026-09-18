import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ResolucionService } from './services/resolucion.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentoService } from '../../core/services/documento.service';
import { FirmaDigitalService } from '../../core/services/firma-digital.service';
import { MaestraService } from '../../shared/services/maestra.service';
import { Funciones } from '../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../shared/funciones/archivo';
import {
  CARPETA_RESOLUCION, CAUSALES, Causal, ProcedimientoBandeja, ProcedimientoDetalle,
  TIPO_RES_CARTA_APERCIBIMIENTO, TIPO_RES_CARTA_RESOLUCION, TIPO_RES_CARTA_RESPUESTA, TIPO_RES_INFORME_AU,
  TIPO_RES_RESPUESTA, TIPO_RES_SOLICITUD, TransicionResolucion
} from './models/resolucion.model';
import {
  construirCartaApercibimiento, construirCartaResolucion, construirCartaRespuestaNegativa,
  nombreArchivoCartaApercibimiento, nombreArchivoCartaResolucion, nombreArchivoCartaRespuesta
} from './documentos/resolucion.pdfmake';

type Pestana = 'procedimiento' | 'trazabilidad';
type TipoCarta = 'APERCIBIMIENTO' | 'RESOLUCION' | 'RESPUESTA';

@Component({
  selector: 'app-gestion-resolucion',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './gestion-resolucion.component.html',
  styleUrl: './gestion-resolucion.component.scss'
})
export class GestionResolucionComponent implements OnInit {

  breadcrumb = ['Administración', 'Resolución del contrato'];
  codigoRol = '';
  nombreActor = '';
  esProveedor = false;
  esAu = false;
  causales = CAUSALES;

  /* Sin check de «Solo en trámite»: la bandeja muestra todo y marca lo pendiente. */
  filtro = { SoloMiBandeja: true, SoloVigentes: false, Causal: '', Texto: '', Limite: 50, Desplazamiento: 0 };
  cargando = false;
  total = 0;
  procedimientos: ProcedimientoBandeja[] = [];

  nuevo = false;
  contratos: any[] = [];
  buscarContrato = '';
  formNuevo = { IdContrato: '', Causal: '' as Causal | '', Alcance: 'TOTAL' as 'TOTAL' | 'PARCIAL', ParteResuelta: '', Hechos: '' };
  documentoFile: File | null = null;

  seleccionado: ProcedimientoDetalle | null = null;
  pestana: Pestana = 'procedimiento';
  ejecutando = false;
  paso = '';

  formPronunciamiento = { Pronunciamiento: 'FAVORABLE' as 'FAVORABLE' | 'DESFAVORABLE', Informe: '' };
  informeFile: File | null = null;
  formDecision = { Decision: 'APERCIBIR' as 'APERCIBIR' | 'RESOLVER' | 'DESESTIMAR', Motivo: '', PlazoApercibimientoDias: null as number | null,
                   Alcance: 'TOTAL' as 'TOTAL' | 'PARCIAL', ParteResuelta: '' };
  formCarta = { NumeroCarta: '', MedioNotificacion: 'NOTARIAL', RegistroPladicop: '' };
  /* Ids del PDF generado y del firmado de la carta que toca en este estado. */
  documentoCarta = '';
  cartaFirmada = '';
  formRespuesta = { Respuesta: '' };
  respuestaFile: File | null = null;
  medioManual = 'NOTARIAL';
  detalleManual = '';

  trazaTitulo = '';
  historial: any[] = [];
  documentos: any[] = [];

  visorPdfUrl: SafeResourceUrl | null = null;
  visorPdfObjectUrl = '';
  visorPdfTitulo = '';
  visorPuedeFirmar = false;

  constructor(
    private servicio: ResolucionService,
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

    const contrato = this.ruta.snapshot.queryParamMap.get('contrato');
    if (contrato && (this.esProveedor || this.esAu)) {
      this.abrirNuevo();
      this.formNuevo.IdContrato = contrato;
    }
  }

  /* ------------------------------------------------------------------ bandeja */

  get desde(): number { return this.total === 0 ? 0 : this.filtro.Desplazamiento + 1; }
  get hasta(): number { return Math.min(this.filtro.Desplazamiento + this.filtro.Limite, this.total); }

  cargar(): void {
    this.cargando = true;
    this.servicio.listarProcedimiento({ ...this.filtro, Causal: this.filtro.Causal || null }).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo listar.'); return; }
        this.procedimientos = r.Procedimientos || [];
        this.total = r.total || 0;
      },
      error: () => { this.cargando = false; this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.'); }
    });
  }

  buscar(): void { this.filtro.Desplazamiento = 0; this.cargar(); }

  limpiarFiltros(): void {
    this.filtro = { ...this.filtro, Causal: '', Texto: '', Desplazamiento: 0 };
    this.cargar();
  }
  pagina(delta: number): void { this.filtro.Desplazamiento = Math.max(0, this.filtro.Desplazamiento + delta * this.filtro.Limite); this.cargar(); }

  /* -------------------------------------------------------- nuevo procedimiento */

  get puedeIniciar(): boolean { return this.esProveedor || this.esAu; }

  /* El proveedor solo puede pedir mutuo acuerdo o hecho sobreviniente; el
     resto de causales las informa el area usuaria (7.3.7.1). */
  get causalesDisponibles() {
    return this.causales.filter(c => this.esProveedor ? (c.quien === 'PROVEEDOR' || c.quien === 'AMBOS') : c.quien !== 'PROVEEDOR');
  }

  abrirNuevo(): void {
    this.nuevo = true;
    this.formNuevo = { IdContrato: '', Causal: '', Alcance: 'TOTAL', ParteResuelta: '', Hechos: '' };
    this.documentoFile = null;
    this.buscarContrato = '';
    this.cargarContratos();
  }

  cargarContratos(): void {
    this.servicio.listarContratoVigente(this.buscarContrato).subscribe({
      next: (r: any) => this.contratos = r?.estado === 1 ? (r.Contratos || []) : [],
      error: () => this.contratos = []
    });
  }

  registrarProcedimiento(): void {
    if (this.ejecutando) { return; }
    const f = this.formNuevo;
    if (!f.IdContrato || !f.Causal || !f.Hechos.trim()) { this.funciones.mensaje('info', 'Elija el contrato, la causal y describa los hechos.'); return; }
    if (f.Alcance === 'PARCIAL' && !f.ParteResuelta.trim()) { this.funciones.mensaje('info', 'La resolución parcial debe precisar qué parte del contrato queda resuelta.'); return; }
    this.ejecutando = true;
    let idDoc: string | null = null;
    this.subir(this.documentoFile).pipe(
      switchMap((id) => { idDoc = id; return this.servicio.registrarProcedimiento({
        IdContrato: f.IdContrato, Causal: f.Causal, Alcance: f.Alcance, ParteResuelta: f.ParteResuelta.trim() || null, Hechos: f.Hechos.trim(), Documento: id }); }),
      switchMap((r: any) => r?.estado === 1 && idDoc
        ? this.registrar(r.IdExpediente, this.esProveedor ? TIPO_RES_SOLICITUD : TIPO_RES_INFORME_AU, idDoc, this.documentoFile?.name).pipe(map(() => r))
        : of(r))
    ).subscribe({
      next: (r: any) => {
        this.ejecutando = false;
        if (r?.estado !== 1) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo registrar.'); return; }
        this.funciones.mensaje('success', r.mensaje);
        this.nuevo = false;
        this.cargar();
        if (r.IdProcedimiento) { this.abrir({ IdProcedimiento: r.IdProcedimiento }); }
      },
      error: () => this.fallar()
    });
  }

  /* ------------------------------------------------------------------ detalle */

  abrir(fila: { IdProcedimiento: string }, pestana: Pestana = 'procedimiento'): void {
    this.servicio.obtenerProcedimiento(fila.IdProcedimiento).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo abrir el procedimiento.'); return; }
        this.seleccionado = r.Procedimiento;
        const p = this.seleccionado!;
        this.pestana = pestana;
        this.formPronunciamiento = { Pronunciamiento: 'FAVORABLE', Informe: '' };
        this.informeFile = null;
        this.formDecision = {
          Decision: p.RequiereApercibimiento ? 'APERCIBIR' : 'RESOLVER', Motivo: '',
          PlazoApercibimientoDias: p.PlazoApercibimientoMin, Alcance: p.Alcance, ParteResuelta: p.ParteResuelta || ''
        };
        this.formCarta = { NumeroCarta: this.cartaActualNumero(p) || '', MedioNotificacion: p.MedioNotificacion || 'NOTARIAL', RegistroPladicop: p.RegistroPladicop || '' };
        this.documentoCarta = idDocumentoSistema(this.cartaActualDocumento(p) || '');
        this.cartaFirmada = '';
        this.formRespuesta = { Respuesta: '' };
        this.respuestaFile = null;
        this.detalleManual = '';
        this.verTrazabilidad(p.IdExpediente, p.Codigo);
      },
      error: () => this.funciones.mensaje('error', 'No se pudo obtener el procedimiento.')
    });
  }

  abrirTrazabilidad(fila: { IdProcedimiento: string }): void { this.abrir(fila, 'trazabilidad'); }
  cerrarDetalle(): void { this.seleccionado = null; this.cerrarVisorPdf(); }

  private refrescar(): void {
    const id = this.seleccionado?.IdProcedimiento;
    const pestana = this.pestana;
    this.cargar();
    if (id) { this.abrir({ IdProcedimiento: id }, pestana); }
  }

  /* -------------------------------------------------------------- utilidades */

  /** Que carta corresponde al estado actual: la de apercibimiento, la de resolucion o la de respuesta. */
  get tipoCartaActual(): TipoCarta | null {
    const e = this.seleccionado?.CodigoEstado;
    if (e === 'RES_POR_FIRMA_APERCIBIMIENTO' || e === 'RES_APERCIBIDO') return 'APERCIBIMIENTO';
    if (e === 'RES_POR_RESOLVER' || e === 'RES_RESUELTO') return 'RESOLUCION';
    if (e === 'RES_DENEGADA') return 'RESPUESTA';
    return null;
  }

  private cartaActualNumero(p: ProcedimientoDetalle): string | null {
    return this.tipoCartaActualDe(p) === 'APERCIBIMIENTO' ? p.NumeroCartaApercibimiento : p.NumeroCarta;
  }

  private cartaActualDocumento(p: ProcedimientoDetalle): string | null {
    return this.tipoCartaActualDe(p) === 'APERCIBIMIENTO' ? p.CartaApercibimientoDocumento : p.CartaDocumento;
  }

  private tipoCartaActualDe(p: ProcedimientoDetalle): TipoCarta | null {
    const e = p.CodigoEstado;
    if (e === 'RES_POR_FIRMA_APERCIBIMIENTO' || e === 'RES_APERCIBIDO') return 'APERCIBIMIENTO';
    if (e === 'RES_POR_RESOLVER' || e === 'RES_RESUELTO') return 'RESOLUCION';
    if (e === 'RES_DENEGADA') return 'RESPUESTA';
    return null;
  }

  get tituloCarta(): string {
    const t = this.tipoCartaActual;
    return t === 'APERCIBIMIENTO' ? 'Carta de apercibimiento' : t === 'RESOLUCION' ? 'Carta de resolución' : 'Carta de respuesta';
  }

  /* La carta de respuesta (denegatoria) la emite la DEC sin firma digital;
     las de apercibimiento y resolucion las firma el jefe de Abastecimiento. */
  get puedeGenerarCarta(): boolean {
    const p = this.seleccionado;
    if (!p) return false;
    if (p.PuedeEmitirCarta) return true;
    return p.CodigoEstado === 'RES_DENEGADA' && this.codigoRol.startsWith('ABAST_') && !p.CartaDocumento;
  }

  get cartaSeFirma(): boolean { return this.tipoCartaActual === 'APERCIBIMIENTO' || this.tipoCartaActual === 'RESOLUCION'; }

  nombreCausal(codigo: string): string { return this.causales.find(c => c.codigo === codigo)?.nombre || codigo; }

  tonoEstado(codigo: string): string {
    if (codigo === 'RES_SUBSANADO') return 'success';
    if (codigo === 'RES_RESUELTO' || codigo === 'RES_APERCIBIDO') return 'warning';
    if (codigo === 'RES_DESESTIMADA' || codigo === 'RES_DENEGADA') return 'neutral';
    return 'info';
  }

  tonoPlazo(dias: number | null): string {
    if (dias === null || dias === undefined) return 'neutral';
    if (dias < 0) return 'danger';
    if (dias <= 2) return 'warning';
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

  onFile(event: Event, campo: 'documento' | 'informe' | 'respuesta'): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (campo === 'documento') this.documentoFile = file;
    if (campo === 'informe') this.informeFile = file;
    if (campo === 'respuesta') this.respuestaFile = file;
  }

  private subir(archivo: File | null): Observable<string | null> {
    if (!archivo) { return of(null); }
    return this.documentosSrv.subirArchivo(archivo, CARPETA_RESOLUCION).pipe(map((s: any) => s?.documento_sistema || null));
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

  /* ---------------------------------------------------- pronunciamiento AU */

  pronunciar(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    if (!this.formPronunciamiento.Informe.trim()) { this.funciones.mensaje('info', 'Registre el informe del área usuaria.'); return; }
    const p = this.seleccionado;
    this.ejecutando = true;
    this.subir(this.informeFile).pipe(
      switchMap((id) => this.registrar(p.IdExpediente, TIPO_RES_INFORME_AU, id, this.informeFile?.name).pipe(map(() => id))),
      switchMap((id) => this.servicio.pronunciarAu({
        IdExpediente: p.IdExpediente, Version: p.Version, Pronunciamiento: this.formPronunciamiento.Pronunciamiento,
        Informe: this.formPronunciamiento.Informe.trim(), InformeDocumento: id
      }))
    ).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
  }

  /** Etiqueta del pronunciamiento segun donde este el procedimiento. */
  get etiquetaFavorable(): string {
    return this.seleccionado?.CodigoEstado === 'RES_RESPUESTA_EN_EVALUACION' ? 'Subsanó el incumplimiento' : 'Favorable a la resolución';
  }
  get etiquetaDesfavorable(): string {
    return this.seleccionado?.CodigoEstado === 'RES_RESPUESTA_EN_EVALUACION' ? 'No subsanó: resolver' : 'Desfavorable: negar la solicitud';
  }

  /* -------------------------------------------------------------- decision DEC */

  decidir(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const p = this.seleccionado;
    const f = this.formDecision;
    if (!f.Motivo.trim()) { this.funciones.mensaje('info', 'Indique el motivo de la decisión.'); return; }
    if (f.Decision === 'APERCIBIR' && (!f.PlazoApercibimientoDias || f.PlazoApercibimientoDias < (p.PlazoApercibimientoMin || 1) || f.PlazoApercibimientoDias > (p.PlazoApercibimientoMax || 999))) {
      this.funciones.mensaje('info', `El plazo va de ${p.PlazoApercibimientoMin} a ${p.PlazoApercibimientoMax} días calendario.`);
      return;
    }
    if (f.Alcance === 'PARCIAL' && !f.ParteResuelta.trim()) { this.funciones.mensaje('info', 'La resolución parcial debe precisar qué parte queda resuelta.'); return; }
    const nombre = f.Decision === 'APERCIBIR' ? 'Requerir cumplimiento bajo apercibimiento' : f.Decision === 'RESOLVER' ? 'Resolver sin apercibimiento' : 'Desestimar';
    this.funciones.alertaRetorno('question', nombre, `${p.Codigo} · ${this.nombreCausal(p.Causal)}<br><br>${f.Motivo.trim()}`, true,
      (res: any) => {
        if (!res?.isConfirmed) { return; }
        this.ejecutando = true;
        this.servicio.decidirDec({
          IdExpediente: p.IdExpediente, Version: p.Version, Decision: f.Decision, Motivo: f.Motivo.trim(),
          PlazoApercibimientoDias: f.Decision === 'APERCIBIR' ? f.PlazoApercibimientoDias : null,
          Alcance: f.Decision === 'DESESTIMAR' ? null : f.Alcance, ParteResuelta: f.Alcance === 'PARCIAL' ? f.ParteResuelta.trim() : null
        }).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
      });
  }

  /* ------------------------------------------------------------------ cartas */

  get omitirFirma(): boolean { return this.firma.omitirDispositivo; }

  generarCarta(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const p = this.seleccionado;
    const tipo = this.tipoCartaActual;
    if (!tipo) { return; }
    const numero = this.formCarta.NumeroCarta.trim() || null;
    const definicion = tipo === 'APERCIBIMIENTO' ? construirCartaApercibimiento(p, numero, this.nombreActor)
                     : tipo === 'RESOLUCION' ? construirCartaResolucion(p, numero, this.nombreActor)
                     : construirCartaRespuestaNegativa(p, numero, this.nombreActor);
    const nombre = tipo === 'APERCIBIMIENTO' ? nombreArchivoCartaApercibimiento(p)
                 : tipo === 'RESOLUCION' ? nombreArchivoCartaResolucion(p) : nombreArchivoCartaRespuesta(p);
    const tipoDoc = tipo === 'APERCIBIMIENTO' ? TIPO_RES_CARTA_APERCIBIMIENTO : tipo === 'RESOLUCION' ? TIPO_RES_CARTA_RESOLUCION : TIPO_RES_CARTA_RESPUESTA;
    this.ejecutando = true;
    this.paso = 'Generando la carta…';
    from(this.documentosSrv.generarPdf(definicion)).pipe(
      switchMap((blob: Blob) => this.documentosSrv.subirArchivo(new File([blob], nombre, { type: 'application/pdf' }), CARPETA_RESOLUCION)),
      switchMap((sub: any) => this.registrar(p.IdExpediente, tipoDoc, sub.documento_sistema, nombre, p).pipe(map(() => sub.documento_sistema as string))),
      switchMap((id: string) => this.servicio.registrarCarta({
        IdExpediente: p.IdExpediente, TipoCarta: tipo, NumeroCarta: numero, CartaDocumento: id,
        MedioNotificacion: this.formCarta.MedioNotificacion || null, RegistroPladicop: this.formCarta.RegistroPladicop.trim() || null
      }).pipe(map(() => id)))
    ).subscribe({
      next: (id: string) => {
        this.ejecutando = false;
        this.paso = '';
        this.documentoCarta = idDocumentoSistema(id);
        this.cartaFirmada = '';
        this.abrirVisorPdf(this.documentoCarta, this.tituloCarta, this.cartaSeFirma && !!this.seleccionado?.PuedeEmitirCarta);
      },
      error: () => this.fallar()
    });
  }

  verCarta(): void {
    const id = this.cartaFirmada || this.documentoCarta;
    if (!id) { return; }
    this.abrirVisorPdf(id, this.tituloCarta, this.cartaSeFirma && !!this.seleccionado?.PuedeEmitirCarta);
  }

  firmarCartaDesdeVisor(): void {
    if (!this.seleccionado || !this.documentoCarta || this.ejecutando) { return; }
    const p = this.seleccionado;
    const tipoDoc = this.tipoCartaActual === 'APERCIBIMIENTO' ? TIPO_RES_CARTA_APERCIBIMIENTO : TIPO_RES_CARTA_RESOLUCION;
    this.ejecutando = true;
    this.paso = 'Firmando…';
    let firmado = false;
    this.firma.abrir({ documentoSistema: this.documentoCarta, subcarpeta: CARPETA_RESOLUCION, descripcion: this.tituloCarta }).pipe(
      switchMap((idFirmado: string) => { firmado = true; this.cartaFirmada = idFirmado; return this.servicio.firmarDocumento(p.IdExpediente, tipoDoc, { GeneradoDocumento: idFirmado }); })
    ).subscribe({
      next: (r: any) => {
        this.ejecutando = false; this.paso = '';
        if (r?.estado !== 1 && r?.codigo !== 51616) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo registrar la firma.'); return; }
        this.funciones.mensaje('success', 'Firma registrada. Confirme la acción para continuar.');
        this.abrirVisorPdf(this.cartaFirmada, `${this.tituloCarta} · firmada`, false);
      },
      error: (e: any) => { this.ejecutando = false; this.paso = ''; this.funciones.mensaje('error', typeof e === 'string' ? e : 'No fue posible comunicarse con el servicio.'); },
      complete: () => { if (!firmado) { this.ejecutando = false; this.paso = ''; this.funciones.mensaje('info', 'Proceso de firma digital cancelado.'); } }
    });
  }

  /* ---------------------------------------------------- respuesta proveedor */

  responder(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    if (!this.formRespuesta.Respuesta.trim()) { this.funciones.mensaje('info', 'Indique cómo cumplió la prestación o qué alega.'); return; }
    const p = this.seleccionado;
    this.ejecutando = true;
    this.subir(this.respuestaFile).pipe(
      switchMap((id) => this.registrar(p.IdExpediente, TIPO_RES_RESPUESTA, id, this.respuestaFile?.name).pipe(map(() => id))),
      switchMap((id) => this.servicio.ejecutarAccion({
        IdExpediente: p.IdExpediente, Version: p.Version, CodigoTransicion: 'RES_RESPONDER_APERCIBIMIENTO',
        Respuesta: this.formRespuesta.Respuesta.trim(), RespuestaDocumento: id
      }))
    ).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
  }

  /* ------------------------------------------------------------ transiciones */

  ejecutar(t: TransicionResolucion): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const p = this.seleccionado;
    const codigo = t.CodigoTransicion;

    if (codigo === 'RES_FIRMAR_APERCIBIMIENTO' || codigo === 'RES_FIRMAR_RESOLUCION') {
      if (!this.documentoCarta) { this.funciones.mensaje('info', `Genere la ${this.tituloCarta.toLowerCase()} antes de firmarla.`); return; }
      if (!this.omitirFirma && !this.cartaFirmada) { this.funciones.mensaje('info', 'Firme digitalmente la carta desde el visor antes de confirmar.'); return; }
      const tipoDoc = codigo === 'RES_FIRMAR_APERCIBIMIENTO' ? TIPO_RES_CARTA_APERCIBIMIENTO : TIPO_RES_CARTA_RESOLUCION;
      this.funciones.alertaRetorno('question', t.NombreAccion, `${p.Codigo}<br><br>Pasa a «${t.EstadoDestino}».`
          + (codigo === 'RES_FIRMAR_RESOLUCION' ? ' El contrato queda resuelto.' : ''), true,
        (res: any) => {
          if (!res?.isConfirmed) { return; }
          this.ejecutando = true;
          this.servicio.firmarDocumento(p.IdExpediente, tipoDoc, this.cartaFirmada ? { GeneradoDocumento: this.cartaFirmada } : {}).pipe(
            switchMap(() => this.servicio.ejecutarAccion({ IdExpediente: p.IdExpediente, Version: p.Version, CodigoTransicion: codigo }))
          ).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
        });
      return;
    }

    if (codigo === 'RES_OPINAR_FAVORABLE' || codigo === 'RES_EVALUAR_SUBSANADO') { this.formPronunciamiento.Pronunciamiento = 'FAVORABLE'; this.pronunciar(); return; }
    if (codigo === 'RES_OPINAR_DESFAVORABLE' || codigo === 'RES_EVALUAR_NO_SUBSANADO') { this.formPronunciamiento.Pronunciamiento = 'DESFAVORABLE'; this.pronunciar(); return; }
    if (codigo === 'RES_APERCIBIR') { this.formDecision.Decision = 'APERCIBIR'; this.decidir(); return; }
    if (codigo === 'RES_RESOLVER_DIRECTO') { this.formDecision.Decision = 'RESOLVER'; this.decidir(); return; }
    if (codigo === 'RES_DESESTIMAR') { this.formDecision.Decision = 'DESESTIMAR'; this.decidir(); return; }
    if (codigo === 'RES_RESPONDER_APERCIBIMIENTO') { this.responder(); return; }

    this.funciones.alertaRetorno('question', t.NombreAccion, `${p.Codigo} · ${this.nombreCausal(p.Causal)}<br><br>Pasa a «${t.EstadoDestino}».`, true,
      (res: any) => {
        if (!res?.isConfirmed) { return; }
        this.ejecutando = true;
        this.servicio.ejecutarAccion({ IdExpediente: p.IdExpediente, Version: p.Version, CodigoTransicion: codigo })
          .subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
      });
  }

  get transicionesDirectas(): TransicionResolucion[] {
    const conFormulario = new Set(['RES_OPINAR_FAVORABLE', 'RES_OPINAR_DESFAVORABLE', 'RES_EVALUAR_SUBSANADO', 'RES_EVALUAR_NO_SUBSANADO',
                                   'RES_APERCIBIR', 'RES_RESOLVER_DIRECTO', 'RES_DESESTIMAR', 'RES_RESPONDER_APERCIBIMIENTO']);
    return (this.seleccionado?.Transiciones || []).filter(t => !conFormulario.has(t.CodigoTransicion));
  }

  /* ------------------------------------------------------------- notificacion */

  notificarCorreo(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    const p = this.seleccionado;
    this.funciones.alertaRetorno('question', 'Notificar por correo', `Se enviará la carta a ${p.CorreoProveedor || 'el correo del proveedor'}.`, true,
      (res: any) => {
        if (!res?.isConfirmed) { return; }
        this.ejecutando = true;
        this.servicio.notificarCarta(p.IdExpediente).subscribe({ next: (r: any) => this.terminar(r), error: () => this.fallar() });
      });
  }

  notificarManual(): void {
    if (!this.seleccionado || this.ejecutando) { return; }
    if (!this.detalleManual.trim()) { this.funciones.mensaje('info', 'Indique el cargo notarial o el registro con que se notificó.'); return; }
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
    this.maestra.descargarArchivo(documentoSistema, CARPETA_RESOLUCION).subscribe({
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
