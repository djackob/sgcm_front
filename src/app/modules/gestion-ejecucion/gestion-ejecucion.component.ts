import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { EjecucionService } from './services/ejecucion.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentoService } from '../../core/services/documento.service';
import { MaestraService } from '../../shared/services/maestra.service';
import { Funciones } from '../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../shared/funciones/archivo';
import {
  CARPETA_EJECUCION,
  ContratoBandeja,
  ContratoDetalle,
  EntregaContrato,
  IncidenciaContrato,
  PersonaVerificadora,
  TIPO_ACTA_INCUMPLIMIENTO,
  TIPO_GUIA,
  TIPO_GUIA_SUSCRITA,
  TIPO_INFORME_INCIDENCIA,
  TIPO_PECOSA,
  TransicionEjecucion
} from './models/ejecucion.model';

type Pestana = 'contrato' | 'entregas' | 'entregables' | 'incidencias' | 'trazabilidad';
/* Que formulario esta abierto sobre una entrega. Cada accion que trae datos
   propios -guia, verificador, resultado, Pecosa- abre el suyo; las que no,
   piden confirmacion y van directo. */
type PanelEntrega = 'anunciar' | 'designar' | 'verificar' | 'pecosa' | null;

@Component({
  selector: 'app-gestion-ejecucion',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './gestion-ejecucion.component.html',
  styleUrl: './gestion-ejecucion.component.scss'
})
export class GestionEjecucionComponent implements OnInit {

  breadcrumb = ['Administración', 'Ejecución contractual'];
  codigoRol = '';
  esProveedor = false;

  /* La bandeja muestra todo lo de la unidad y marca con MeToca lo que le toca
     a este perfil; no hay check de «Solo mi bandeja» (mismo criterio que CMN,
     Requerimiento y Pagos). SoloVigentes oculta los contratos culminados. */
  filtro = { SoloMiBandeja: true, SoloVigentes: true, Texto: '', Limite: 50, Desplazamiento: 0 };
  cargando = false;
  total = 0;
  contratos: ContratoBandeja[] = [];

  seleccionado: ContratoDetalle | null = null;
  pestana: Pestana = 'contrato';
  ejecutando = false;

  /* Ficha del contrato, editable por el AU y la DEC. */
  formContrato = { LugarEntrega: '', DireccionEntrega: '', IdSupervisor: '' };
  supervisores: PersonaVerificadora[] = [];

  /* Entregas. */
  entregaActiva: EntregaContrato | null = null;
  panelEntrega: PanelEntrega = null;
  formAnuncio = { NumeroEntregable: null as number | null, Detalle: '', FechaPrevista: '', NumeroGuiaRemision: '' };
  guiaFile: File | null = null;
  verificadores: PersonaVerificadora[] = [];
  idVerificador = '';
  formVerificacion = { Resultado: 'CONFORME' as 'CONFORME' | 'OBSERVADO', Detalle: '' };
  guiaSuscritaFile: File | null = null;
  actaFile: File | null = null;
  formPecosa = { NumeroPecosa: '' };
  pecosaFile: File | null = null;

  /* Incidencias. */
  formIncidencia = { Tipo: 'INCIDENCIA' as IncidenciaContrato['Tipo'], Detalle: '', DocumentoSgd: '' };
  informeIncidenciaFile: File | null = null;
  incidenciaEnAtencion: IncidenciaContrato | null = null;
  respuestaIncidencia = '';

  /* Trazabilidad del contrato o de una entrega, segun lo que se haya abierto. */
  trazaTitulo = '';
  historial: any[] = [];
  observaciones: any[] = [];
  documentos: any[] = [];

  visorPdfUrl: SafeResourceUrl | null = null;
  visorPdfObjectUrl = '';
  visorPdfTitulo = '';

  constructor(
    private ejecucion: EjecucionService,
    private sesion: SessionService,
    private documentosSrv: DocumentoService,
    private maestra: MaestraService,
    private funciones: Funciones,
    private sanitizer: DomSanitizer,
    private router: Router
  ) { }

  /* Los flujos alternos del contrato -modificacion, ampliacion, resolucion-
     nacen desde aqui para que siempre queden atados a un contrato vigente. La
     pantalla de destino recibe el contrato y el tipo ya elegidos. */
  get puedeAbrirAlternos(): boolean {
    return !!this.seleccionado && !this.seleccionado.EsFinal && (this.esProveedor || this.codigoRol.startsWith('AREA_'));
  }

