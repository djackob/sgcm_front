import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoFormularioRequerimiento } from '../../models/requerimiento.model';

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

  @Output() quitar = new EventEmitter<void>();

  get prefijo(): string {
    return `pedido-${this.indice}`;
  }
}
