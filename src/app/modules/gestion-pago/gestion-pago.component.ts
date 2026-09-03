import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PagoService } from './services/pago.service';
import { SessionService } from '../../core/services/session.service';
import { DocumentoService } from '../../core/services/documento.service';
import { MaestraService } from '../../shared/services/maestra.service';
import { Funciones } from '../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../shared/funciones/archivo';
import {
  CARPETA_PAGO,
  ChecklistPago,
  ExpedientePagoBandeja,
  ExpedientePagoDetalle,
  OrdenPortalLocador,
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
    private maestra: MaestraService,
    private funciones: Funciones
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
      },
      error: () => this.funciones.mensaje('error', 'No se pudo obtener el expediente.')
    });
  }

  cerrarDetalle(): void {
    this.seleccionado = null;
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

  private firmarAnexo11(): void {
    if (!this.seleccionado) {
      return;
    }
    this.ejecutando = true;
    const det = this.seleccionado;
    const nombre = nombreArchivoAnexo11(det);
    this.documentos.generarPdf(construirAnexo11(det)).then(blob => {
      const archivo = new File([blob], nombre, { type: 'application/pdf' });
      this.documentos.subirArchivo(archivo, CARPETA_PAGO).pipe(
        switchMap((sub: any) => this.pago.registrarDocumento(
          det.IdExpediente, TIPO_ANEXO_11, sub.documento_sistema, nombre, det
        )),
        switchMap(() => this.pago.firmarDocumento(det.IdExpediente, TIPO_ANEXO_11)),
        switchMap(() => this.pago.marcarConformidadFirmada(det.IdExpediente, det.Version))
      ).subscribe({
        next: (r: any) => this.terminar(r),
        error: () => this.fallar()
      });
    }).catch(() => this.fallar());
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
