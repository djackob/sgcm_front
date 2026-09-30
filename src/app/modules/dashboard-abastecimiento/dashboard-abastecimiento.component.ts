import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetodoService } from '../../core/services/metodo.service';
import { DashboardAtencionComponent } from './dashboard-atencion/dashboard-atencion.component';

interface ResumenEspecialista {
  IdUsuario: string;
  Nombre: string;
  Cuenta: string;
  Acciones: number;
  Atendidos: number;
  Despachados: number;
  Pendientes: number;
  Devoluciones: number;
  HorasPromedio: number | null;
  DiasMaxEspera: number | null;
  Efectividad: number | null;
}

interface TotalesDashboard {
  Especialistas: number;
  Acciones: number;
  Atendidos: number;
  Despachados: number;
  Pendientes: number;
  SinAsignar: number;
  Devoluciones: number;
  HorasPromedio: number | null;
  Efectividad: number | null;
}

interface PendienteDashboard {
  IdExpediente: string;
  IdUsuario: string | null;
  Codigo: string;
  CodigoModulo: string;
  Modulo: string;
  Estado: string;
  DesdeEl: string;
  DiasEspera: number;
}

interface ModuloDashboard {
  CodigoModulo: string;
  Nombre: string;
}

type MetricaGrafico = 'EFECTIVIDAD' | 'CARGA' | 'TIEMPO';
type ColumnaOrden = keyof ResumenEspecialista;

/**
 * Seguimiento de los especialistas de Abastecimiento. Lo abren el jefe y el
 * coordinador (sigcm.RolModulo, S051); la rutina vuelve a validar el rol.
 */
@Component({
  selector: 'app-dashboard-abastecimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardAtencionComponent],
  templateUrl: './dashboard-abastecimiento.component.html',
  styleUrl: './dashboard-abastecimiento.component.scss'
})
export class DashboardAbastecimientoComponent implements OnInit {

  fechaDesde = '';
  fechaHasta = '';
  codigoModulo = '';
  metrica: MetricaGrafico = 'EFECTIVIDAD';
  vista: 'DESEMPENO' | 'ATENCION' = 'DESEMPENO';

  cargando = false;
  error = '';

  totales: TotalesDashboard | null = null;
  especialistas: ResumenEspecialista[] = [];
  pendientes: PendienteDashboard[] = [];
  modulos: ModuloDashboard[] = [];

  ordenColumna: ColumnaOrden = 'Efectividad';
  ordenAsc = false;
  seleccionado: ResumenEspecialista | null = null;

  constructor(private api: MetodoService) { }

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaHasta = this.iso(hoy);
    this.fechaDesde = this.iso(new Date(hoy.getFullYear(), 0, 1));
    this.cargar();
  }

  cargar(): void {
    if (this.fechaDesde && this.fechaHasta && this.fechaDesde > this.fechaHasta) {
      this.error = 'La fecha inicial no puede ser mayor que la final.';
      return;
    }
    this.cargando = true;
    this.error = '';
    this.seleccionado = null;
    this.api.GET('api/dashboard/resumenEspecialistas', {
      FechaDesde: this.fechaDesde || null,
      FechaHasta: this.fechaHasta || null,
      CodigoModulo: this.codigoModulo || null
    }).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) {
          this.error = r?.mensaje || 'No fue posible leer el dashboard.';
          this.totales = null;
          this.especialistas = [];
          this.pendientes = [];
          return;
        }
        this.totales = r.Totales || null;
        this.especialistas = Array.isArray(r.Especialistas) ? r.Especialistas : [];
        this.pendientes = Array.isArray(r.Pendientes) ? r.Pendientes : [];
        if (!this.modulos.length && Array.isArray(r.Modulos)) {
          this.modulos = r.Modulos;
        }
        this.ordenar(this.ordenColumna, false);
      },
      error: (e: any) => {
        this.cargando = false;
        this.error = e?.mensaje || 'No fue posible comunicarse con el servicio.';
      }
    });
  }

  ordenar(columna: ColumnaOrden, alternar = true): void {
    if (alternar) {
      this.ordenAsc = this.ordenColumna === columna ? !this.ordenAsc : columna === 'Nombre';
    }
    this.ordenColumna = columna;
    const factor = this.ordenAsc ? 1 : -1;
    this.especialistas = [...this.especialistas].sort((a, b) => {
      const x = a[columna];
      const y = b[columna];
      if (typeof x === 'string' || typeof y === 'string') {
        return String(x ?? '').localeCompare(String(y ?? '')) * factor;
      }
      return ((x ?? -1) - (y ?? -1)) * factor;
    });
  }

  iconoOrden(columna: ColumnaOrden): string {
    if (this.ordenColumna !== columna) {
      return 'mdi-swap-vertical';
    }
    return this.ordenAsc ? 'mdi-arrow-up' : 'mdi-arrow-down';
  }

  trackModulo = (_: number, m: ModuloDashboard) => m.CodigoModulo;

  seleccionar(fila: ResumenEspecialista): void {
    this.seleccionado = this.seleccionado?.IdUsuario === fila.IdUsuario ? null : fila;
  }

  get pendientesVisibles(): PendienteDashboard[] {
    if (!this.seleccionado) {
      return this.pendientes;
    }
    return this.pendientes.filter(p => p.IdUsuario === this.seleccionado!.IdUsuario);
  }

  nombreDe(idUsuario: string | null): string {
    if (!idUsuario) {
      return 'Sin asignar';
    }
    return this.especialistas.find(e => e.IdUsuario === idUsuario)?.Nombre || '—';
  }

  get barras(): ResumenEspecialista[] {
    const lista = [...this.especialistas];
    if (this.metrica === 'EFECTIVIDAD') {
      return lista.sort((a, b) => (b.Efectividad ?? -1) - (a.Efectividad ?? -1));
    }
    if (this.metrica === 'TIEMPO') {
      return lista.sort((a, b) => (a.HorasPromedio ?? Infinity) - (b.HorasPromedio ?? Infinity));
    }
    return lista.sort((a, b) => (b.Despachados + b.Pendientes) - (a.Despachados + a.Pendientes));
  }

  get maximoCarga(): number {
    return Math.max(1, ...this.especialistas.map(e => e.Despachados + e.Pendientes));
  }

  get maximoTiempo(): number {
    return Math.max(1, ...this.especialistas.map(e => e.HorasPromedio ?? 0));
  }

  anchoCarga(valor: number): number {
    return (valor / this.maximoCarga) * 100;
  }

  anchoTiempo(valor: number | null): number {
    return ((valor ?? 0) / this.maximoTiempo) * 100;
  }

  claseEfectividad(valor: number | null): string {
    if (valor == null) {
      return 'nivel--sin';
    }
    if (valor >= 80) {
      return 'nivel--alto';
    }
    if (valor >= 50) {
      return 'nivel--medio';
    }
    return 'nivel--bajo';
  }

  tiempoVisible(horas: number | null): string {
    if (horas == null) {
      return '—';
    }
    if (horas < 24) {
      return `${horas.toFixed(1)} h`;
    }
    return `${(horas / 24).toFixed(1)} d`;
  }

  porcentaje(valor: number | null): string {
    return valor == null ? '—' : `${Number(valor).toFixed(1)} %`;
  }

  private iso(fecha: Date): string {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
  }
}
