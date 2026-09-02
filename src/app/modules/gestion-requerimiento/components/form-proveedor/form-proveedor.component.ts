import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MaestraService } from '../../../../shared/services/maestra.service';
import { Funciones } from '../../../../shared/funciones/funciones';
import {
  PedidoFormularioRequerimiento,
  ProveedorFormularioRequerimiento,
  montoTotalProveedor
} from '../../models/requerimiento.model';

export interface UbigeoDepartamento {
  iddpto: string;
  departamento: string;
}

export interface UbigeoProvincia {
  idprov: string;
  provincia: string;
}

export interface UbigeoDistrito {
  iddist: string;
  distrito: string;
}

@Component({
  selector: 'app-form-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-proveedor.component.html',
  styleUrl: './form-proveedor.component.scss',
})
export class FormProveedorComponent implements OnInit, OnChanges {

  @Input({ required: true }) proveedor!: ProveedorFormularioRequerimiento;
  @Input() indice = 0;
  @Input() total = 1;
  @Input() puedeQuitar = false;
  @Input() pedidos: PedidoFormularioRequerimiento[] = [];

  @Output() quitar = new EventEmitter<void>();

  readonly tiposDocumento = [
    { valor: 'DNI' as const, nombre: 'DNI' },
    { valor: 'CE' as const, nombre: 'Carné de extranjería' }
    // { valor: 'RUC' as1 const, nombre: 'RUC' }
  ];

  readonly tiposRegistro = [
    { valor: 'NUEVO' as const, nombre: 'Nuevo' },
    { valor: 'EXISTENTE' as const, nombre: 'Existente' }
  ];

  departamentos: UbigeoDepartamento[] = [];
  provincias: UbigeoProvincia[] = [];
  distritos: UbigeoDistrito[] = [];

  buscandoPersona = false;
  private dniConsultado = '';

  constructor(
    private maestraService: MaestraService,
    private funciones: Funciones,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.aplicarPedidoPorDefecto();
    this.cargarDepartamentos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidos']) {
      queueMicrotask(() => this.aplicarPedidoPorDefecto());
    }
  }

  get prefijo(): string {
    return `proveedor-${this.indice}`;
  }

  get montoTotal(): number {
    return montoTotalProveedor(this.proveedor);
  }

  get pedidosConNumero(): PedidoFormularioRequerimiento[] {
    return (this.pedidos || []).filter(p => !!(p.NumeroPedido || '').trim());
  }

  private aplicarPedidoPorDefecto(): void {
    const numeros = this.pedidosConNumero.map(p => p.NumeroPedido.trim());
    if (numeros.length === 1) {
      this.proveedor.NumeroPedido = numeros[0];
    }
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
        const direccion = (datos.strdireccion || '').trim();
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
        this.proveedor.Direccion = direccion;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscandoPersona = false;
        this.funciones.mensaje('error', 'No fue posible consultar RENIEC.');
        this.cdr.detectChanges();
      }
    });
  }

  onDepartamentoChange(): void {
    const elegido = this.departamentos.find(d => d.iddpto === this.proveedor.CodDepartamento);
    this.proveedor.Departamento = elegido?.departamento || '';
    this.proveedor.CodProvincia = '';
    this.proveedor.Provincia = '';
    this.proveedor.CodDistrito = '';
    this.proveedor.Distrito = '';
    this.provincias = [];
    this.distritos = [];
    if (this.proveedor.CodDepartamento) {
      this.cargarProvincias(this.proveedor.CodDepartamento);
    }
  }

  onProvinciaChange(): void {
    const elegido = this.provincias.find(p => p.idprov === this.proveedor.CodProvincia);
    this.proveedor.Provincia = elegido?.provincia || '';
    this.proveedor.CodDistrito = '';
    this.proveedor.Distrito = '';
    this.distritos = [];
    if (this.proveedor.CodProvincia) {
      this.cargarDistritos(this.proveedor.CodProvincia);
    }
  }

  onDistritoChange(): void {
    const elegido = this.distritos.find(d => d.iddist === this.proveedor.CodDistrito);
    this.proveedor.Distrito = elegido?.distrito || '';
  }

  private cargarDepartamentos(): void {
    this.maestraService.listarDepartamento().subscribe({
      next: (lista) => {
        this.departamentos = lista;
        if (this.proveedor.CodDepartamento) {
          this.cargarProvincias(this.proveedor.CodDepartamento, true);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.funciones.mensaje('error', 'No fue posible listar los departamentos.');
      }
    });
  }

  private cargarProvincias(iddpto: string, restaurar = false): void {
    this.maestraService.listarProvincia(iddpto).subscribe({
      next: (lista) => {
        this.provincias = lista;
        if (restaurar && this.proveedor.CodProvincia) {
          this.cargarDistritos(this.proveedor.CodProvincia);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.funciones.mensaje('error', 'No fue posible listar las provincias.');
      }
    });
  }

  private cargarDistritos(idprov: string): void {
    this.maestraService.listarDistrito(idprov).subscribe({
      next: (lista) => {
        this.distritos = lista;
        this.cdr.detectChanges();
      },
      error: () => {
        this.funciones.mensaje('error', 'No fue posible listar los distritos.');
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
