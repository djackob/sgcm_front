import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccordionModule } from 'ngx-bootstrap/accordion';

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
  ACREDITACION_ESTUDIOS,
  AYUDA_FINALIDAD,
  AYUDA_JUSTIFICACION,
  AYUDA_OBJETIVO,
  CONFORMIDAD_FIJA,
  FINALIDAD_COMPLEMENTO,
  FORMA_PAGO_DOCUMENTOS,
  INTRO_ENTREGABLES,
  JUSTIFICACION_COMPLEMENTO,
  MARCO_LEGAL,
  MESA_PARTES,
  OBSERVACION_ENTREGABLES,
  OTRAS_CONSIDERACIONES,
  PENALIDAD_MORA,
  PLAZO_NOTA,
  RECURSOS_PROVEEDOR,
  RESOLUCION_CONTRACTUAL,
  SOLUCION_CONTROVERSIAS,
  TdrLocacion,
  ajustarEntregables,
  crearTdrLocacion,
  textoFormaPago,
  validarActividadesTdr,
  validarEntregablesTdr
} from '../../documentos/anexo3-tdr.plantilla';
import {
  CARPETA_ANEXO_3,
  TIPO_ANEXO_3,
  construirAnexo3Tdr,
  nombreArchivoAnexo3,
  pedidosDesdeDetalle
} from '../../documentos/anexo3.pdfmake';
import { proveedoresDelRequerimiento } from '../../documentos/anexo5.pdfmake';

/**
 * TDR de locación (Anexo 3). Se abre después de registrar el Anexo 5.
 * Los pedidos SIGA se copian del requerimiento y no se vuelven a capturar
 * (REQ-09). Lo que se elabora aquí son las cláusulas, actividades y entregables.
 */
@Component({
  selector: 'app-modal-anexo3-requerimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, AccordionModule, BreadcrumbComponent, FormPedidoComponent],
  templateUrl: './modal-anexo3.component.html',
  styleUrl: './modal-anexo3.component.scss',
})
export class ModalAnexo3RequerimientoComponent implements OnChanges {

  /** Dentro del registro: sin overlay, datos del Anexo 5 congelados. */
  @Input() embebido = false;
  /** Al setearse (pestaña Anexo 3 o tras grabar el Anexo 5) carga el TDR. */
  @Input() idParaAbrir: string | null = null;
  @Output() registrado = new EventEmitter<void>();
  /** Tras grabar con éxito en el flujo de registro (Anexo 5 + Anexo 3). */
  @Output() completado = new EventEmitter<{
    IdRequerimiento: string;
    IdExpediente: string;
    Version: number;
  }>();

  readonly breadcrumb = ['Requerimiento', 'TDR Locadores · Anexo 3'];
  readonly marcoLegal = MARCO_LEGAL;
  readonly finalidadComplemento = FINALIDAD_COMPLEMENTO;
  readonly justificacionComplemento = JUSTIFICACION_COMPLEMENTO;
  readonly introEntregables = INTRO_ENTREGABLES;
  readonly observacionEntregables = OBSERVACION_ENTREGABLES;
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
  acordeonMarco = true;
  acordeonFinalidad = false;
  acordeonObjetivo = false;
  acordeonJustificacion = false;
  acordeonCaracteristicas = false;
  acordeonEntregables = false;
  acordeonRequisitos = false;
  acordeonConformidad = false;
  acordeonFormaPago = false;
  acordeonLugar = false;
  acordeonPenalidades = false;
  acordeonOtras = false;
  acordeonResolucion = false;
  acordeonControversias = false;

  detalle: RequerimientoDetalle | null = null;
  tdr: TdrLocacion = crearTdrLocacion({});
  pedidos: PedidoFormularioRequerimiento[] = [];
  cantidadEntregables = 1;
  /** Cantidad de entregables capturada en el Anexo 5. Si es > 0, el TDR no la cambia. */
  cantidadDesdeAnexo5 = 0;

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

  get plazoContrato(): number {
    return Number(this.detalle?.PlazoDias) > 0 ? Number(this.detalle?.PlazoDias) : 0;
  }

  /** Alias: el plazo del Anexo 5 no se recalcula con los entregables. */
  get plazoTotal(): number {
    return this.plazoContrato;
  }

  get cantidadFijaAnexo5(): boolean {
    return this.cantidadDesdeAnexo5 > 0;
  }

  get textoRequisitos(): string {
    return [
      '7.1.1. Registro Nacional de Proveedores vigente.',
      '7.1.2. No contar con impedimento para contratar con el Estado, según el artículo 30 de la Ley General de Contrataciones Públicas.',
      `7.1.3. Grado de instrucción: ${this.tdr.PerfilProveedor || ''}`,
      `7.1.4. Capacitación requerida: ${this.tdr.Capacitacion || ''}`,
      `7.1.5. Experiencia general mínima: ${this.tdr.ExperienciaGeneral || ''}`,
      `7.1.6. Experiencia específica mínima: ${this.tdr.ExperienciaEspecifica || ''}`,
      '',
      ACREDITACION_ESTUDIOS,
      '',
      '7.2. Recursos a ser provistos por el/la proveedora',
      RECURSOS_PROVEEDOR
    ].join('\n');
  }

