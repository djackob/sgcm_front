import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetodoService } from '../../core/services/metodo.service';
import { Funciones } from '../../shared/funciones/funciones';

interface FirmanteConfig {
  CodigoRol: string;
  OrdenFirma: number;
  EtiquetaCargo: string;
  Activo?: boolean;
  NombreRol?: string;
}

interface RolDisponible {
  CodigoRol: string;
  Nombre: string;
}

/**
 * Mantenimiento de firmantes del Anexo 4 (CMN). Solo ADMIN_SISTEMA.
 * La config vigente se materializa al generar cada paquete (snapshot).
 */
@Component({
  selector: 'app-mantenimiento-firmantes-a4',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mantenimiento-firmantes-a4.component.html',
  styleUrl: './mantenimiento-firmantes-a4.component.scss'
})
export class MantenimientoFirmantesA4Component implements OnInit {

  firmantes: FirmanteConfig[] = [];
  rolesDisponibles: RolDisponible[] = [];
  cargando = false;
  guardando = false;
  error = '';

  constructor(
    private api: MetodoService,
    private funciones: Funciones
  ) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.api.GET('api/cmn/listarConfigFirmanteAnexo4', {}).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) {
          this.error = r?.mensaje || 'No fue posible leer la configuración.';
          return;
        }
        this.rolesDisponibles = r.RolesDisponibles || [];
        const lista = (r.Firmantes || []) as FirmanteConfig[];
        this.firmantes = lista.length
          ? lista.map((f, i) => ({
              CodigoRol: f.CodigoRol,
              OrdenFirma: f.OrdenFirma || i + 1,
              EtiquetaCargo: f.EtiquetaCargo || ''
            }))
          : [{ CodigoRol: 'ABAST_JEFE', OrdenFirma: 1, EtiquetaCargo: 'Jefe de la Unidad de Abastecimiento' }];
      },
      error: (e: any) => {
        this.cargando = false;
        this.error = e?.mensaje || 'No fue posible comunicarse con el servicio.';
      }
    });
  }

  agregar(): void {
    if (this.firmantes.length >= 2) {
      return;
    }
    const usado = new Set(this.firmantes.map(f => f.CodigoRol));
    const libre = this.rolesDisponibles.find(r => !usado.has(r.CodigoRol));
    if (!libre) {
      this.funciones.mensaje('error', 'No quedan roles disponibles para un segundo firmante.');
      return;
    }
    this.firmantes.push({
      CodigoRol: libre.CodigoRol,
      OrdenFirma: this.firmantes.length + 1,
      EtiquetaCargo: ''
    });
    this.renumerar();
  }

  quitar(indice: number): void {
    if (this.firmantes.length <= 1) {
      return;
    }
    this.firmantes.splice(indice, 1);
    this.renumerar();
  }

  subir(indice: number): void {
    if (indice <= 0) {
      return;
    }
    const tmp = this.firmantes[indice - 1];
    this.firmantes[indice - 1] = this.firmantes[indice];
    this.firmantes[indice] = tmp;
    this.renumerar();
  }

  bajar(indice: number): void {
    if (indice >= this.firmantes.length - 1) {
      return;
    }
    const tmp = this.firmantes[indice + 1];
    this.firmantes[indice + 1] = this.firmantes[indice];
    this.firmantes[indice] = tmp;
    this.renumerar();
  }

  guardar(): void {
    if (this.firmantes.length < 1 || this.firmantes.length > 2) {
      this.funciones.mensaje('error', 'Configure 1 o 2 firmantes.');
      return;
    }
    const roles = this.firmantes.map(f => f.CodigoRol);
    if (new Set(roles).size !== roles.length) {
      this.funciones.mensaje('error', 'No repita el mismo rol en dos firmas.');
      return;
    }

    this.guardando = true;
    this.api.POST('api/cmn/guardarConfigFirmanteAnexo4', {
      Firmantes: this.firmantes.map((f, i) => ({
        CodigoRol: f.CodigoRol,
        OrdenFirma: i + 1,
        EtiquetaCargo: f.EtiquetaCargo || null
      }))
    }).subscribe({
      next: (r: any) => {
        this.guardando = false;
        if (r?.estado !== 1) {
          this.funciones.mensaje('error', r?.mensaje || 'No fue posible guardar.');
          return;
        }
        this.funciones.mensaje('success', r?.mensaje || 'Configuración guardada.');
        this.cargar();
      },
      error: (e: any) => {
        this.guardando = false;
        this.funciones.mensaje('error', e?.mensaje || 'No fue posible comunicarse con el servicio.');
      }
    });
  }

  rolesPara(indice: number): RolDisponible[] {
    const usados = new Set(
      this.firmantes
        .filter((_, i) => i !== indice)
        .map(f => f.CodigoRol)
    );
    return this.rolesDisponibles.filter(r => !usados.has(r.CodigoRol) || r.CodigoRol === this.firmantes[indice]?.CodigoRol);
  }

  private renumerar(): void {
    this.firmantes.forEach((f, i) => { f.OrdenFirma = i + 1; });
  }
}
