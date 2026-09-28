import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { from, of } from 'rxjs';
import { catchError, map, mergeMap, toArray } from 'rxjs/operators';

import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { DocumentoService } from '../../core/services/documento.service';
import { MaestraService } from '../../shared/services/maestra.service';
import { Funciones } from '../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../shared/funciones/archivo';
import {
  ArchivoExpediente,
  descargarBlob,
  empaquetarZip,
  prepararArchivos,
  unirEnPdf
} from '../../shared/funciones/expediente-completo';
import { ReporteService } from './services/reporte.service';
import {
  DocumentoCadena,
  ExpedienteDocumental,
  GrupoDocumentos,
  OrdenEncontrada
} from './models/reporte.model';
import { ItemIndice, construirIndiceExpedienteDocumental } from './documentos/indice-expediente-documental.pdfmake';

const CARPETAS = ['requerimiento', 'cmn', 'ejecucion', 'modificacion', 'resolucion', 'pago'];
const DESCARGAS_EN_PARALELO = 4;

interface Fuente {
  indice: number;
  grupo: string;
  nombre: string;
  fecha: string | null;
  id: string;
  carpeta: string;
}

@Component({
  selector: 'app-reportes-expediente',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './reportes-expediente.component.html',
  styleUrl: './reportes-expediente.component.scss'
})
export class ReportesExpedienteComponent implements OnInit, OnDestroy {

  breadcrumb = ['Abastecimiento', 'Reportes', 'Expediente por orden'];

  filtro: { Texto: string; TipoOrden: '' | 'OC' | 'OS'; AnoEje: number | null } =
    { Texto: '', TipoOrden: '', AnoEje: null };
  readonly anios = [0, 1, 2].map(n => new Date().getFullYear() - n);

  buscando = false;
  buscado = '';
  total = 0;
  ordenes: OrdenEncontrada[] = [];

  cargandoDetalle = '';
  seleccionado: ExpedienteDocumental | null = null;
  grupos: GrupoDocumentos[] = [];
  pestana: 'orden' | 'documentos' | 'trazabilidad' = 'orden';

  generando = false;
  paso = '';

  visorPdfUrl: SafeResourceUrl | null = null;
  visorPdfObjectUrl = '';
  visorPdfTitulo = '';
  visorPdfSubtitulo = '';
  visorPdfNombre = '';
  private visorPdfBlob: Blob | null = null;

  constructor(
    private servicio: ReporteService,
    private documentos: DocumentoService,
    private maestra: MaestraService,
    private funciones: Funciones,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.buscar();
  }

  ngOnDestroy(): void {
    this.cerrarVisorPdf();
  }

  /* ------------------------------------------------------------------ búsqueda */

