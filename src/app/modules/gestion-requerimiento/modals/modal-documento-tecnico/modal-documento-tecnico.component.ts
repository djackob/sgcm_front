import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import { PedidoRequerimiento, RequerimientoDetalle } from '../../models/requerimiento.model';
import { PENALIDAD_INTRO, PENALIDAD_MORA_CIERRE, PENALIDAD_MORA_TEXTO } from '../../documentos/anexo3-tdr.plantilla';
import {
  CARPETA_DOCUMENTO_TECNICO,
  DocumentoTecnicoFormulario,
  construirDocumentoTecnico,
  crearDocumentoTecnico,
  etiquetaDescripcionTecnica,
  leerDocumentoTecnico,
  metaDocumentoTecnico,
  nombreArchivoDocumentoTecnico
} from '../../documentos/documento-tecnico';
import { filaOtraPenalidadVacia, normalizarFilasPenalidad } from '../../documentos/penalidad';

@Component({
  selector: 'app-modal-documento-tecnico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-documento-tecnico.component.html',
  styleUrl: './modal-documento-tecnico.component.scss'
})
export class ModalDocumentoTecnicoComponent implements OnChanges {

  @Input() embebido = false;
  @Input() idParaAbrir: string | null = null;
  @Output() registrado = new EventEmitter<void>();

  abierto = false;
  cargando = false;
  guardando = false;
  detalle: RequerimientoDetalle | null = null;
  pedidos: PedidoRequerimiento[] = [];
  formulario: DocumentoTecnicoFormulario = crearDocumentoTecnico();
  readonly penalidadMora = `${PENALIDAD_INTRO}\n\n${PENALIDAD_MORA_TEXTO}\n\nPenalidad diaria = (0.10 × monto) / (0.40 × plazo)\n\n${PENALIDAD_MORA_CIERRE}`;

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private funciones: Funciones
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    const id = changes['idParaAbrir']?.currentValue as string | null | undefined;
    if (this.embebido && id) {
      this.abrir(id);
    }
  }

  get anexo(): string {
    return metaDocumentoTecnico(this.detalle?.CodigoTipoContratacion)?.anexo || 'Anexo';
  }

  get etiqueta(): string {
    return metaDocumentoTecnico(this.detalle?.CodigoTipoContratacion)?.etiqueta || 'Documento técnico';
  }

  get etiquetaDescripcion(): string {
    return etiquetaDescripcionTecnica(this.detalle?.CodigoTipoContratacion);
  }

  abrir(idRequerimiento: string): void {
    this.abierto = true;
    this.cargando = true;
    this.formulario = crearDocumentoTecnico();
    this.detalle = null;
    this.pedidos = [];

    this.requerimientoService.obtenerRequerimiento(idRequerimiento).subscribe({
      next: (detalle: any) => {
        if (detalle?.estado === 0) {
          this.cargando = false;
          this.funciones.mensaje('error', detalle?.mensaje || 'No fue posible cargar el requerimiento.');
          return;
        }
        this.detalle = detalle;
        this.pedidos = detalle.Pedidos || [];
        this.requerimientoService.listarDocumento(detalle.IdExpediente).subscribe({
          next: (docs: any) => {
            this.cargando = false;
            const meta = metaDocumentoTecnico(detalle.CodigoTipoContratacion);
            const lista = this.listaDocumentos(docs);
            const doc = lista.find((d: any) => d.CodigoTipoDocumento === meta?.codigo);
            this.formulario = leerDocumentoTecnico(this.comoObjeto(doc?.Payload));
          },
          error: () => {
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.funciones.mensaje('error', 'No fue posible cargar el requerimiento.');
      }
    });
  }

  cerrar(): void {
    if (this.guardando) {
      return;
    }
    this.abierto = false;
  }

  guardar(): void {
    if (!this.detalle || this.guardando) {
      return;
    }
    const meta = metaDocumentoTecnico(this.detalle.CodigoTipoContratacion);
    if (!meta) {
      this.funciones.mensaje('info', 'Este objeto no usa este formulario.');
      return;
    }
    const faltante = this.primerVacio();
    if (faltante) {
      this.funciones.mensaje('info', `Complete ${faltante}.`);
      return;
    }

    this.formulario.OtrasPenalidades = normalizarFilasPenalidad(this.formulario.OtrasPenalidades);
    this.guardando = true;
    const definicion = construirDocumentoTecnico(this.detalle, this.formulario, this.pedidos);
    const nombre = nombreArchivoDocumentoTecnico(this.detalle, meta.anexo);
    this.documentoService.generarYSubir(definicion, nombre, CARPETA_DOCUMENTO_TECNICO).subscribe({
      next: (archivo: any) => {
        const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
        if (archivo?.estado !== 1 || !documentoSistema) {
          this.guardando = false;
          this.funciones.mensaje('error', archivo?.mensaje || 'No se pudo subir el anexo.');
          return;
        }
        this.requerimientoService.registrarDocumento(
          this.detalle!.IdExpediente,
          meta.codigo,
          documentoSistema,
          archivo.documento_original || nombre,
          { Codigo: this.detalle!.Codigo, DocumentoTecnico: this.formulario }
        ).subscribe({
          next: (doc: any) => {
            this.guardando = false;
            if (doc?.estado !== 1) {
              this.funciones.mensaje('error', doc?.mensaje || 'No se registró el anexo.');
              return;
            }
            this.funciones.mensaje('success', `Se registró ${meta.anexo} del requerimiento ${this.detalle?.Codigo}.`);
            this.registrado.emit();
            if (!this.embebido) {
              this.abierto = false;
            }
          },
          error: () => {
            this.guardando = false;
            this.funciones.mensaje('error', 'No se registró el anexo.');
          }
        });
      },
      error: () => {
        this.guardando = false;
        this.funciones.mensaje('error', 'No se pudo subir el anexo.');
      }
    });
  }

  agregarPenalidad(): void {
    this.formulario.OtrasPenalidades = [
      ...(this.formulario.OtrasPenalidades || []),
      filaOtraPenalidadVacia()
    ];
  }

  quitarPenalidad(indice: number): void {
    this.formulario.OtrasPenalidades = (this.formulario.OtrasPenalidades || []).filter((_, i) => i !== indice);
  }

  private primerVacio(): string {
    const campos: { clave: Exclude<keyof DocumentoTecnicoFormulario, 'OtrasPenalidades'>; nombre: string }[] = [
      { clave: 'Finalidad', nombre: 'la finalidad' },
      { clave: 'Descripcion', nombre: 'la descripción técnica' },
      { clave: 'Lugar', nombre: 'el lugar de entrega o prestación' },
      { clave: 'Requisitos', nombre: 'los requisitos' },
      { clave: 'Conformidad', nombre: 'la conformidad' },
      { clave: 'FormaPago', nombre: 'la forma de pago' }
    ];
    const vacio = campos.find(c => !(this.formulario[c.clave] || '').trim());
    return vacio?.nombre || '';
  }

  private comoObjeto(valor: any): any {
    if (typeof valor !== 'string' || !valor.trim()) {
      return valor;
    }
    try {
      return JSON.parse(valor);
    } catch {
      return {};
    }
  }

  private listaDocumentos(docs: any): any[] {
    let lista = docs?.Documentos ?? docs?.documentos ?? [];
    if (typeof lista === 'string') {
      try {
        lista = JSON.parse(lista);
      } catch {
        lista = [];
      }
    }
    return Array.isArray(lista) ? lista : [];
  }
}
