import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { SessionService } from '../../../../core/services/session.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { esPdfDelFileServer, idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { imprimirHistorialExpediente } from '../../../../shared/funciones/imprimir-trazabilidad';
import { CARPETA_MEMO_CCP, CARPETA_EVAL_TDR, TIPO_EVAL_CUMPLIMIENTO_TDR, documentosDelExpediente, evidenciasFiltro, guardarEvidencias, idsEvidencia } from '../../documentos/filtro-idoneidad.util';
import { nombreProveedor, numeroDocumentoProveedor } from '../../models/requerimiento.model';
import { CARPETA_ANEXO_5 } from '../../documentos/anexo5.pdfmake';
import { CARPETA_ANEXO_3, TIPO_ANEXO_3 } from '../../documentos/anexo3.pdfmake';
import { CARPETA_ORDEN_SERVICIO, TIPO_ORDEN_SERVICIO } from '../../documentos/orden-servicio.pdfmake';
import {
  DOCUMENTO_TECNICO,
  HistorialRequerimiento,
  RequerimientoBandeja,
  RequerimientoDetalle,
  etiquetaEstadoRequerimiento
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
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-detalle.component.html',
  styleUrl: './modal-detalle.component.scss',
})
export class ModalDetalleRequerimientoComponent {

