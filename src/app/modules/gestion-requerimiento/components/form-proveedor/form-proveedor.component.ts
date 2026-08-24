import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import {
  ProveedorFormularioRequerimiento,
  montoTotalProveedor
} from '../../models/requerimiento.model';

@Component({
  selector: 'app-form-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-proveedor.component.html',
  styleUrl: './form-proveedor.component.scss',
})
export class FormProveedorComponent {

  @Input({ required: true }) proveedor!: ProveedorFormularioRequerimiento;
  @Input() indice = 0;
  @Input() total = 1;
  @Input() puedeQuitar = false;

  @Output() quitar = new EventEmitter<void>();

  readonly tiposDocumento = [
    { valor: 'DNI' as const, nombre: 'DNI' },
    { valor: 'CE' as const, nombre: 'Carné de extranjería' },
    { valor: 'RUC' as const, nombre: 'RUC' }
  ];

  readonly tiposRegistro = [
    { valor: 'NUEVO' as const, nombre: 'Nuevo' },
    { valor: 'EXISTENTE' as const, nombre: 'Existente' }
  ];

  buscandoPersona = false;
  private dniConsultado = '';

  constructor(
    private maestraService: MaestraService,
    private funciones: Funciones,
    private cdr: ChangeDetectorRef
  ) { }

  get prefijo(): string {
    return `proveedor-${this.indice}`;
  }

  get montoTotal(): number {
    return montoTotalProveedor(this.proveedor);
  }

  onDniChange(): void {
    const dni = (this.proveedor.Dni || '').replace(/\D/g, '').slice(0, 8);
    this.proveedor.Dni = dni;
    if (this.proveedor.TipoDocumento === 'DNI' && dni.length === 8 && dni !== this.dniConsultado) {
      this.buscarPersonaReniec();
    }
  }

  buscarPersonaReniec(): void {
    if (this.proveedor.TipoDocumento !== 'DNI') {
      return;
    }

    const dni = (this.proveedor.Dni || '').replace(/\D/g, '');
    if (dni.length !== 8) {
      this.funciones.mensaje('info', 'Ingrese un DNI de 8 dígitos para consultar RENIEC.');
      return;
    }
    if (this.buscandoPersona) {
      return;
    }

    this.buscandoPersona = true;
    this.maestraService.consultarInformacionReniec(dni).subscribe({
      next: (rpta: any) => {
        this.buscandoPersona = false;
        const datos = datosReniec(rpta);
        const nombres = (datos.strnombres || '').trim();
        const apellidoPaterno = (datos.strapellidopaterno || '').trim();
        const apellidoMaterno = (datos.strapellidomaterno || '').trim();
        const ok = datos.strcodigo === '0000' || !!nombres || !!apellidoPaterno;

        if (!ok) {
          this.funciones.mensaje('info', datos.strresultado || 'No se encontró a la persona en RENIEC.');
          this.cdr.detectChanges();
          return;
        }

        this.dniConsultado = dni;
        this.proveedor.Nombres = nombres;
        this.proveedor.ApellidoPaterno = apellidoPaterno;
        this.proveedor.ApellidoMaterno = apellidoMaterno;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscandoPersona = false;
        this.funciones.mensaje('error', 'No fue posible consultar RENIEC.');
        this.cdr.detectChanges();
      }
    });
  }
}

function datosReniec(rpta: any): {
  strnombres?: string;
  strapellidopaterno?: string;
  strapellidomaterno?: string;
  strdireccion?: string;
  strcodigo?: string;
  strresultado?: string;
} {
  if (rpta == null || rpta === '') {
    return {};
  }
  if (typeof rpta === 'string') {
    try {
      return datosReniec(JSON.parse(rpta));
    } catch {
      return {};
    }
  }
  if (typeof rpta !== 'object') {
    return {};
  }
  if ('strnombres' in rpta || 'strapellidopaterno' in rpta || 'strcodigo' in rpta) {
    return rpta;
  }
  return {};
}
