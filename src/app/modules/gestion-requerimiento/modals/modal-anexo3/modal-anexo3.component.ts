import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormPedidoComponent } from '../../components/form-pedido/form-pedido.component';
import { RequerimientoService } from '../../services/requerimiento.service';
import { DocumentoService } from '../../../../core/services/documento.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import { idDocumentoSistema } from '../../../../shared/funciones/archivo';
import {
  PedidoFormularioRequerimiento,
  RequerimientoDetalle,
  crearPedidoFormularioRequerimiento
} from '../../models/requerimiento.model';
import {
  AYUDA_FINALIDAD,
  AYUDA_JUSTIFICACION,
  AYUDA_OBJETIVO,
  CONFORMIDAD_PLANTILLA,
  FINALIDAD_COMPLEMENTO,
  FORMA_PAGO,
  INTRO_ENTREGABLES,
  JUSTIFICACION_COMPLEMENTO,
  MARCO_LEGAL,
  OBSERVACION_ENTREGABLES,
  OTRAS_CONSIDERACIONES,
  PENALIDAD_MORA,
  PLAZO_PLANTILLA,
  REQUISITOS_PLANTILLA,
  RESOLUCION_CONTRACTUAL,
  SOLUCION_CONTROVERSIAS,
  TdrLocacion,
  ajustarEntregables,
  crearTdrLocacion,
  interpolar,
  plazoEntregables
} from '../../documentos/anexo3-tdr.plantilla';
import {
  CARPETA_ANEXO_3,
  TIPO_ANEXO_3,
  construirAnexo3Tdr,
  nombreArchivoAnexo3,
  pedidosDesdeDetalle
} from '../../documentos/anexo3.pdfmake';

type PestanaTdr = 'clausulas' | 'actividades' | 'entregables';

/**
 * TDR de locación (Anexo 3). Se abre después de registrar el Anexo 5.
 * Los pedidos SIGA se copian del requerimiento y no se vuelven a capturar
 * (REQ-09). Lo que se elabora aquí son las cláusulas, actividades y entregables.
 */
@Component({
  selector: 'app-modal-anexo3-requerimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, FormPedidoComponent],
  templateUrl: './modal-anexo3.component.html',
  styleUrl: './modal-anexo3.component.scss',
})
export class ModalAnexo3RequerimientoComponent {

  @Output() registrado = new EventEmitter<void>();

  readonly breadcrumb = ['Requerimiento', 'TDR Locadores · Anexo 3'];
  readonly marcoLegal = MARCO_LEGAL;
  readonly finalidadComplemento = FINALIDAD_COMPLEMENTO;
  readonly justificacionComplemento = JUSTIFICACION_COMPLEMENTO;
  readonly introEntregables = INTRO_ENTREGABLES;
  readonly observacionEntregables = OBSERVACION_ENTREGABLES;
  readonly formaPago = FORMA_PAGO;
  readonly penalidadMora = PENALIDAD_MORA;
  readonly otrasConsideraciones = OTRAS_CONSIDERACIONES;
  readonly resolucionContractual = RESOLUCION_CONTRACTUAL;
  readonly solucionControversias = SOLUCION_CONTROVERSIAS;
  readonly ayudaFinalidad = AYUDA_FINALIDAD;
  readonly ayudaObjetivo = AYUDA_OBJETIVO;
  readonly ayudaJustificacion = AYUDA_JUSTIFICACION;

  abierto = false;
  cargando = false;
  guardando = false;
  pestana: PestanaTdr = 'clausulas';

  detalle: RequerimientoDetalle | null = null;
  tdr: TdrLocacion = crearTdrLocacion({});
  pedidos: PedidoFormularioRequerimiento[] = [];
  cantidadEntregables = 1;

  constructor(
    private requerimientoService: RequerimientoService,
    private documentoService: DocumentoService,
    private funciones: Funciones
  ) { }

  get codigo(): string {
    return this.detalle?.Codigo || '';
  }

  get textoUnidad(): string {
    return [this.detalle?.CentroCosto, this.detalle?.CentroCostoNombre]
      .filter(x => !!x)
      .join(' — ');
  }

  get plazoTotal(): number {
    return plazoEntregables(this.tdr);
  }

  get textoRequisitos(): string {
    return interpolar(REQUISITOS_PLANTILLA, {
      EXPERIENCIA_PROVEEDOR: this.tdr.PerfilProveedor || '',
      EXPERIENCIA_GENERAL: this.tdr.ExperienciaGeneral || '',
      EXPERIENCIA_ESPECIFICA: this.tdr.ExperienciaEspecifica || ''
    });
  }

  get textoConformidad(): string {
    const unidad = (this.tdr.UnidadOrganizacional || '').trim();
    return interpolar(CONFORMIDAD_PLANTILLA, {
      UNIDAD_ORGANIZACIONAL: unidad ? `${unidad} ` : ''
    });
  }

