import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { RequerimientoBandeja, RequerimientoDetalle } from '../../models/requerimiento.model';
import {
  CARPETA_MEMO_CCP,
  TIPO_CCP,
  documentoLocador,
  montoTotalLocacion,
  nombreCompletoLocador,
  pedidoExtra,
  pedidoPrincipal,
  proveedorPrincipal
} from '../../documentos/filtro-idoneidad.util';
import {
  ArchivoCcpCarga,
  ccpDesdeFormulario,
  fechaSolicitudCcpTexto,
  formularioCcpVacio,
  metaClasificadorTexto,
  montoContratoAnexo5,
  nombreSugeridoCcp,
  requierePrevisionPresupuestal,
  validarFormularioCcp
} from '../../documentos/ccp-carga.util';

export interface CcpRegistradaEvento {
  fila: RequerimientoBandeja;
  ccp: Record<string, unknown>;
}

type ZonaCarga = 'ccp' | 'memoUp' | 'prevision';

@Component({
  selector: 'app-modal-cargar-ccp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-cargar-ccp.component.html',
  styleUrl: './modal-cargar-ccp.component.scss'
})
export class ModalCargarCcpComponent {

  @Output() completado = new EventEmitter<void>();
  @Output() ccpRegistrada = new EventEmitter<CcpRegistradaEvento>();

  /** Si el expediente ya está en CCP cargada pero sin datos, solo guarda la CCP. */
  modoCompletar = false;

  abierto = false;
  cargando = false;
  procesando = false;
  paso = '';
  subiendo: ZonaCarga | null = null;
  arrastrando: ZonaCarga | null = null;

