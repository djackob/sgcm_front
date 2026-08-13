import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import {
  ItemModificacionCmn,
  crearItemModificacionVacio,
} from '../../models/item-modificacion-cmn.model';

@Component({
  selector: 'app-modal-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './modal-registro.component.html',
  styleUrl: './modal-registro.component.scss',
})
export class ModalRegistroComponent {
  readonly breadcrumb = ['Gestión CMN', 'Área Usuaria', 'Especialista'];

  abierto = false;
  itemsModificacion: ItemModificacionCmn[] = [crearItemModificacionVacio()];

  solicitud = {
    areaUsuaria: 'Gerencia de Infraestructura',
    fecha: '2026-08-12',
    responsable: 'María López Quispe',
    cargo: 'Especialista de Área Usuaria',
    numeroSolicitud: 'SCM-2026-0042',
  };

  abrir(): void {
    this.itemsModificacion = [crearItemModificacionVacio()];
    this.abierto = true;
  }

  cerrar(): void {
    this.abierto = false;
  }

  agregarItem(): void {
    this.itemsModificacion = [...this.itemsModificacion, crearItemModificacionVacio()];
  }
}