  irAModificacion(tipo: 'MODIFICACION' | 'AMPLIACION_PLAZO'): void {
    if (!this.seleccionado) { return; }
    this.router.navigate(['/gestion-modificacion'], { queryParams: { contrato: this.seleccionado.IdContrato, tipo } });
  }

  irAResolucion(): void {
    if (!this.seleccionado) { return; }
    this.router.navigate(['/gestion-resolucion'], { queryParams: { contrato: this.seleccionado.IdContrato } });
  }

  ngOnInit(): void {
    const perfil = this.sesion.getUsuario()?.detalle?.[0]?.perfil?.[0];
    this.codigoRol = perfil?.cod_perfil || '';
    this.esProveedor = this.codigoRol === 'PROVEEDOR';
    this.cargar();
  }

  /* ------------------------------------------------------------------ bandeja */

  get desde(): number {
    return this.total === 0 ? 0 : this.filtro.Desplazamiento + 1;
  }

  get hasta(): number {
    return Math.min(this.filtro.Desplazamiento + this.filtro.Limite, this.total);
  }

  cargar(): void {
    this.cargando = true;
    this.ejecucion.listarContrato(this.filtro).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No se pudo listar.');
          return;
        }
        this.contratos = r.Contratos || [];
        this.total = r.total || 0;
      },
      error: () => {
        this.cargando = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
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

  /* ------------------------------------------------------------------ detalle */

  abrir(fila: { IdContrato: string }, pestana: Pestana = 'contrato'): void {
    this.ejecucion.obtenerContrato(fila.IdContrato).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No se pudo abrir el contrato.');
          return;
        }
        this.seleccionado = r.Contrato;
        this.formContrato = {
          LugarEntrega: this.seleccionado?.LugarEntrega || '',
          DireccionEntrega: this.seleccionado?.DireccionEntrega || '',
          IdSupervisor: this.seleccionado?.IdSupervisor || ''
        };
        this.cerrarPanelEntrega();
        this.incidenciaEnAtencion = null;
        this.respuestaIncidencia = '';
        this.pestana = pestana;
        if (this.seleccionado?.PuedeEditarContrato) {
          this.cargarPersonasAu();
        }
        this.verTrazabilidad(this.seleccionado!.IdExpediente, this.seleccionado!.Codigo);
      },
      error: () => this.funciones.mensaje('error', 'No se pudo obtener el contrato.')
    });
  }

  abrirTrazabilidad(fila: { IdContrato: string }): void {
    this.abrir(fila, 'trazabilidad');
  }

  cerrarDetalle(): void {
    this.seleccionado = null;
    this.cerrarVisorPdf();
  }

  /** Vuelve a leer el contrato abierto y refresca la bandeja detras. */
  private refrescar(): void {
    const id = this.seleccionado?.IdContrato;
    const pestana = this.pestana;
    this.cargar();
    if (id) {
      this.abrir({ IdContrato: id }, pestana);
    }
  }

  /* Las personas del area usuaria del contrato sirven para dos combos: el
     supervisor (7.3.2) y el verificador que acompana a Almacen (7.3.6.3.a).
     Es la misma lista y se pide una vez. */
  private cargarPersonasAu(): void {
    if (!this.seleccionado) {
      return;
    }
    this.ejecucion.listarVerificadorDisponible(this.seleccionado.IdContrato).subscribe({
      next: (r: any) => {
        const personas = r?.estado === 1 ? (r.Personas || []) : [];
        this.supervisores = personas;
        this.verificadores = personas;
      },
      error: () => { }
    });
  }

  /* --------------------------------------------------------------- utilidades */

  tonoEstado(codigoEstado: string): string {
    if (codigoEstado === 'EJE_CULMINADO' || codigoEstado === 'EJE_ENT_ENTREGADA_AU'
        || codigoEstado === 'EJE_ENT_GUIA_REGISTRADA') return 'success';
    if (codigoEstado === 'EJE_ENT_OBSERVADA' || codigoEstado === 'EJE_ENT_RETIRADA') return 'warning';
    if (codigoEstado === 'EJE_VIGENTE') return 'info';
    return 'neutral';
  }

  /* El plazo se pinta por lo que queda, no por el estado: vencido en rojo,
     por vencer (7 dias o menos) en ambar. */
  tonoPlazo(dias: number | null): string {
    if (dias === null || dias === undefined) return 'neutral';
    if (dias < 0) return 'danger';
    if (dias <= 7) return 'warning';
    return 'success';
  }

  textoPlazo(dias: number | null): string {
    if (dias === null || dias === undefined) return 'Cerrado';
    if (dias < 0) return `Vencido hace ${-dias} d`;
    if (dias === 0) return 'Vence hoy';
    return `${dias} d`;
  }

  lugar(codigo: string | null | undefined): string {
    if (codigo === 'SEDE_CENTRAL') return 'Sede Central (Almacén)';
    if (codigo === 'SEDE_DESCONCENTRADA') return 'Sede desconcentrada';
    return '—';
  }

  monto(valor: number | null | undefined): string {
    return Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* Las columnas `date` llegan como "2026-09-15" y `new Date` las toma como
     medianoche UTC: en Lima eso es el dia anterior. Se parsean como fecha
     local; las `datetime` traen hora y no tienen el problema. */
  fecha(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    const d = soloFecha
      ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
      : new Date(valor);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-PE');
  }

  get conformes(): number {
    return (this.seleccionado?.Entregables || []).filter(x => x.ConConformidad).length;
  }

  get esBien(): boolean {
    return this.seleccionado?.TipoPrestacion === 'BIEN';
  }

  get entregasPendientesDeMi(): number {
    return (this.seleccionado?.Entregas || []).filter(e => e.MeToca).length;
  }

  get incidenciasAbiertas(): number {
    return (this.seleccionado?.Incidencias || []).filter(i => i.Estado === 'COMUNICADA').length;
  }

  private terminar(respuesta: any): void {
    this.ejecutando = false;
    if (respuesta?.estado !== 1) {
      this.funciones.mensaje('error', respuesta?.mensaje || 'No se pudo ejecutar la acción.');
      return;
    }
    this.funciones.mensaje('success', respuesta.mensaje || 'Se registró la acción.');
    this.refrescar();
  }

  private fallar(): void {
    this.ejecutando = false;
    this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
  }

  /** Sube un archivo si lo hay; si no, devuelve null sin ir al servidor. */
  private subir(archivo: File | null): Observable<string | null> {
    if (!archivo) {
      return of(null);
    }
    return this.documentosSrv.subirArchivo(archivo, CARPETA_EJECUCION)
      .pipe(map((s: any) => s?.documento_sistema || null));
  }

  /** Registra el archivo en el expediente para que aparezca en su lista de documentos. */
  private registrar(idExpediente: string, tipo: string, id: string | null, nombre: string | undefined): Observable<any> {
    if (!id) {
      return of({ estado: 1 });
    }
    return this.ejecucion.registrarDocumento(idExpediente, tipo, id, nombre || tipo);
  }

  /* ----------------------------------------------------------------- contrato */

  guardarContrato(): void {
    if (!this.seleccionado || this.ejecutando) {
      return;
    }
    this.ejecutando = true;
    this.ejecucion.actualizarContrato({
      IdContrato: this.seleccionado.IdContrato,
      LugarEntrega: this.formContrato.LugarEntrega || null,
      DireccionEntrega: this.formContrato.DireccionEntrega || null,
      IdSupervisor: this.formContrato.IdSupervisor || null
    }).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  ejecutarContrato(t: TransicionEjecucion): void {
    if (!this.seleccionado || this.ejecutando) {
      return;
    }
    const det = this.seleccionado;
    this.funciones.alertaRetorno('question', t.NombreAccion,
      `${det.Codigo} · ${det.Denominacion}<br><br>El contrato pasa a «${t.EstadoDestino}».`, true,
      (resultado: any) => {
        if (!resultado?.isConfirmed) {
          return;
        }
        this.ejecutando = true;
        if (t.CodigoTransicion === 'EJE_CULMINAR') {
          this.ejecucion.culminarContrato(det.IdExpediente, det.Version).subscribe({
            next: (r: any) => this.terminar(r),
            error: () => this.fallar()
          });
          return;
        }
        this.ejecutando = false;
      });
  }

  /* ----------------------------------------------------------------- entregas */

  abrirAnuncio(): void {
    this.entregaActiva = null;
    this.panelEntrega = 'anunciar';
    const hoy = new Date();
    this.formAnuncio = {
      NumeroEntregable: this.siguienteEntregableSugerido(),
      Detalle: '',
      FechaPrevista: hoy.toISOString().substring(0, 10),
      NumeroGuiaRemision: ''
    };
    this.guiaFile = null;
  }

  /* Se propone el primer entregable del cronograma que todavia no tiene una
     entrega anunciada; el proveedor puede cambiarlo. */
  private siguienteEntregableSugerido(): number | null {
    const usados = new Set((this.seleccionado?.Entregas || [])
      .filter(e => e.CodigoEstado !== 'EJE_ENT_RETIRADA')
      .map(e => e.NumeroEntregable));
    const libre = (this.seleccionado?.Entregables || []).find(x => !usados.has(x.NumeroEntregable));
    return libre?.NumeroEntregable ?? null;
  }

  anunciarEntrega(): void {
    if (!this.seleccionado || this.ejecutando) {
      return;
    }
    if (!this.formAnuncio.Detalle.trim() || !this.formAnuncio.NumeroGuiaRemision.trim()) {
      this.funciones.mensaje('info', 'Indique los bienes que entrega y el número de la guía de remisión.');
      return;
    }
    const det = this.seleccionado;
    this.ejecutando = true;
    let idGuia: string | null = null;
    this.subir(this.guiaFile).pipe(
      switchMap((id) => {
        idGuia = id;
        return this.ejecucion.anunciarEntrega({
          IdContrato: det.IdContrato,
          NumeroEntregable: this.formAnuncio.NumeroEntregable,
          Detalle: this.formAnuncio.Detalle.trim(),
          FechaPrevista: this.formAnuncio.FechaPrevista,
          NumeroGuiaRemision: this.formAnuncio.NumeroGuiaRemision.trim(),
          GuiaDocumento: id
        });
      }),
      /* El expediente de la entrega recien nace: la guia se registra en el
         despues de tener su id, para que salga en su lista de documentos. */
      switchMap((r: any) => r?.estado === 1 && idGuia
        ? this.registrar(r.IdExpediente, TIPO_GUIA, idGuia, this.guiaFile?.name).pipe(map(() => r))
        : of(r))
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  /** Punto de entrada de todas las acciones de una entrega. */
  accionEntrega(entrega: EntregaContrato, t: TransicionEjecucion): void {
    if (this.ejecutando) {
      return;
    }
    this.entregaActiva = entrega;
    const codigo = t.CodigoTransicion;

    if (codigo === 'EJE_ENT_DESIGNAR_VERIFICADOR') {
      this.panelEntrega = 'designar';
      this.idVerificador = '';
      if (!this.verificadores.length) {
        this.cargarPersonasAu();
      }
      return;
    }
    if (codigo.startsWith('EJE_ENT_RECEPCIONAR') || codigo.startsWith('EJE_ENT_OBSERVAR')) {
      /* Las dos transiciones abren el mismo formulario con el resultado ya
         elegido: recepcionar es CONFORME, observar es OBSERVADO. */
      this.panelEntrega = 'verificar';
      this.formVerificacion = {
        Resultado: codigo.startsWith('EJE_ENT_RECEPCIONAR') ? 'CONFORME' : 'OBSERVADO',
        Detalle: ''
      };
      this.guiaSuscritaFile = null;
      this.actaFile = null;
      return;
    }
    if (codigo === 'EJE_ENT_ENTREGAR_AU') {
      this.panelEntrega = 'pecosa';
      this.formPecosa = { NumeroPecosa: '' };
      this.pecosaFile = null;
      return;
    }

    /* Autorizar ingreso, registrar la guia en Almacen, confirmar el retiro:
       no traen datos, pero cambian de estado y de unidad (ESTANDARES 4.9). */
    this.funciones.alertaRetorno('question', t.NombreAccion,
      `Entrega ${entrega.NumeroEntrega} · guía ${entrega.NumeroGuiaRemision}<br><br>Pasa a «${t.EstadoDestino}».`, true,
      (resultado: any) => {
        if (!resultado?.isConfirmed) {
          return;
        }
        this.ejecutando = true;
        const llamada = codigo.startsWith('EJE_ENT_AUTORIZAR_INGRESO')
          ? this.ejecucion.autorizarIngreso(entrega.IdExpediente, entrega.Version)
          : this.ejecucion.ejecutarAccionEntrega(entrega.IdExpediente, entrega.Version, codigo);
        llamada.subscribe({
          next: (r: any) => this.terminar(r),
          error: () => this.fallar()
        });
      });
  }

  designarVerificador(): void {
    if (!this.entregaActiva || this.ejecutando) {
      return;
    }
    if (!this.idVerificador) {
      this.funciones.mensaje('info', 'Elija al responsable de verificación.');
      return;
    }
    this.ejecutando = true;
    this.ejecucion.designarVerificador(this.entregaActiva.IdExpediente, this.entregaActiva.Version, this.idVerificador)
      .subscribe({
        next: (r: any) => this.terminar(r),
        error: () => this.fallar()
      });
  }

  verificarEntrega(): void {
    if (!this.entregaActiva || this.ejecutando) {
      return;
    }
    const conforme = this.formVerificacion.Resultado === 'CONFORME';
    if (conforme && !this.guiaSuscritaFile) {
      this.funciones.mensaje('info', 'Adjunte la guía de remisión suscrita.');
      return;
    }
    if (!conforme && (!this.formVerificacion.Detalle.trim() || !this.actaFile)) {
      this.funciones.mensaje('info', 'Detalle el incumplimiento y adjunte el acta suscrita.');
      return;
    }
    const entrega = this.entregaActiva;
    const archivo = conforme ? this.guiaSuscritaFile : this.actaFile;
    const tipo = conforme ? TIPO_GUIA_SUSCRITA : TIPO_ACTA_INCUMPLIMIENTO;
    this.ejecutando = true;
    this.subir(archivo).pipe(
      switchMap((id) => this.registrar(entrega.IdExpediente, tipo, id, archivo?.name).pipe(map(() => id))),
      switchMap((id) => this.ejecucion.verificarEntrega({
        IdExpediente: entrega.IdExpediente,
        Version: entrega.Version,
        Resultado: this.formVerificacion.Resultado,
        Detalle: this.formVerificacion.Detalle.trim() || null,
        GuiaSuscritaDocumento: conforme ? id : null,
        ActaIncumplimientoDocumento: conforme ? null : id
      }))
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  entregarBienAu(): void {
    if (!this.entregaActiva || this.ejecutando) {
      return;
    }
    if (!this.formPecosa.NumeroPecosa.trim()) {
      this.funciones.mensaje('info', 'Indique el número de la Pecosa.');
      return;
    }
    const entrega = this.entregaActiva;
    this.ejecutando = true;
    this.subir(this.pecosaFile).pipe(
      switchMap((id) => this.registrar(entrega.IdExpediente, TIPO_PECOSA, id, this.pecosaFile?.name).pipe(map(() => id))),
      switchMap((id) => this.ejecucion.entregarBienAu({
        IdExpediente: entrega.IdExpediente,
        Version: entrega.Version,
        NumeroPecosa: this.formPecosa.NumeroPecosa.trim(),
        PecosaDocumento: id
      }))
    ).subscribe({
      next: (r: any) => this.terminar(r),
      error: () => this.fallar()
    });
  }

  cerrarPanelEntrega(): void {
    this.panelEntrega = null;
    this.entregaActiva = null;
  }

  onFile(event: Event, campo: 'guia' | 'guiaSuscrita' | 'acta' | 'pecosa' | 'informe'): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (campo === 'guia') this.guiaFile = file;
    if (campo === 'guiaSuscrita') this.guiaSuscritaFile = file;
    if (campo === 'acta') this.actaFile = file;
    if (campo === 'pecosa') this.pecosaFile = file;
    if (campo === 'informe') this.informeIncidenciaFile = file;
  }

  /* -------------------------------------------------------------- incidencias */

  registrarIncidencia(): void {
    if (!this.seleccionado || this.ejecutando) {
      return;
    }
    if (!this.formIncidencia.Detalle.trim()) {
      this.funciones.mensaje('info', 'Detalle las circunstancias detectadas.');
      return;
    }
    const det = this.seleccionado;
    this.ejecutando = true;
    this.subir(this.informeIncidenciaFile).pipe(
      switchMap((id) => this.registrar(det.IdExpediente, TIPO_INFORME_INCIDENCIA, id, this.informeIncidenciaFile?.name).pipe(map(() => id))),
      switchMap((id) => this.ejecucion.registrarIncidencia({
        IdContrato: det.IdContrato,
        Tipo: this.formIncidencia.Tipo,
        Detalle: this.formIncidencia.Detalle.trim(),
        DocumentoSgd: this.formIncidencia.DocumentoSgd.trim() || null,
        InformeDocumento: id
      }))
    ).subscribe({
      next: (r: any) => {
        if (r?.estado === 1) {
          this.formIncidencia = { Tipo: 'INCIDENCIA', Detalle: '', DocumentoSgd: '' };
          this.informeIncidenciaFile = null;
        }
        this.terminar(r);
      },
      error: () => this.fallar()
    });
  }

  atender(incidencia: IncidenciaContrato): void {
    this.incidenciaEnAtencion = incidencia;
    this.respuestaIncidencia = '';
  }

  atenderIncidencia(): void {
    if (!this.incidenciaEnAtencion || this.ejecutando) {
      return;
    }
    if (!this.respuestaIncidencia.trim()) {
      this.funciones.mensaje('info', 'Indique la atención dada a la incidencia.');
      return;
    }
    this.ejecutando = true;
    this.ejecucion.atenderIncidencia(this.incidenciaEnAtencion.IdIncidencia, this.respuestaIncidencia.trim()).subscribe({
      next: (r: any) => {
        this.incidenciaEnAtencion = null;
        this.terminar(r);
      },
      error: () => this.fallar()
    });
  }

  tipoIncidencia(tipo: string): string {
    if (tipo === 'INCUMPLIMIENTO') return 'Incumplimiento';
    if (tipo === 'RIESGO') return 'Riesgo';
    return 'Incidencia';
  }

  /* ------------------------------------------------------------- trazabilidad */

  verTrazabilidad(idExpediente: string, titulo: string): void {
    this.trazaTitulo = titulo;
    this.historial = [];
    this.observaciones = [];
    this.documentos = [];
    this.ejecucion.obtenerTrazabilidad(idExpediente).subscribe({
      next: (r: any) => {
        if (r?.estado !== 1) {
          return;
        }
        this.historial = r.Historial || [];
        this.observaciones = r.Observaciones || [];
      },
      error: () => { }
    });
    this.ejecucion.listarDocumento(idExpediente).subscribe({
      next: (r: any) => this.documentos = r?.Documentos || r?.documentos || [],
      error: () => { }
    });
  }

  verTrazabilidadEntrega(entrega: EntregaContrato): void {
    this.verTrazabilidad(entrega.IdExpediente, `${entrega.Codigo} · entrega ${entrega.NumeroEntrega}`);
    this.pestana = 'trazabilidad';
  }

  /* -------------------------------------------------------------------- visor */

  verArchivo(id: string | null | undefined, titulo: string): void {
    const doc = idDocumentoSistema(id || '');
    if (!doc) {
      this.funciones.mensaje('info', 'Este documento no tiene archivo en el file server.');
      return;
    }
    this.maestra.descargarArchivo(doc, CARPETA_EJECUCION).subscribe({
      next: (blob: Blob) => {
        this.cerrarVisorPdf();
        this.visorPdfTitulo = titulo;
        this.visorPdfObjectUrl = URL.createObjectURL(
          blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
        );
        this.visorPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorPdfObjectUrl);
      },
      error: () => this.funciones.mensaje('error', `No fue posible abrir el documento (${doc}).`)
    });
  }

  verDocumento(doc: any): void {
    this.verArchivo(doc?.GeneradoDocumento, doc?.Nombre || doc?.CodigoTipoDocumento);
  }

  cerrarVisorPdf(): void {
    if (this.visorPdfObjectUrl) {
      URL.revokeObjectURL(this.visorPdfObjectUrl);
    }
    this.visorPdfObjectUrl = '';
    this.visorPdfUrl = null;
    this.visorPdfTitulo = '';
  }
}
