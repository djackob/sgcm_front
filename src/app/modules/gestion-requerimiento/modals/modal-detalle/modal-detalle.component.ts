import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { RequerimientoService } from '../../services/requerimiento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { esPdfDelFileServer, idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { CARPETA_ANEXO_5 } from '../../documentos/anexo5.pdfmake';
import { TIPO_ANEXO_3 } from '../../documentos/anexo3.pdfmake';
import {
  DOCUMENTO_TECNICO,
  HistorialRequerimiento,
  RequerimientoBandeja,
  RequerimientoDetalle
} from '../../models/requerimiento.model';

/**
 * Documento del expediente, tal como lo devuelve sigcm.paListarDocumento.
 *
 * La rutina no devuelve quién firmó, sólo cuándo: el firmante está en la
 * trazabilidad, que esta misma ventana ya muestra. Duplicarlo aquí obligaría a
 * cambiar la rutina para no ganar nada.
 */
interface DocumentoExpediente {
  IdDocumento: string;
  CodigoTipoDocumento: string;
  Numero: string;
  TipoDocumento: string;
  Version: number;
  Estado: string;
  GeneradoDocumento: string | null;
  NombreDocumento: string | null;
  FirmadoEn: string | null;
  PuedeFirmarEsteRol: boolean;
}

/**
 * Visor del requerimiento (REQ-11).
 *
 * Es de sólo lectura por definición: el requerimiento se edita en el formulario
 * de registro, y sólo mientras está en borrador o durante una subsanación
 * recepcionada. Fuera de esas etapas ésta es la única forma de verlo, y por eso
 * muestra todo —cabecera, pedidos, ítems, documentos e historial— sin ofrecer
 * ninguna acción del flujo: las acciones viven en la bandeja, donde el motor
 * dijo cuáles corresponden.
 *
 * La única salida hacia la edición es el botón «Editar», y aparece porque la
 * bandeja ya preguntó al motor si este actor puede abrir la subsanación.
 */
@Component({
  selector: 'app-modal-detalle-requerimiento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-detalle.component.html',
  styleUrl: './modal-detalle.component.scss',
})
export class ModalDetalleRequerimientoComponent {

  @Output() editar = new EventEmitter<RequerimientoBandeja>();
  @Output() elaborarAnexo3 = new EventEmitter<string>();

  abierto = false;
  cargando = false;

  /** La fila de la bandeja, para el encabezado mientras carga el detalle. */
  fila: RequerimientoBandeja | null = null;
  detalle: RequerimientoDetalle | null = null;
  historial: HistorialRequerimiento[] = [];
  documentos: DocumentoExpediente[] = [];

  puedeEditar = false;

  constructor(
    private requerimientoService: RequerimientoService,
    private maestraService: MaestraService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja, opciones: { puedeEditar: boolean }): void {
    this.fila = fila;
    this.detalle = null;
    this.historial = [];
    this.documentos = [];
    this.puedeEditar = opciones.puedeEditar;
    this.abierto = true;
    this.cargando = true;

    /* Las tres consultas son independientes y se piden juntas: el detalle es del
       módulo, el historial y los documentos son del motor. Que falle una no
       debe dejar la ventana vacía, por eso cada una lleva su catchError. */
    forkJoin({
      detalle: this.requerimientoService.obtenerRequerimiento(fila.IdRequerimiento).pipe(
        catchError(() => of(null))
      ),
      trazabilidad: this.requerimientoService.obtenerTrazabilidad(fila.IdExpediente).pipe(
        catchError(() => of({ Historial: [] }))
      ),
      documentos: this.requerimientoService.listarDocumento(fila.IdExpediente).pipe(
        catchError(() => of({ Documentos: [] }))
      )
    }).subscribe({
      next: (respuestas: any) => {
        this.cargando = false;

        if (respuestas.detalle?.estado !== 1) {
          this.funciones.mensaje('error',
            respuestas.detalle?.mensaje || 'No fue posible cargar el requerimiento.');
          this.abierto = false;
          return;
        }

        this.detalle = respuestas.detalle;
        this.historial = respuestas.trazabilidad?.Historial || [];
        this.documentos = respuestas.documentos?.Documentos || [];
      },
      error: () => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  cerrar(): void {
    this.abierto = false;
  }

  emitirEditar(): void {
    if (this.fila) {
      this.editar.emit(this.fila);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Presentación                                                           */
  /* ---------------------------------------------------------------------- */

  get nombreDec(): string {
    return this.detalle?.CodigoDec === 'DAI' ? 'DAI' : 'Unidad de Abastecimiento';
  }

  get condicionCmnTexto(): string {
    return this.detalle?.CondicionCmn === 'INCLUIDO'
      ? 'Incluida en el CMN'
      : 'No incluida en el CMN';
  }

  get proveedores(): any[] {
    const extra = this.detalle?.DatosAdicionales;
    if (!extra) {
      return [];
    }
    const dato = typeof extra === 'string' ? this.parsearJson(extra) : extra;
    const lista = dato?.Proveedores || dato?.proveedores;
    if (Array.isArray(lista) && lista.length) {
      return lista;
    }
    const uno = dato?.Proveedor || dato?.proveedor;
    return uno ? [uno] : [];
  }

  private parsearJson(valor: string): any {
    try {
      return JSON.parse(valor);
    } catch {
      return {};
    }
  }

  /**
   * Los documentos que el objeto exige, cruzados con los que el expediente ya
   * tiene. Se muestran los dos juntos para que se vea qué falta: en Locación son
   * dos y en ese orden (REQ-08), y esa secuencia sólo se entiende si los
   * pendientes también aparecen.
   */
  get documentosEsperados(): {
    codigo: string; etiqueta: string; anexo: string;
    registrado: DocumentoExpediente | null;
  }[] {
    if (!this.detalle) {
      return [];
    }

    return (DOCUMENTO_TECNICO[this.detalle.CodigoTipoContratacion] || []).map(esperado => ({
      ...esperado,
      registrado: this.documentos.find(d => d.CodigoTipoDocumento === esperado.codigo) || null
    }));
  }

  tonoDocumento(documento: DocumentoExpediente | null): string {
    if (!documento) return 'neutral';
    if (documento.Estado === 'FIRMADO') return 'success';
    if (documento.Estado === 'ANULADO') return 'warning';
    return 'info';
  }

  urlDocumento(documento: DocumentoExpediente | null): string {
    if (!esPdfDelFileServer(documento?.GeneradoDocumento)) {
      return '';
    }
    return this.maestraService.urlDescarga(
      idDocumentoSistema(documento?.GeneradoDocumento),
      CARPETA_ANEXO_5
    );
  }

  get puedeElaborarAnexo3(): boolean {
    if (this.detalle?.CodigoTipoContratacion !== 'LOCACION') {
      return false;
    }
    const tdr = this.documentos.find(d => d.CodigoTipoDocumento === TIPO_ANEXO_3);
    return !tdr || tdr.Estado !== 'FIRMADO';
  }

  emitirElaborarAnexo3(): void {
    if (!this.detalle?.IdRequerimiento) {
      return;
    }
    this.elaborarAnexo3.emit(this.detalle.IdRequerimiento);
    this.cerrar();
  }
}
