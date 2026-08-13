import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ModalRegistroComponent } from './modals/modal-registro/modal-registro.component';
import { ExpedienteCmn } from './models/expediente-cmn.model';
import { BANDEJA_CMN_MOCK } from './data/bandeja-cmn.mock';

@Component({
  selector: 'app-gestion-cmn',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, ModalRegistroComponent],
  templateUrl: './gestion-cmn.component.html',
  styleUrl: './gestion-cmn.component.scss',
})
export class GestionCmnComponent {
  @ViewChild(ModalRegistroComponent) modalRegistro!: ModalRegistroComponent;

  readonly breadcrumb = ['Área Usuaria', 'Especialista'];
  readonly expedientes: ExpedienteCmn[] = BANDEJA_CMN_MOCK;

  get totalExpedientes(): number {
    return this.expedientes.length;
  }

  nuevaSolicitud(): void {
    this.modalRegistro.abrir();
  }

  onAccion(tipo: string, item: ExpedienteCmn): void {
    console.log(tipo, item.expediente);
  }
}