  /* La plantilla no compone el nombre ni elige entre DNI y RUC: lo resuelven
     estas dos, que son las mismas que usan el Anexo 5 y el Anexo 8. Un proveedor
     identificado por RUC no tiene apellidos y salía en blanco. */
  readonly nombreDelProveedor = nombreProveedor;
  readonly documentoDelProveedor = numeroDocumentoProveedor;

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
  filtros: {
    CodigoFiltro: string; Tipo: string; Resultado: string;
    Origen: string; Observacion: string | null;
    GeneradoDocumentoEvidencia?: string | null;
    NombreDocumentoEvidencia?: string | null;
  }[] = [];
  subiendoEvidencia: string | null = null;
  guardandoFiltros = false;
  guardandoCcp = false;
  guardandoOs = false;
  reemplazandoOs = false;
  archivoOs: File | null = null;
  ccp = { NumeroCcp: '', FechaEmision: '', Observacion: '' };
  orden = { NumeroOrden: '' };

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private maestraService: MaestraService,
    private sesion: SessionService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja, opciones: { puedeEditar: boolean }): void {
    this.fila = fila;
    this.detalle = null;
    this.historial = [];
    this.documentos = [];
    this.filtros = [];
    this.ccp = { NumeroCcp: '', FechaEmision: '', Observacion: '' };
    this.orden = { NumeroOrden: '' };
    this.archivoOs = null;
    this.reemplazandoOs = false;
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
        this.documentos = documentosDelExpediente(respuestas.documentos);
        this.aplicarCcpOs(respuestas.detalle);
        if (this.detalle?.CodigoTipoContratacion === 'LOCACION') {
          this.cargarFiltros();
        }
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

    const esperados = (DOCUMENTO_TECNICO[this.detalle.CodigoTipoContratacion] || []).map(esperado => ({
      ...esperado,
      registrado: this.documentos.find(d => d.CodigoTipoDocumento === esperado.codigo) || null
    }));

    if (this.detalle.CodigoTipoContratacion === 'LOCACION') {
      esperados.push({
        codigo: TIPO_EVAL_CUMPLIMIENTO_TDR,
        etiqueta: 'Evaluación de cumplimiento del TDR',
        anexo: 'Matriz / Excel',
        registrado: this.documentos.find(d => d.CodigoTipoDocumento === TIPO_EVAL_CUMPLIMIENTO_TDR) || null
      });
    }

    return esperados;
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
    const carpeta = documento?.CodigoTipoDocumento === TIPO_ANEXO_3
      ? CARPETA_ANEXO_3
      : documento?.CodigoTipoDocumento === TIPO_EVAL_CUMPLIMIENTO_TDR
        ? CARPETA_EVAL_TDR
        : CARPETA_ANEXO_5;
    return this.maestraService.urlDescarga(
      idDocumentoSistema(documento?.GeneradoDocumento),
      carpeta
    );
  }

  get puedeElaborarAnexo3(): boolean {
    if (!this.puedeEditar) {
      return false;
    }
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

  get codigoRol(): string {
    return this.sesion.getInfoUsuario()?.detalle?.[0]?.perfil?.[0]?.cod_perfil || '';
  }

  get esLocacion(): boolean {
    return this.detalle?.CodigoTipoContratacion === 'LOCACION';
  }

  get etiquetaEstado(): string {
    return etiquetaEstadoRequerimiento(
      this.detalle?.CodigoEstado,
      this.detalle?.Estado,
      this.detalle?.CodigoTipoContratacion
    );
  }

  get puedeEditarFiltros(): boolean {
    return false;
  }

  get puedeEditarCcp(): boolean {
    return false;
  }

  get puedeEditarOs(): boolean {
    return this.esLocacion
      && (this.detalle?.CodigoEstado === 'REQ_CUADRO_GENERADO'
        || this.detalle?.CodigoEstado === 'REQ_OS_EMITIDA')
      && ['ABAST_ESPECIALISTA', 'ABAST_COORDINADOR', 'ABAST_JEFE'].includes(this.codigoRol);
  }

  /** PDF vigente de la orden. El generado por el asistente y el que lo reemplaza. */
  get documentoOrden(): DocumentoExpediente | null {
    return this.documentos.find(d => d.CodigoTipoDocumento === TIPO_ORDEN_SERVICIO) || null;
  }

  /**
   * Mismo criterio que «Subir Anexo 4 firmado» del CMN: Abastecimiento cambia
   * el PDF que generó el sistema por otro archivo. Solo cuando ya hay orden.
   */
  get puedeReemplazarOs(): boolean {
    const id = this.documentoOrden?.GeneradoDocumento
      || this.detalle?.OrdenServicio?.GeneradoDocumento;
    return this.esLocacion
      && !!id
      && ['ABAST_ESPECIALISTA', 'ABAST_COORDINADOR', 'ABAST_JEFE'].includes(this.codigoRol);
  }

  get urlOrdenActual(): string {
    const id = idDocumentoSistema(
      this.documentoOrden?.GeneradoDocumento
      || this.detalle?.OrdenServicio?.GeneradoDocumento
    );
    return id ? this.maestraService.urlDescarga(id, CARPETA_ORDEN_SERVICIO) : '';
  }

  get nombreOrdenActual(): string {
    return this.documentoOrden?.NombreDocumento
      || this.detalle?.OrdenServicio?.NombreDocumento
      || 'PDF actual de la orden';
  }

  get muestraTramiteLocacion(): boolean {
    return this.esLocacion && (
      this.filtros.length > 0
      || !!this.detalle?.Ccp
      || !!this.detalle?.OrdenServicio
      || ['REQ_INDAGACION_MERCADO', 'REQ_FILTROS', 'REQ_FILTROS_COORD', 'REQ_FILTROS_JEFE', 'REQ_CCP_SOLICITADO', 'REQ_CCP_CARGADA', 'REQ_CUADRO_GENERADO', 'REQ_OS_EMITIDA', 'REQ_NOTIFICADO', 'REQ_CONFORME']
        .includes(this.detalle?.CodigoEstado || '')
    );
  }

  private cargarFiltros(): void {
    if (!this.detalle?.IdRequerimiento) {
      return;
    }
    this.requerimientoService.listarFiltroIdoneidad(this.detalle.IdRequerimiento).subscribe({
      next: (respuesta: any) => {
        const raw = respuesta?.Filtros;
        if (Array.isArray(raw)) {
          this.filtros = raw;
          return;
        }
        if (typeof raw === 'string' && raw.trim()) {
          try {
            const parsed = JSON.parse(raw);
            this.filtros = Array.isArray(parsed) ? parsed : [];
            return;
          } catch {
            this.filtros = [];
            return;
          }
        }
        this.filtros = [];
      }
    });
  }

  imprimirHistorial(): void {
    imprimirHistorialExpediente(
      `Trazabilidad · ${this.detalle?.Codigo || 'requerimiento'}`,
      this.historial
    );
  }

  private aplicarCcpOs(detalle: any): void {
    const ccp = detalle?.Ccp;
    if (ccp) {
      this.ccp = {
        NumeroCcp: ccp.NumeroCcp || '',
        FechaEmision: (ccp.FechaEmision || '').substring(0, 10),
        Observacion: ccp.Observacion || ''
      };
    }
    const os = detalle?.OrdenServicio;
    if (os) {
      this.orden = { NumeroOrden: os.NumeroOrden || '' };
    }
  }

  guardarFiltros(): void {
    if (!this.detalle || this.guardandoFiltros) {
      return;
    }
    const incompleto = this.filtros.some(
      (filtro) => !['CONFORME', 'NO_CONFORME'].includes(filtro.Resultado)
    );
    if (incompleto) {
      this.funciones.mensaje('info', 'Indique Sí o No en cada filtro de idoneidad.');
      return;
    }
    this.guardandoFiltros = true;
    this.requerimientoService.registrarFiltroIdoneidad(this.detalle.IdRequerimiento, this.filtros).subscribe({
      next: (respuesta: any) => {
        this.guardandoFiltros = false;
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No se guardaron los filtros.');
          return;
        }
        this.funciones.mensaje('success', respuesta.mensaje || 'Se registraron los filtros de idoneidad.');
      },
      error: () => {
        this.guardandoFiltros = false;
        this.funciones.mensaje('error', 'No fue posible guardar los filtros.');
      }
    });
  }

  marcarFiltro(filtro: { Resultado: string }, respuesta: 'SI' | 'NO'): void {
    filtro.Resultado = respuesta === 'SI' ? 'CONFORME' : 'NO_CONFORME';
  }

  esFiltroSi(filtro: { Resultado: string }): boolean {
    return filtro.Resultado === 'CONFORME';
  }

  esFiltroNo(filtro: { Resultado: string }): boolean {
    return filtro.Resultado === 'NO_CONFORME';
  }

  etiquetaFiltro(filtro: { Resultado: string }): string {
    if (filtro.Resultado === 'CONFORME') {
      return 'Sí';
    }
    if (filtro.Resultado === 'NO_CONFORME') {
      return 'No';
    }
    if (filtro.Resultado === 'NO_APLICA') {
      return 'No aplica';
    }
    return 'Pendiente';
  }

  urlEvidenciaFiltro(filtro: { GeneradoDocumentoEvidencia?: string | null }): string {
    const id = idsEvidencia(filtro.GeneradoDocumentoEvidencia)[0];
    return id ? this.maestraService.urlDescarga(id, CARPETA_MEMO_CCP) : '';
  }

  listaEvidenciasFiltro(filtro: {
    GeneradoDocumentoEvidencia?: string | null;
    NombreDocumentoEvidencia?: string | null;
  }): { id: string; nombre: string; url: string }[] {
    return evidenciasFiltro(filtro).map(item => ({
      ...item,
      url: this.maestraService.urlDescarga(item.id, CARPETA_MEMO_CCP)
    }));
  }

  subirEvidenciaFiltro(filtro: {
    CodigoFiltro: string;
    GeneradoDocumentoEvidencia?: string | null;
    NombreDocumentoEvidencia?: string | null;
  }, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivos = Array.from(input.files || []);
    input.value = '';
    const archivo = archivos[0];
    if (!archivo || this.subiendoEvidencia) {
      return;
    }
    if (archivos.some(item => !item.name.toLowerCase().endsWith('.pdf'))) {
      this.funciones.mensaje('info', 'La evidencia debe ser un archivo PDF.');
      return;
    }

    const varios = filtro.CodigoFiltro === 'DEBIDA_DILIGENCIA';
    this.subiendoEvidencia = filtro.CodigoFiltro;
    this.documentoService.subirArchivo(archivo, CARPETA_MEMO_CCP).subscribe({
      next: (respuesta: any) => {
        this.subiendoEvidencia = null;
        const documentoSistema = idDocumentoSistema(respuesta?.documento_sistema);
        if (!documentoSistema) {
          this.funciones.mensaje('error', 'No se obtuvo el identificador del PDF.');
          return;
        }
        if (varios) {
          guardarEvidencias(filtro, [
            ...evidenciasFiltro(filtro),
            { id: documentoSistema, nombre: respuesta.documento_original || archivo.name }
          ]);
          if (archivos.length > 1) {
            this.subirEvidenciasSeguidas(filtro, archivos.slice(1));
          }
        } else {
          filtro.GeneradoDocumentoEvidencia = documentoSistema;
          filtro.NombreDocumentoEvidencia = archivo.name;
        }
      },
      error: () => {
        this.subiendoEvidencia = null;
        this.funciones.mensaje('error', 'No fue posible subir la evidencia.');
      }
    });
  }

  private subirEvidenciasSeguidas(filtro: {
    CodigoFiltro: string;
    GeneradoDocumentoEvidencia?: string | null;
    NombreDocumentoEvidencia?: string | null;
  }, archivos: File[]): void {
    const archivo = archivos[0];
    if (!archivo) {
      return;
    }
    this.subiendoEvidencia = filtro.CodigoFiltro;
    this.documentoService.subirArchivo(archivo, CARPETA_MEMO_CCP).subscribe({
      next: (respuesta: any) => {
        this.subiendoEvidencia = null;
        const documentoSistema = idDocumentoSistema(respuesta?.documento_sistema);
        if (documentoSistema) {
          guardarEvidencias(filtro, [
            ...evidenciasFiltro(filtro),
            { id: documentoSistema, nombre: respuesta.documento_original || archivo.name }
          ]);
        }
        if (archivos.length > 1) {
          this.subirEvidenciasSeguidas(filtro, archivos.slice(1));
        }
      },
      error: () => {
        this.subiendoEvidencia = null;
        this.funciones.mensaje('error', 'No fue posible subir uno de los PDF.');
      }
    });
  }

  guardarCcp(): void {
    if (!this.detalle || this.guardandoCcp) {
      return;
    }
    if (!this.ccp.NumeroCcp.trim()) {
      this.funciones.mensaje('info', 'Indique el número de la CCP emitida.');
      return;
    }
    this.guardandoCcp = true;
    this.requerimientoService.registrarCcp(this.detalle.IdRequerimiento, {
      NumeroCcp: this.ccp.NumeroCcp.trim(),
      FechaEmision: this.ccp.FechaEmision || null,
      Observacion: this.ccp.Observacion.trim() || null,
      MarcarSolicitud: this.detalle.CodigoEstado === 'REQ_CCP_SOLICITADO' ? 1 : 0
    }).subscribe({
      next: (respuesta: any) => {
        this.guardandoCcp = false;
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No se registró la CCP.');
          return;
        }
        this.funciones.mensaje('success', respuesta.mensaje || 'Se registró la CCP.');
      },
      error: () => {
        this.guardandoCcp = false;
        this.funciones.mensaje('error', 'No fue posible registrar la CCP.');
      }
    });
  }

  onArchivoOs(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;
    if (archivo && !archivo.name.toLowerCase().endsWith('.pdf')) {
      this.funciones.mensaje('info', 'El archivo de la orden debe ser PDF.');
      input.value = '';
      this.archivoOs = null;
      return;
    }
    this.archivoOs = archivo;
  }

  /**
   * Sustituye el PDF de la orden en el expediente y en requerimiento.OrdenServicio.
   * paRegistrarDocumento reemplaza el borrador vigente; si ya estaba firmado,
   * abre una versión nueva y anula la anterior.
   */
  reemplazarArchivoOs(): void {
    if (!this.detalle || !this.archivoOs || this.reemplazandoOs) {
      return;
    }

    const archivo = this.archivoOs;
    const idExpediente = this.detalle.IdExpediente;
    const idRequerimiento = this.detalle.IdRequerimiento;
    this.reemplazandoOs = true;

    this.documentoService.subirArchivo(archivo, CARPETA_ORDEN_SERVICIO).pipe(
      switchMap((subida: any) => {
        const documentoSistema = idDocumentoSistema(subida?.documento_sistema);
        if (subida?.estado !== 1 || !documentoSistema) {
          return throwError(() => ({
            mensaje: subida?.mensaje || 'No fue posible subir el PDF de la orden.'
          }));
        }
        const nombre = subida.documento_original || archivo.name;
        return this.requerimientoService.registrarDocumento(
          idExpediente,
          TIPO_ORDEN_SERVICIO,
          documentoSistema,
          nombre,
          { Origen: 'REEMPLAZO_OS' }
        ).pipe(
          switchMap((alta: any) => {
            if (alta?.estado !== 1) {
              return throwError(() => ({
                mensaje: alta?.mensaje || 'No se reemplazó el documento de la orden.'
              }));
            }
            return this.requerimientoService.registrarOrdenServicio(idRequerimiento, {
              GeneradoDocumento: documentoSistema,
              NombreDocumento: nombre
            }).pipe(switchMap((orden: any) => {
              if (orden?.estado !== 1) {
                return throwError(() => ({
                  mensaje: orden?.mensaje || 'El PDF se subió, pero no quedó ligado a la orden.'
                }));
              }
              return of({ documentoSistema, nombre });
            }));
          })
        );
      })
    ).subscribe({
      next: ({ documentoSistema, nombre }) => {
        this.reemplazandoOs = false;
        this.archivoOs = null;
        if (this.detalle?.OrdenServicio) {
          this.detalle.OrdenServicio.GeneradoDocumento = documentoSistema;
          this.detalle.OrdenServicio.NombreDocumento = nombre;
        }
        this.requerimientoService.listarDocumento(idExpediente).subscribe({
          next: (respuesta: any) => {
            this.documentos = documentosDelExpediente(respuesta);
          }
        });
        this.funciones.mensaje('success', 'Se reemplazó el archivo de la orden de servicio.');
      },
      error: (err) => {
        this.reemplazandoOs = false;
        this.funciones.mensaje(
          'error',
          err?.mensaje || err?.message || 'No fue posible reemplazar el archivo de la orden.'
        );
      }
    });
  }

  guardarOrden(): void {
    if (!this.detalle || this.guardandoOs) {
      return;
    }
    this.guardandoOs = true;
    this.requerimientoService.registrarOrdenServicio(this.detalle.IdRequerimiento, {}).subscribe({
      next: (respuesta: any) => {
        this.guardandoOs = false;
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No se registraron los datos de la orden.');
          return;
        }
        this.funciones.mensaje('success', respuesta.mensaje || 'Datos guardados.');
      },
      error: () => {
        this.guardandoOs = false;
        this.funciones.mensaje('error', 'No fue posible registrar los datos de la orden de servicio.');
      }
    });
  }

  get estadoIntegracionOs(): string {
    return this.detalle?.OrdenServicio?.EstadoIntegracion || '';
  }

  get etiquetaIntegracionOs(): string {
    const mapa: Record<string, string> = {
      PENDIENTE: 'Pendiente de registro en SIGA',
      EN_PROCESO: 'Registrando en SIGA…',
      COMPLETADO: 'Registrada en SIGA',
      SIMULADO: 'Simulada (sin escritura real)',
      ERROR: 'Error al registrar en SIGA'
    };
    return mapa[this.estadoIntegracionOs] || 'Sin registrar en SIGA';
  }
}