  /** Sin texto muestra las órdenes más recientes; con una sola coincidencia abre su expediente. */
  buscar(): void {
    const texto = this.filtro.Texto.trim();
    this.buscando = true;
    this.servicio.buscarOrden({ ...this.filtro, Texto: texto, TipoOrden: this.filtro.TipoOrden || null }).subscribe({
      next: (r: any) => {
        this.buscando = false;
        if (r?.estado !== 1) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo buscar.'); return; }
        this.ordenes = r.Ordenes || [];
        this.total = r.total || 0;
        this.buscado = texto;
        if (texto && this.ordenes.length === 1) {
          this.seleccionar(this.ordenes[0]);
        }
      },
      error: () => { this.buscando = false; this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.'); }
    });
  }

  limpiar(): void {
    this.filtro = { Texto: '', TipoOrden: '', AnoEje: null };
    this.cerrarDetalle();
    this.buscar();
  }

  numeroOrden(o: { NumeroOrden: string | null; TipoOrden: string }): string {
    return `${o.TipoOrden} ${o.NumeroOrden || '(sin número SIGA)'}`;
  }

  esSeleccionada(o: OrdenEncontrada): boolean {
    return this.seleccionado?.Cabecera.IdOrdenServicio === o.IdOrdenServicio;
  }

  /* ------------------------------------------------------------------- ficha */

  seleccionar(o: OrdenEncontrada): void {
    if (this.cargandoDetalle) {
      return;
    }
    this.cargandoDetalle = o.IdOrdenServicio;
    this.servicio.obtenerExpedienteDocumental(o.IdOrdenServicio).subscribe({
      next: (r: any) => {
        this.cargandoDetalle = '';
        if (r?.estado !== 1 || !r.Cabecera) { this.funciones.mensaje('error', r?.mensaje || 'No se pudo leer el expediente.'); return; }
        this.seleccionado = {
          Cabecera: r.Cabecera,
          Expedientes: r.Expedientes || [],
          Documentos: r.Documentos || [],
          Historial: r.Historial || []
        };
        this.grupos = this.agrupar(this.seleccionado.Documentos);
        this.pestana = 'orden';
      },
      error: () => { this.cargandoDetalle = ''; this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.'); }
    });
  }

  cerrarDetalle(): void {
    this.seleccionado = null;
    this.grupos = [];
    this.cerrarVisorPdf();
  }

  private agrupar(documentos: DocumentoCadena[]): GrupoDocumentos[] {
    const grupos: GrupoDocumentos[] = [];
    documentos.forEach(d => {
      const clave = this.grupoDe(d);
      let g = grupos.find(x => x.clave === clave);
      if (!g) {
        g = { clave, Modulo: d.Modulo, CodigoExpediente: d.CodigoExpediente, documentos: [] };
        grupos.push(g);
      }
      g.documentos.push(d);
    });
    return grupos;
  }

  private grupoDe(d: DocumentoCadena): string {
    return `${d.Modulo} · ${d.CodigoExpediente}`;
  }

  /* --------------------------------------------------------- expediente PDF/ZIP */

  /**
   * Descarga todos los documentos en el orden de la base (módulo, expediente y
   * fecha) y los entrega con una carátula que lleva el índice y la
   * trazabilidad. El PDF une PDF e imágenes; el ZIP lleva los originales.
   */
  descargar(formato: 'PDF' | 'ZIP'): void {
    const det = this.seleccionado;
    if (!det || this.generando) {
      return;
    }
    const porGrupo = new Map<string, number>();
    const fuentes: Fuente[] = [];
    det.Documentos.forEach(d => {
      const id = idDocumentoSistema(d.GeneradoDocumento);
      if (!id) {
        return;
      }
      const grupo = this.grupoDe(d);
      const n = (porGrupo.get(grupo) || 0) + 1;
      porGrupo.set(grupo, n);
      fuentes.push({
        indice: fuentes.length,
        grupo,
        nombre: `${String(n).padStart(2, '0')} ${this.titulo(d)}${this.extension(d, id)}`,
        fecha: d.Fecha,
        id,
        carpeta: d.Carpeta || ''
      });
    });
    if (!fuentes.length) {
      this.funciones.mensaje('info', 'El expediente no tiene documentos para descargar.');
      return;
    }

    this.generando = true;
    this.paso = `Descargando ${fuentes.length} documento(s)…`;
    from(fuentes).pipe(
      mergeMap(f => this.bajar(f).pipe(map(blob => ({ f, blob }))), DESCARGAS_EN_PARALELO),
      toArray()
    ).subscribe({
      next: async (res) => {
        try {
          res.sort((a, b) => a.f.indice - b.f.indice);
          const ok = res.filter(r => !!r.blob && r.blob.size > 0);
          const archivos: ArchivoExpediente[] = ok.map(r => ({ grupo: r.f.grupo, nombre: r.f.nombre, blob: r.blob! }));
          const faltan = res.length - ok.length;
          const c = det.Cabecera;
          const nombreBase = `Expediente ${c.TipoOrden} ${c.NumeroOrden || c.CodigoRequerimiento}`;

          if (formato === 'PDF') {
            this.paso = 'Uniendo los documentos…';
            const preparados = await prepararArchivos(archivos);
            const incluido = new Map(ok.map((r, i) => [r.f.indice, preparados[i].incluido]));
            const caratula = await this.documentos.generarPdf(construirIndiceExpedienteDocumental(det,
              this.indice(res.map(r => r.f), f => incluido.has(f.indice) ? (incluido.get(f.indice) ? 'SI' : 'NO') : 'FALTA'), false));
            this.abrirVisor(await unirEnPdf(caratula, preparados), nombreBase, `${nombreBase}.pdf`,
              `${fuentes.length} documento(s) con índice y trazabilidad`);
            const soloZip = preparados.filter(p => !p.incluido).length;
            if (soloZip > 0) {
              this.funciones.mensaje('info', `${soloZip} documento(s) no son PDF ni imagen (p. ej. Word); se incluyen solo en el ZIP.`);
            }
          } else {
            this.paso = 'Comprimiendo…';
            const descargado = new Set(ok.map(r => r.f.indice));
            const caratula = await this.documentos.generarPdf(construirIndiceExpedienteDocumental(det,
              this.indice(res.map(r => r.f), f => descargado.has(f.indice) ? 'SI' : 'FALTA'), true));
            descargarBlob(await empaquetarZip(caratula, archivos), `${nombreBase}.zip`);
          }
          if (faltan > 0) {
            this.funciones.mensaje('warning', `${faltan} documento(s) no se pudieron descargar del file server; figuran en el índice como no disponibles.`);
          }
        } catch {
          this.funciones.mensaje('error', 'No se pudo armar el expediente.');
        } finally {
          this.generando = false;
          this.paso = '';
        }
      },
      error: () => {
        this.generando = false;
        this.paso = '';
        this.funciones.mensaje('error', 'No se pudieron descargar los documentos.');
      }
    });
  }

  private indice(fuentes: Fuente[], estado: (f: Fuente) => ItemIndice['estado']): ItemIndice[] {
    return fuentes.map(f => ({ grupo: f.grupo, nombre: f.nombre.replace(/^\d+ /, ''), fecha: f.fecha, estado: estado(f) }));
  }

  /** Carpeta del módulo primero; luego las demás, por documentos subidos antes del ajuste de carpetas. */
  private bajar(f: Fuente) {
    const alternativas = CARPETAS.filter(c => c !== f.carpeta);
    const descarga = f.carpeta
      ? this.maestra.descargarArchivoConFallback(f.id, f.carpeta, alternativas)
      : this.maestra.descargarArchivo(f.id);
    return descarga.pipe(catchError(() => of(null as Blob | null)));
  }

  private titulo(d: DocumentoCadena): string {
    return `${d.Documento}${d.Numero ? ' ' + d.Numero : ''}`;
  }

  private extension(d: DocumentoCadena, id: string): string {
    const patron = /\.[a-z0-9]{2,5}$/i;
    return patron.exec(id)?.[0] || patron.exec(d.NombreDocumento || '')?.[0] || '.pdf';
  }

  /* -------------------------------------------------------------------- visor */

  verDocumento(d: DocumentoCadena): void {
    const id = idDocumentoSistema(d.GeneradoDocumento);
    if (!id) { this.funciones.mensaje('info', 'Este documento no tiene archivo en el file server.'); return; }
    const ext = this.extension(d, id).toLowerCase();
    this.bajar({ indice: 0, grupo: '', nombre: '', fecha: null, id, carpeta: d.Carpeta || '' }).subscribe(blob => {
      if (!blob) { this.funciones.mensaje('error', `No fue posible abrir el documento (${id}).`); return; }
      if (ext !== '.pdf') {
        descargarBlob(blob, `${this.titulo(d)}${ext}`);
        return;
      }
      this.abrirVisor(blob, this.titulo(d), `${this.titulo(d)}.pdf`, `${d.Modulo} · ${d.CodigoExpediente}`);
    });
  }

  private abrirVisor(blob: Blob, titulo: string, nombreArchivo: string, subtitulo: string): void {
    this.cerrarVisorPdf();
    this.visorPdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    this.visorPdfTitulo = titulo;
    this.visorPdfSubtitulo = subtitulo;
    this.visorPdfNombre = nombreArchivo;
    this.visorPdfObjectUrl = URL.createObjectURL(this.visorPdfBlob);
    this.visorPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.visorPdfObjectUrl);
  }

  descargarVisor(): void {
    if (this.visorPdfBlob) {
      descargarBlob(this.visorPdfBlob, this.visorPdfNombre);
    }
  }

  cerrarVisorPdf(): void {
    if (this.visorPdfObjectUrl) { URL.revokeObjectURL(this.visorPdfObjectUrl); }
    this.visorPdfObjectUrl = '';
    this.visorPdfUrl = null;
    this.visorPdfTitulo = '';
    this.visorPdfSubtitulo = '';
    this.visorPdfNombre = '';
    this.visorPdfBlob = null;
  }

  /* ----------------------------------------------------------------- formatos */

  fecha(valor: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }

  monto(valor: number | null | undefined): string {
    return Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
