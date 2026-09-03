import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { RequerimientoBandeja, RequerimientoDetalle } from '../../models/requerimiento.model';
import {
  CARPETA_MEMO_CCP,
  FILTROS_FORMALES,
  FILTROS_MATRIZ,
  FiltroIdoneidadVista,
  PORTAL_FILTRO,
  correoLocadorValido,
  documentoLocador,
  esFiltroMatriz,
  etiquetaMatrizFiltro,
  etiquetaPid as textoResultadoPid,
  montoTotalLocacion,
  nombreCompletoLocador,
  pedidoPrincipal,
  proveedorPrincipal
} from '../../documentos/filtro-idoneidad.util';

@Component({
  selector: 'app-modal-filtros-idoneidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-filtros-idoneidad.component.html',
  styleUrl: './modal-filtros-idoneidad.component.scss'
})
export class ModalFiltrosIdoneidadComponent {

  @Output() solicitarCcp = new EventEmitter<RequerimientoBandeja>();
  @Output() completado = new EventEmitter<void>();

  abierto = false;
  cargando = false;
  guardando = false;
  observando = false;
  subiendoCodigo: string | null = null;
  arrastreCodigo: string | null = null;

  mostrarObservar = false;
  motivoObservacion = '';

  fila: RequerimientoBandeja | null = null;
  detalle: RequerimientoDetalle | null = null;
  filtros: FiltroIdoneidadVista[] = [];

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private maestraService: MaestraService,
    private funciones: Funciones
  ) { }

  abrir(fila: RequerimientoBandeja): void {
    this.fila = fila;
    this.detalle = null;
    this.filtros = [];
    this.mostrarObservar = false;
    this.motivoObservacion = '';
    this.abierto = true;
    this.cargando = true;

    forkJoin({
      detalle: this.requerimientoService.obtenerRequerimiento(fila.IdRequerimiento).pipe(
        catchError(() => of(null))
      ),
      filtros: this.requerimientoService.listarFiltroIdoneidad(fila.IdRequerimiento).pipe(
        catchError(() => of({ Filtros: [] }))
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
        this.filtros = this.normalizarFiltros(respuestas.filtros?.Filtros);
        this.fila = {
          ...fila,
          Version: respuestas.detalle.Version ?? fila.Version,
          CodigoEstado: respuestas.detalle.CodigoEstado || fila.CodigoEstado
        };
      },
      error: () => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible abrir los filtros de idoneidad.');
      }
    });
  }

  cerrar(): void {
    if (this.guardando || this.observando) {
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

  get nombreLocador(): string {
    return nombreCompletoLocador(this.proveedor) || '—';
  }

  get rucLocador(): string {
    return this.proveedor?.Ruc || '—';
  }

  get dniLocador(): string {
    return this.proveedor?.Dni || documentoLocador(this.proveedor) || '—';
  }

  get correoLocador(): string {
    return this.proveedor?.Email || '';
  }

  get correoValido(): boolean {
    return correoLocadorValido(this.correoLocador);
  }

  get denominacion(): string {
    return this.detalle?.Denominacion || this.fila?.Denominacion || '—';
  }

  get numeroPedido(): string {
    return this.pedido?.NumeroPedido || this.proveedor?.NumeroPedido || '—';
  }

  get montoTotal(): number {
    return montoTotalLocacion(this.detalle, this.proveedor);
  }

  get filtroSunat(): FiltroIdoneidadVista | undefined {
    return this.filtros.find(f => f.CodigoFiltro === 'SUNAT_HABIDO');
  }

  get filtroRnp(): FiltroIdoneidadVista | undefined {
    return this.filtros.find(f => f.CodigoFiltro === 'RNP');
  }

  get filtrosMatriz(): FiltroIdoneidadVista[] {
    const orden = FILTROS_MATRIZ as readonly string[];
    return this.filtros
      .filter(f => esFiltroMatriz(f.CodigoFiltro))
      .sort((a, b) => orden.indexOf(a.CodigoFiltro) - orden.indexOf(b.CodigoFiltro));
  }

  get sunatConforme(): boolean {
    return this.filtroSunat?.Resultado === 'CONFORME';
  }

  get sunatOk(): boolean {
    return this.sunatConforme && !!idDocumentoSistema(this.filtroSunat?.GeneradoDocumentoEvidencia);
  }

  get sunatBloquea(): boolean {
    return this.filtroSunat?.Resultado === 'NO_CONFORME';
  }

  get rnpOk(): boolean {
    return this.filtroRnp?.Resultado === 'CONFORME' && !!idDocumentoSistema(this.filtroRnp?.GeneradoDocumentoEvidencia);
  }

  get matrizCompleta(): boolean {
    const matriz = this.filtrosMatriz;
    return matriz.length === FILTROS_MATRIZ.length
      && matriz.every(f => f.Resultado === 'CONFORME' && !!idDocumentoSistema(f.GeneradoDocumentoEvidencia));
  }

  get hayImpedimento(): boolean {
    return this.filtros.some(f => f.Resultado === 'NO_CONFORME');
  }

  get puedeConfirmarCcp(): boolean {
    return this.sunatOk && this.rnpOk && this.matrizCompleta && !this.hayImpedimento
      && !this.guardando && !this.observando;
  }

  get puedeObservar(): boolean {
    return this.hayImpedimento && !this.guardando && !this.observando;
  }

  nombreFiltro(filtro: FiltroIdoneidadVista): string {
    return etiquetaMatrizFiltro(filtro.CodigoFiltro, filtro.Tipo);
  }

  etiquetaPid(filtro: FiltroIdoneidadVista): string {
    return textoResultadoPid(filtro.ResultadoPid);
  }

  clasePid(filtro: FiltroIdoneidadVista): string {
    const valor = filtro.ResultadoPid;
    if (valor === 'APTO') {
      return 'fid-badge--apto';
    }
    if (valor === 'ALERTA') {
      return 'fid-badge--alerta';
    }
    if (valor === 'SIN_SERVICIO') {
      return 'fid-badge--sin';
    }
    return 'fid-badge--pendiente';
  }

  claseSunat(): string {
    if (this.sunatConforme) {
      return 'fid-badge--apto';
    }
    if (this.sunatBloquea) {
      return 'fid-badge--alerta';
    }
    return 'fid-badge--pendiente';
  }

  textoSunat(): string {
    if (this.sunatConforme) {
      return 'Activo y Habido';
    }
    if (this.sunatBloquea) {
      return 'No Habido / No Activo';
    }
    return 'Pendiente';
  }

  claseRnp(): string {
    if (this.filtroRnp?.Resultado === 'CONFORME') {
      return 'fid-badge--apto';
    }
    if (this.filtroRnp?.Resultado === 'NO_CONFORME') {
      return 'fid-badge--alerta';
    }
    return 'fid-badge--pendiente';
  }

  textoRnp(): string {
    if (this.filtroRnp?.Resultado === 'CONFORME') {
      return 'Vigente';
    }
    if (this.filtroRnp?.Resultado === 'NO_CONFORME') {
      return 'No vigente';
    }
    return 'Pendiente';
  }

  marcar(filtro: FiltroIdoneidadVista | undefined, cumple: boolean): void {
    if (!filtro) {
      return;
    }
    filtro.Resultado = cumple ? 'CONFORME' : 'NO_CONFORME';
    if (!filtro.Origen) {
      filtro.Origen = 'MANUAL';
    }
  }

  esSi(filtro?: FiltroIdoneidadVista): boolean {
    return filtro?.Resultado === 'CONFORME';
  }

  esNo(filtro?: FiltroIdoneidadVista): boolean {
    return filtro?.Resultado === 'NO_CONFORME';
  }

  urlEvidencia(filtro?: FiltroIdoneidadVista): string {
    const id = idDocumentoSistema(filtro?.GeneradoDocumentoEvidencia);
    return id ? this.maestraService.urlDescarga(id, CARPETA_MEMO_CCP) : '';
  }

  portal(codigo: string): { etiqueta: string; url: string } | undefined {
    return PORTAL_FILTRO[codigo];
  }

  onFile(filtro: FiltroIdoneidadVista | undefined, event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    this.cargarPdf(filtro, archivo);
  }

  onDrop(filtro: FiltroIdoneidadVista | undefined, event: DragEvent): void {
    event.preventDefault();
    this.arrastreCodigo = null;
    const archivo = event.dataTransfer?.files?.[0];
    this.cargarPdf(filtro, archivo);
  }

  onDragOver(event: DragEvent, codigo: string): void {
    event.preventDefault();
    this.arrastreCodigo = codigo;
  }

  onDragLeave(): void {
    this.arrastreCodigo = null;
  }

  guardarBorrador(): void {
    if (!this.detalle || this.guardando) {
      return;
    }
    this.guardando = true;
    this.requerimientoService.registrarFiltroIdoneidad(this.detalle.IdRequerimiento, this.filtros).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No se guardó el borrador.');
          return;
        }
        this.funciones.mensaje('success', 'Borrador guardado. El expediente sigue en filtros de idoneidad.');
      },
      error: () => {
        this.guardando = false;
        this.funciones.mensaje('error', 'No fue posible guardar el borrador.');
      }
    });
  }

  irACcp(): void {
    if (!this.puedeConfirmarCcp || !this.detalle || !this.fila) {
      return;
    }
    if (this.sunatBloquea) {
      this.funciones.mensaje('error', 'SUNAT no figura como Activo y Habido. El flujo queda bloqueado.');
      return;
    }
    this.guardando = true;
    this.requerimientoService.registrarFiltroIdoneidad(this.detalle.IdRequerimiento, this.filtros).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        if (respuesta?.estado !== 1) {
          this.funciones.mensaje('error', respuesta?.mensaje || 'No se pudieron guardar los filtros.');
          return;
        }
        const fila = this.fila!;
        this.abierto = false;
        this.solicitarCcp.emit(fila);
      },
      error: () => {
        this.guardando = false;
        this.funciones.mensaje('error', 'No fue posible guardar los filtros.');
      }
    });
  }

  pedirObservar(): void {
    this.mostrarObservar = true;
  }

  confirmarObservar(): void {
    if (!this.fila || this.observando) {
      return;
    }
    const motivo = this.motivoObservacion.trim();
    if (!motivo) {
      this.funciones.mensaje('info', 'Indique el motivo técnico de rechazo. Queda en la trazabilidad.');
      return;
    }
    this.observando = true;
    const persistir = this.detalle
      ? this.requerimientoService.registrarFiltroIdoneidad(this.detalle.IdRequerimiento, this.filtros)
      : of({ estado: 1 });

    persistir.subscribe({
      next: (guardado: any) => {
        if (guardado?.estado !== 1) {
          this.observando = false;
          this.funciones.mensaje('error', guardado?.mensaje || 'No se guardaron los filtros.');
          return;
        }
        this.requerimientoService.ejecutarTransicion(
          this.fila!.IdExpediente,
          'REQ_OBSERVAR_FILTROS',
          this.fila!.Version,
          motivo
        ).subscribe({
          next: (respuesta: any) => {
            this.observando = false;
            if (respuesta?.estado !== 1) {
              this.funciones.mensaje('error', respuesta?.mensaje || 'No fue posible devolver el expediente.');
              return;
            }
            this.abierto = false;
            this.funciones.mensaje('success', respuesta.mensaje || 'El expediente volvió al Área usuaria.');
            this.completado.emit();
          },
          error: () => {
            this.observando = false;
            this.funciones.mensaje('error', 'No fue posible devolver el expediente.');
          }
        });
      },
      error: () => {
        this.observando = false;
        this.funciones.mensaje('error', 'No fue posible guardar los filtros antes de observar.');
      }
    });
  }

  private cargarPdf(filtro: FiltroIdoneidadVista | undefined, archivo?: File): void {
    if (!filtro || !archivo || this.subiendoCodigo) {
      return;
    }
    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
      this.funciones.mensaje('info', 'La evidencia debe ser un archivo PDF.');
      return;
    }
    this.subiendoCodigo = filtro.CodigoFiltro;
    this.documentoService.subirArchivo(archivo, CARPETA_MEMO_CCP).subscribe({
      next: (respuesta: any) => {
        this.subiendoCodigo = null;
        const documentoSistema = idDocumentoSistema(respuesta?.documento_sistema);
        if (!documentoSistema) {
          this.funciones.mensaje('error', 'No se obtuvo el identificador del PDF.');
          return;
        }
        filtro.GeneradoDocumentoEvidencia = documentoSistema;
        filtro.NombreDocumentoEvidencia = archivo.name;
        filtro.Origen = filtro.Origen === 'PID' ? 'PID' : 'MANUAL';
      },
      error: () => {
        this.subiendoCodigo = null;
        this.funciones.mensaje('error', 'No fue posible subir el PDF.');
      }
    });
  }

  private normalizarFiltros(raw: any): FiltroIdoneidadVista[] {
    let lista: FiltroIdoneidadVista[] = [];
    if (Array.isArray(raw)) {
      lista = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        lista = Array.isArray(parsed) ? parsed : [];
      } catch {
        lista = [];
      }
    }
    for (const codigo of [...FILTROS_FORMALES, ...FILTROS_MATRIZ]) {
      if (!lista.some(f => f.CodigoFiltro === codigo)) {
        lista.push({
          CodigoFiltro: codigo,
          Tipo: codigo,
          Resultado: 'PENDIENTE',
          ResultadoPid: 'PENDIENTE',
          Origen: 'MANUAL'
        });
      }
    }
    return lista;
  }
}
