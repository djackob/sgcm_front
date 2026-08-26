import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequerimientoService } from '../../services/requerimiento.service';
import {
  PedidoFormularioRequerimiento,
  PedidoSiga
} from '../../models/requerimiento.model';

@Component({
  selector: 'app-form-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-pedido.component.html',
  styleUrl: './form-pedido.component.scss',
})
export class FormPedidoComponent {

  @Input({ required: true }) pedido!: PedidoFormularioRequerimiento;
  @Input() indice = 0;
  @Input() total = 1;
  @Input() puedeQuitar = false;
  @Input() opcionesPedido: PedidoSiga[] = [];
  @Input() cargandoPedidos = false;
  @Input() anoEje = 0;
  @Input() secEjec = 1750;
  @Input() centroCosto = '';
  /** Pedidos ya capturados en el requerimiento: el TDR solo los muestra (REQ-09). */
  @Input() soloLectura = false;

  @Output() quitar = new EventEmitter<void>();

  cargandoDetalle = false;
  private detalleSeq = 0;

  constructor(private requerimientoService: RequerimientoService) {}

  get prefijo(): string {
    return `pedido-${this.indice}`;
  }

  get opcionesVisibles(): PedidoSiga[] {
    const actual = (this.pedido?.NumeroPedido || '').trim();
    if (!actual || this.opcionesPedido.some(o => o.NumeroPedido === actual)) {
      return this.opcionesPedido;
    }
    return [
      {
        NumeroPedido: actual,
        MotivoPedido: actual,
        AnoEje: this.pedido.AnoPedido || 0,
        TipoPedido: '',
        ActProy: '',
        FuenteFinanc: '',
        CodigoTarea: '',
        SecFunc: '',
        Programa: ''
      },
      ...this.opcionesPedido
    ];
  }

  onPedidoSeleccionado(nroPedido: string): void {
    const fila = this.opcionesPedido.find(o => o.NumeroPedido === nroPedido);
    this.detalleSeq += 1;
    const seq = this.detalleSeq;

    if (!fila) {
      this.pedido.NumeroPedido = nroPedido || '';
      this.limpiarDetallePedido();
      return;
    }

    this.pedido.NumeroPedido = fila.NumeroPedido || '';
    this.pedido.AnoPedido = fila.AnoEje ?? this.pedido.AnoPedido;
    this.pedido.ProdPy = fila.ActProy || '';
    this.pedido.FuenteFinanc = fila.FuenteFinanc || '';
    this.pedido.Origen = fila.Origen || '';
    this.pedido.Programa = fila.Programa || '';
    this.pedido.ActividadOperativa = fila.CodigoTarea != null && fila.CodigoTarea !== ''
      ? String(fila.CodigoTarea)
      : '';
    this.pedido.MetaPresupuestaria = fila.SecFunc != null && fila.SecFunc !== ''
      ? String(fila.SecFunc)
      : '';
    const meta = Number(fila.SecFunc);
    this.pedido.SecFunc = Number.isFinite(meta) && meta > 0 ? meta : this.pedido.SecFunc;
    if (fila.FechaPedido) {
      this.pedido.FechaPedido = String(fila.FechaPedido).substring(0, 10);
    }

    this.pedido.Clasificador = '';
    this.pedido.CodigoItemPedido = '';
    this.pedido.NombreItemPedido = '';
    this.cargarDetallePedido(fila.NumeroPedido, fila.AnoEje || this.anoEje, seq);
  }

  private limpiarDetallePedido(): void {
    this.cargandoDetalle = false;
    this.pedido.ActividadOperativa = '';
    this.pedido.Programa = '';
    this.pedido.FuenteFinanc = '';
    this.pedido.Origen = '';
    this.pedido.Clasificador = '';
    this.pedido.CodigoItemPedido = '';
    this.pedido.NombreItemPedido = '';
  }

  private cargarDetallePedido(numeroPedido: string, anoEje: number, seq: number): void {
    if (!numeroPedido || !anoEje || !this.centroCosto) {
      return;
    }

    this.cargandoDetalle = true;
    this.requerimientoService.listarPedidoDetalleSiga(
      anoEje,
      numeroPedido,
      this.centroCosto,
      this.secEjec
    ).subscribe({
      next: (detalle) => {
        if (seq !== this.detalleSeq) {
          return;
        }
        this.cargandoDetalle = false;
        if (!detalle) {
          return;
        }
        if (detalle.NombreTarea) {
          this.pedido.ActividadOperativa = detalle.NombreTarea;
        }
        if (detalle.FuenteFinanc) {
          this.pedido.FuenteFinanc = detalle.FuenteFinanc;
        }
        if (detalle.Origen) {
          this.pedido.Origen = detalle.Origen;
        }
        if (detalle.Programa) {
          this.pedido.Programa = detalle.Programa;
        }
        if (detalle.ActProy) {
          this.pedido.ProdPy = detalle.ActProy;
        }
        this.pedido.Clasificador = detalle.Clasificador || '';
        this.pedido.CodigoItemPedido = detalle.CodigoItem || '';
        this.pedido.NombreItemPedido = detalle.NombreItem || '';
      },
      error: () => {
        if (seq !== this.detalleSeq) {
          return;
        }
        this.cargandoDetalle = false;
      }
    });
  }
}