  get textoPlazo(): string {
    return interpolar(PLAZO_PLANTILLA, { PLAZO: String(this.plazoTotal || '') });
  }

  abrir(idRequerimiento: string): void {
    this.abierto = true;
    this.cargando = true;
    this.guardando = false;
    this.pestana = 'clausulas';
    this.detalle = null;
    this.tdr = crearTdrLocacion({});
    this.pedidos = [crearPedidoFormularioRequerimiento()];

    this.requerimientoService.obtenerRequerimiento(idRequerimiento).subscribe({
      next: (detalle: any) => {
        if (detalle?.estado !== 1) {
          this.cargando = false;
          this.abierto = false;
          this.funciones.mensaje('error', detalle?.mensaje || 'No fue posible cargar el requerimiento.');
          return;
        }

        this.detalle = detalle;
        this.pedidos = pedidosDesdeDetalle(detalle);
        if (!this.pedidos.length) {
          const vacio = crearPedidoFormularioRequerimiento();
          vacio.AnoPedido = detalle.AnoEje;
          this.pedidos = [vacio];
        }

        this.tdr = crearTdrLocacion({
          plazoDias: detalle.PlazoDias,
          unidad: detalle.CentroCostoNombre
        });

        this.requerimientoService.listarDocumento(detalle.IdExpediente).subscribe({
          next: (docs: any) => {
            const tdrDoc = (docs?.Documentos || [])
              .find((d: any) => d.CodigoTipoDocumento === TIPO_ANEXO_3);
            const previo = this.leerTdr(tdrDoc?.Payload);
            if (previo) {
              this.tdr = { ...this.tdr, ...previo, Entregables: previo.Entregables?.length ? previo.Entregables : this.tdr.Entregables };
            }
            this.cantidadEntregables = this.tdr.Entregables.length || 1;
            this.cargando = false;
          },
          error: () => {
            this.cantidadEntregables = this.tdr.Entregables.length || 1;
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.abierto = false;
        this.funciones.mensaje('error', 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  cerrar(): void {
    if (this.guardando) {
      return;
    }
    this.abierto = false;
  }

  mostrar(pestana: PestanaTdr): void {
    this.pestana = pestana;
  }

  agregarActividad(): void {
    this.tdr.Actividades = [...this.tdr.Actividades, { Descripcion: '' }];
  }

  quitarActividad(indice: number): void {
    this.tdr.Actividades = this.tdr.Actividades.filter((_, i) => i !== indice);
  }

  onCantidadEntregables(): void {
    ajustarEntregables(this.tdr, this.cantidadEntregables);
    this.cantidadEntregables = this.tdr.Entregables.length;
  }

  grabar(): void {
    if (!this.detalle || this.guardando) {
      return;
    }

    this.guardando = true;
    const definicion = construirAnexo3Tdr(this.detalle, this.tdr, this.pedidos);
    const nombre = nombreArchivoAnexo3(this.detalle);

    this.documentoService.generarYSubir(definicion, nombre, CARPETA_ANEXO_3).subscribe({
      next: (archivo: any) => {
        const documentoSistema = idDocumentoSistema(archivo?.documento_sistema);
        if (archivo?.estado !== 1 || !documentoSistema) {
          this.guardando = false;
          this.funciones.mensaje('error', archivo?.mensaje || 'No se pudo subir el Anexo 3.');
          return;
        }

        this.requerimientoService.registrarDocumento(
          this.detalle!.IdExpediente,
          TIPO_ANEXO_3,
          documentoSistema,
          archivo.documento_original,
          { Codigo: this.detalle!.Codigo, Tdr: this.tdr }
        ).subscribe({
          next: (doc: any) => {
            this.guardando = false;
            if (doc?.estado !== 1) {
              this.funciones.mensaje('error', doc?.mensaje || 'No se registró el Anexo 3.');
              return;
            }
            this.abierto = false;
            this.registrado.emit();
            this.funciones.mensaje('success',
              `Se registró el TDR (Anexo 3) del requerimiento ${this.detalle?.Codigo}.`);
          },
          error: () => {
            this.guardando = false;
            this.funciones.mensaje('error', 'No se registró el archivo del Anexo 3.');
          }
        });
      },
      error: () => {
        this.guardando = false;
        this.funciones.mensaje('error', 'No se pudo subir el Anexo 3 al servidor.');
      }
    });
  }

  private leerTdr(payload: any): Partial<TdrLocacion> | null {
    const datos = typeof payload === 'string'
      ? this.parsear(payload)
      : (payload || {});
    const tdr = datos.Tdr || datos.tdr || datos;
    if (!tdr || typeof tdr !== 'object' || Array.isArray(tdr)) {
      return null;
    }
    if (!tdr.FinalidadPublica && !tdr.Objetivo && !tdr.Entregables) {
      return null;
    }
    return tdr;
  }

  private parsear(valor: string): any {
    try {
      return JSON.parse(valor) || {};
    } catch {
      return {};
    }
  }
}