  get textoConformidad(): string {
    return CONFORMIDAD_FIJA;
  }

  get textoFormaPagoVista(): string {
    return `${textoFormaPago(this.tdr.Entregables?.length || 1)}\n\n${FORMA_PAGO_DOCUMENTOS}`;
  }

  get textoPlazo(): string {
    const plazo = this.plazoContrato;
    const linea = plazo
      ? `${plazo} días calendario, contados a partir del día siguiente de la notificación de la orden de servicio o de suscrito el contrato.`
      : PLAZO_NOTA;
    return `10.2. Plazo:\n${linea}\n\n10.3. ${MESA_PARTES}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const id = changes['idParaAbrir']?.currentValue as string | null | undefined;
    if (this.embebido && id) {
      this.abrir(id);
    }
  }

  abrir(idRequerimiento: string): void {
    this.abierto = true;
    this.cargando = true;
    this.guardando = false;
    this.acordeonMarco = true;
    this.detalle = null;
    this.tdr = crearTdrLocacion({});
    this.pedidos = [crearPedidoFormularioRequerimiento()];
    this.cantidadDesdeAnexo5 = 0;
    this.cantidadEntregables = 1;

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
              this.tdr.Capacitacion = this.tdr.Capacitacion || '';
            }
            this.sincronizarEntregablesConAnexo5();
            this.cargando = false;
          },
          error: () => {
            this.sincronizarEntregablesConAnexo5();
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

  agregarActividad(): void {
    this.tdr.Actividades = [...this.tdr.Actividades, { Descripcion: '' }];
  }

  quitarActividad(indice: number): void {
    this.tdr.Actividades = this.tdr.Actividades.filter((_, i) => i !== indice);
  }

  onCantidadEntregables(): void {
    if (this.cantidadDesdeAnexo5 > 0) {
      queueMicrotask(() => {
        this.cantidadEntregables = this.cantidadDesdeAnexo5;
      });
      return;
    }
    if (!this.tdr.Entregables) {
      this.tdr.Entregables = [];
    }
    ajustarEntregables(this.tdr, this.cantidadEntregables, this.plazoContrato);
    this.tdr.Entregables = this.tdr.Entregables.slice();
    const n = this.tdr.Entregables.length;
    if (Number(this.cantidadEntregables) !== n) {
      queueMicrotask(() => {
        this.cantidadEntregables = n;
      });
    }
  }

  private leerCantidadAnexo5(detalle: any): number {
    const proveedores = proveedoresDelRequerimiento(detalle);
    for (const proveedor of proveedores) {
      const n = Math.floor(Number(proveedor?.CantidadEntregables) || 0);
      if (n > 0) {
        return Math.min(20, n);
      }
    }
    return 0;
  }

  private sincronizarEntregablesConAnexo5(): void {
    this.cantidadDesdeAnexo5 = this.leerCantidadAnexo5(this.detalle);
    if (this.cantidadDesdeAnexo5 > 0) {
      ajustarEntregables(this.tdr, this.cantidadDesdeAnexo5, this.plazoContrato);
      this.tdr.Entregables = (this.tdr.Entregables || []).slice();
      this.cantidadEntregables = this.cantidadDesdeAnexo5;
      return;
    }
    this.cantidadEntregables = this.tdr.Entregables?.length || 1;
  }

  grabar(): void {
    if (!this.detalle || this.guardando) {
      return;
    }

    const errActividades = validarActividadesTdr(this.tdr);
    if (errActividades) {
      this.funciones.mensaje('info', errActividades);
      return;
    }

    const errEntregables = validarEntregablesTdr(this.tdr, this.cantidadDesdeAnexo5);
    if (errEntregables) {
      this.funciones.mensaje('info', errEntregables);
      return;
    }

    const entregablesValidos = (this.tdr.Entregables || []).filter(e => (e.Nombre || '').trim());
    if (entregablesValidos.length === 1 && this.cantidadDesdeAnexo5 !== 1) {
      this.funciones.Mensaje(
        'question',
        'Un solo entregable',
        'La contratación quedará con <b>un único entregable</b>. ¿Desea guardar el Anexo 3 y continuar con la firma de los anexos?',
        (result: any) => {
          if (result.isConfirmed) {
            this.ejecutarGrabado();
          }
        },
        'Sí, guardar',
        'No'
      );
      return;
    }

    this.ejecutarGrabado();
  }

  private ejecutarGrabado(): void {
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
            if (!this.embebido) {
              this.abierto = false;
            }
            this.registrado.emit();
            if (this.embebido && this.detalle) {
              this.completado.emit({
                IdRequerimiento: this.detalle.IdRequerimiento,
                IdExpediente: this.detalle.IdExpediente,
                Version: this.detalle.Version
              });
            }
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