  fila: RequerimientoBandeja | null = null;
  detalle: RequerimientoDetalle | null = null;
  formulario = formularioCcpVacio();

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private maestraService: MaestraService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja, opciones?: { completarCcp?: boolean }): void {
    this.fila = fila;
    this.modoCompletar = !!opciones?.completarCcp;
    this.detalle = null;
    this.formulario = formularioCcpVacio();
    this.paso = '';
    this.abierto = true;
    this.cargando = true;

    this.requerimientoService.obtenerRequerimiento(fila.IdRequerimiento).subscribe({
      next: (detalle: any) => {
        this.cargando = false;
        if (detalle?.estado === 0) {
          this.abierto = false;
          this.funciones.mensaje('error', detalle?.mensaje || 'No fue posible cargar el expediente.');
          return;
        }
        this.detalle = detalle;
        this.formulario = formularioCcpVacio(montoContratoAnexo5(detalle));
        this.aplicarCcpExistente(detalle);
      },
      error: () => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible cargar los datos para registrar la CCP.');
      }
    });
  }

  cerrar(): void {
    if (this.procesando) {
      return;
    }
    this.abierto = false;
  }

  get proveedor() {
    return proveedorPrincipal(this.detalle);
  }

  get pedido() {
    return pedidoPrincipal(this.detalle);
  }

  get montoPropuesta(): number {
    return montoContratoAnexo5(this.detalle);
  }

  get nombreLocador(): string {
    return nombreCompletoLocador(this.proveedor);
  }

  get documentoLocadorTexto(): string {
    return documentoLocador(this.proveedor);
  }

  get metaClasificador(): string {
    return metaClasificadorTexto(this.detalle);
  }

  get fechaSolicitudCcp(): string {
    return fechaSolicitudCcpTexto(this.detalle);
  }

  get exigePrevision(): boolean {
    return requierePrevisionPresupuestal(this.detalle);
  }

  get montoNoCoincide(): boolean {
    return this.formulario.MontoCertificado != null
      && Math.abs(this.formulario.MontoCertificado - this.montoPropuesta) > 0.01;
  }

  get etiquetaBotonPrincipal(): string {
    return this.modoCompletar
      ? 'Guardar CCP y continuar'
      : 'Registrar CCP y continuar';
  }

  get puedeRegistrar(): boolean {
    return !this.procesando && !this.cargando && !!this.detalle;
  }

  urlDescarga(archivo: ArchivoCcpCarga | null): string {
    if (!archivo?.documentoSistema) {
      return '';
    }
    return this.maestraService.urlDescarga(archivo.documentoSistema, CARPETA_MEMO_CCP);
  }

  examinarArchivo(zona: ZonaCarga, input: HTMLInputElement): void {
    input.click();
  }

  onArchivoSeleccionado(zona: ZonaCarga, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) {
      this.subirPdf(zona, archivo);
    }
  }

  onDragOver(zona: ZonaCarga, event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = zona;
  }

  onDragLeave(zona: ZonaCarga, event: DragEvent): void {
    event.preventDefault();
    if (this.arrastrando === zona) {
      this.arrastrando = null;
    }
  }

  onDrop(zona: ZonaCarga, event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = null;
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo) {
      this.subirPdf(zona, archivo);
    }
  }

  quitarArchivo(zona: ZonaCarga): void {
    if (this.procesando) {
      return;
    }
    if (zona === 'ccp') {
      this.formulario.archivoCcp = null;
    } else if (zona === 'memoUp') {
      this.formulario.archivoMemoUp = null;
    } else {
      this.formulario.archivoPrevision = null;
    }
  }

  registrarYGenerarOrden(): void {
    if (!this.fila || !this.detalle || this.procesando) {
      return;
    }

    const error = validarFormularioCcp(this.formulario, this.detalle);
    if (error) {
      this.funciones.mensaje('info', error);
      return;
    }

    this.procesando = true;
    this.paso = 'Registrando la certificación presupuestaria…';

    const payload = this.armarPayloadCcp();
    const ccpSnapshot = ccpDesdeFormulario(this.formulario);
    const yaEnEstadoCargada = this.detalle?.CodigoEstado === 'REQ_CCP_CARGADA';

    this.requerimientoService.registrarCcp(this.fila.IdRequerimiento, payload).pipe(
      switchMap((respuesta: any) => {
        if (respuesta?.estado !== 1) {
          throw new Error(respuesta?.mensaje || 'No se registró la CCP.');
        }
        if (yaEnEstadoCargada || this.modoCompletar) {
          return this.requerimientoService.obtenerRequerimiento(this.fila!.IdRequerimiento);
        }
        this.paso = 'Actualizando el estado del expediente…';
        return this.requerimientoService.ejecutarTransicion(
          this.fila!.IdExpediente,
          'REQ_REGISTRAR_CCP',
          this.detalle!.Version ?? this.fila!.Version
        ).pipe(
          switchMap((transicionCcp: any) => {
            if (transicionCcp?.estado !== 1) {
              throw new Error(transicionCcp?.mensaje || 'No fue posible registrar la CCP en el flujo.');
            }
            return this.requerimientoService.obtenerRequerimiento(this.fila!.IdRequerimiento);
          })
        );
      })
    ).subscribe({
      next: (detalleActualizado: any) => {
        this.procesando = false;
        this.paso = '';
        this.funciones.mensaje('success', 'CCP registrada. Revise y genere la orden de servicio.');
        const filaActualizada: RequerimientoBandeja = {
          ...this.fila!,
          Version: detalleActualizado?.Version ?? this.fila!.Version,
          CodigoEstado: detalleActualizado?.CodigoEstado ?? this.fila!.CodigoEstado
        };
        this.abierto = false;
        this.completado.emit();
        this.ccpRegistrada.emit({ fila: filaActualizada, ccp: ccpSnapshot });
      },
      error: (err) => {
        this.procesando = false;
        this.paso = '';
        this.funciones.mensaje(
          'error',
          err?.message || err?.error?.mensaje || err?.mensaje || 'No fue posible completar el registro.'
        );
      }
    });
  }

  private aplicarCcpExistente(detalle: RequerimientoDetalle | any): void {
    const ccp = detalle?.Ccp;
    if (!ccp) {
      return;
    }
    this.formulario.NumeroCcp = ccp.NumeroCcp || '';
    this.formulario.NumeroExpedienteSiaf = ccp.NumeroExpedienteSiaf || '';
    this.formulario.MontoCertificado = ccp.MontoCertificado != null
      ? Number(ccp.MontoCertificado)
      : montoContratoAnexo5(detalle);
    this.formulario.FechaEmision = (ccp.FechaEmision || '').substring(0, 10)
      || this.formulario.FechaEmision;
    this.formulario.Observacion = ccp.Observacion || '';
    if (ccp.GeneradoDocumentoCcp) {
      this.formulario.archivoCcp = {
        documentoSistema: idDocumentoSistema(ccp.GeneradoDocumentoCcp) || ccp.GeneradoDocumentoCcp,
        nombreOriginal: ccp.NombreDocumentoCcp || nombreSugeridoCcp(ccp.NumeroCcp)
      };
    }
    if (ccp.GeneradoDocumentoMemoUp) {
      this.formulario.archivoMemoUp = {
        documentoSistema: idDocumentoSistema(ccp.GeneradoDocumentoMemoUp) || ccp.GeneradoDocumentoMemoUp,
        nombreOriginal: ccp.NombreDocumentoMemoUp || 'Memorando UP.pdf'
      };
    }
    if (ccp.GeneradoDocumentoPrevision) {
      this.formulario.archivoPrevision = {
        documentoSistema: idDocumentoSistema(ccp.GeneradoDocumentoPrevision) || ccp.GeneradoDocumentoPrevision,
        nombreOriginal: ccp.NombreDocumentoPrevision || 'Prevision presupuestal.pdf'
      };
    }
  }

  private armarPayloadCcp(): Record<string, unknown> {
    return {
      NumeroCcp: this.formulario.NumeroCcp.trim(),
      NumeroExpedienteSiaf: this.formulario.NumeroExpedienteSiaf.trim(),
      MontoCertificado: this.formulario.MontoCertificado,
      FechaEmision: this.formulario.FechaEmision,
      Observacion: this.formulario.Observacion.trim() || null,
      GeneradoDocumentoCcp: this.formulario.archivoCcp?.documentoSistema,
      NombreDocumentoCcp: this.formulario.archivoCcp?.nombreOriginal,
      GeneradoDocumentoMemoUp: this.formulario.archivoMemoUp?.documentoSistema,
      NombreDocumentoMemoUp: this.formulario.archivoMemoUp?.nombreOriginal,
      GeneradoDocumentoPrevision: this.formulario.archivoPrevision?.documentoSistema,
      NombreDocumentoPrevision: this.formulario.archivoPrevision?.nombreOriginal,
      ValidarCompleto: 1
    };
  }

  private subirPdf(zona: ZonaCarga, archivo: File): void {
    if (!this.fila || !this.detalle || this.procesando) {
      return;
    }
    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
      this.funciones.mensaje('info', 'El archivo debe ser PDF.');
      return;
    }

    this.subiendo = zona;
    this.documentoService.subirArchivo(archivo, CARPETA_MEMO_CCP).pipe(
      switchMap((respuesta: any) => {
        const documentoSistema = idDocumentoSistema(respuesta?.documento_sistema);
        if (!documentoSistema) {
          throw new Error('No se obtuvo el identificador del PDF.');
        }
        const cargado = { documentoSistema, nombreOriginal: archivo.name };
        if (zona !== 'ccp') {
          return of(cargado);
        }
        return this.requerimientoService.registrarDocumento(
          this.fila!.IdExpediente,
          TIPO_CCP,
          documentoSistema,
          archivo.name,
          { Zona: zona, NumeroCcp: this.formulario.NumeroCcp }
        ).pipe(
          switchMap((alta: any) => {
            if (alta?.estado !== 1) {
              throw new Error(alta?.mensaje || 'No se registró el documento en el expediente.');
            }
            return of(cargado);
          })
        );
      })
    ).subscribe({
      next: (cargado) => {
        this.subiendo = null;
        const ref: ArchivoCcpCarga = cargado;
        if (zona === 'ccp') {
          this.formulario.archivoCcp = ref;
        } else if (zona === 'memoUp') {
          this.formulario.archivoMemoUp = ref;
        } else {
          this.formulario.archivoPrevision = ref;
        }
      },
      error: (err) => {
        this.subiendo = null;
        this.funciones.mensaje('error', err?.message || 'No fue posible subir el archivo.');
      }
    });
  }
}
