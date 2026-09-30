import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MetodoService } from '../../../core/services/metodo.service';

type TipoGrupo = 'BIENES' | 'CEAM' | 'LOCADOR' | 'SERVICIOS';

interface ExpedienteAtencion {
  IdExpediente: string;
  Codigo: string;
  Denominacion: string | null;
  CodigoTipoContratacion: string | null;
  TipoGrupo: TipoGrupo;
  IdEspecialista: string | null;
  Especialista: string;
  Grupo: string;
  GrupoOrden: number;
  CodigoEstado: string;
  Estado: string;
  AreaSigla: string;
  Area: string | null;
  UltimoMovimiento: string | null;
  DiasInactivo: number | null;
  Monto: number | null;
  Proveedores: string | null;
}

interface OrdenVigente {
  IdOrdenServicio: string;
  NumeroOrden: string | null;
  TipoOrden: string | null;
  CodigoTipoContratacion: string | null;
  TipoGrupo: TipoGrupo;
  CodigoRequerimiento: string | null;
  Denominacion: string | null;
  AreaSigla: string;
  Area: string | null;
  Monto: number | null;
  Entregables: number;
  Proveedor: string | null;
  Ruc: string | null;
  FechaInicio: string | null;
  FechaFin: string | null;
  DiasRestantes: number | null;
  Estado: string | null;
}

interface EstadoAtencion {
  Grupo: string;
  Orden: number;
}

interface Conteo {
  etiqueta: string;
  total: number;
}

interface FilaPivot {
  etiqueta: string;
  valores: Record<string, number>;
  total: number;
}

interface GrupoSituacional {
  tipo: TipoGrupo;
  filas: ExpedienteAtencion[];
  subtotales: Record<string, number>;
}

type Cuadro = 'ASIGNADOS' | 'TIPO' | 'ESTADO' | 'INACTIVIDAD' | 'AREA' | 'SITUACIONAL' | 'ORDENES';

const GRUPOS_FUERA_DE_ASIGNADOS = ['CCP/EN ATENCIÓN', 'EMISIÓN DE ORDEN'];
const SIN_HISTORIAL = 'SIN HISTORIAL';

/**
 * Cuadros de atencion de expedientes de Abastecimiento (sigcm.paDashboardAtencion):
 * carga por especialista, tipo, estado, inactividad, area usuaria, reporte
 * situacional y ordenes vigentes. Los cuadros se arman en cliente sobre el
 * mismo detalle, por eso el filtro de tipo no vuelve a consultar.
 */
@Component({
  selector: 'app-dashboard-atencion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-atencion.component.html',
  styleUrl: './dashboard-atencion.component.scss'
})
export class DashboardAtencionComponent implements OnInit {

  readonly tipos: TipoGrupo[] = ['BIENES', 'CEAM', 'LOCADOR', 'SERVICIOS'];
  readonly etiquetaTipo: Record<TipoGrupo, string> = {
    BIENES: 'Bienes', CEAM: 'CEAM', LOCADOR: 'Locación', SERVICIOS: 'Servicios'
  };
  readonly cuadros: { id: Cuadro; nombre: string }[] = [
    { id: 'ASIGNADOS', nombre: 'Asignados en atención' },
    { id: 'TIPO', nombre: 'Por tipo' },
    { id: 'ESTADO', nombre: 'Por estado de atención' },
    { id: 'INACTIVIDAD', nombre: 'Alertas de inactividad' },
    { id: 'AREA', nombre: 'Por área usuaria' },
    { id: 'SITUACIONAL', nombre: 'Reporte situacional' },
    { id: 'ORDENES', nombre: 'Órdenes vigentes' }
  ];

  cuadro: Cuadro = 'ASIGNADOS';
  tipoFiltro: TipoGrupo | '' = '';
  diasAlerta = 3;

  cargando = false;
  error = '';
  fechaReporte = '';

  private expedientes: ExpedienteAtencion[] = [];
  private ordenes: OrdenVigente[] = [];
  estados: string[] = [];

  expVisibles: ExpedienteAtencion[] = [];
  asignados: Conteo[] = [];
  totalAsignados = 0;
  porTipo: FilaPivot[] = [];
  totalesTipo: Record<string, number> = {};
  maximoTipo = 1;
  porEstado: FilaPivot[] = [];
  totalesEstado: Record<string, number> = {};
  rangosInactividad: string[] = [];
  porInactividad: FilaPivot[] = [];
  totalesInactividad: Record<string, number> = {};
  alertas: ExpedienteAtencion[] = [];
  porArea: Conteo[] = [];
  maximoArea = 1;
  situacional: GrupoSituacional[] = [];
  totalesSituacional: Record<string, number> = {};
  ordenesVisibles: OrdenVigente[] = [];
  montoOrdenes = 0;

  constructor(private api: MetodoService) { }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.api.GET('api/dashboard/atencionExpedientes', {}).subscribe({
      next: (r: any) => {
        this.cargando = false;
        if (r?.estado !== 1) {
          this.error = r?.mensaje || 'No fue posible leer el dashboard de atención.';
          return;
        }
        this.fechaReporte = r.FechaReporte || '';
        this.estados = (Array.isArray(r.Estados) ? r.Estados as EstadoAtencion[] : [])
          .sort((a, b) => a.Orden - b.Orden)
          .map(e => e.Grupo);
        this.expedientes = Array.isArray(r.Expedientes) ? r.Expedientes : [];
        this.ordenes = Array.isArray(r.Ordenes) ? r.Ordenes : [];
        this.recalcular();
      },
      error: (e: any) => {
        this.cargando = false;
        this.error = e?.mensaje || 'No fue posible comunicarse con el servicio.';
      }
    });
  }

  recalcular(): void {
    const tipo = this.tipoFiltro;
    this.expVisibles = this.expedientes.filter(x => !tipo || x.TipoGrupo === tipo);
    this.ordenesVisibles = this.ordenes.filter(o => !tipo || o.TipoGrupo === tipo);
    this.montoOrdenes = this.ordenesVisibles.reduce((s, o) => s + (o.Monto ?? 0), 0);

    const enAtencion = this.expVisibles.filter(x => !GRUPOS_FUERA_DE_ASIGNADOS.includes(x.Grupo));
    this.asignados = this.contar(enAtencion, x => x.Especialista);
    this.totalAsignados = enAtencion.length;

    this.porTipo = this.pivot(this.expVisibles, x => x.Especialista, x => x.TipoGrupo, this.tipos);
    this.totalesTipo = this.totalizar(this.porTipo, this.tipos);
    this.maximoTipo = Math.max(1, ...this.porTipo.map(f => f.total));

    this.porEstado = this.pivot(this.expVisibles, x => x.Especialista, x => x.Grupo, this.estados);
    this.totalesEstado = this.totalizar(this.porEstado, this.estados);

    const rangoAlerta = `${this.diasAlerta}+ DÍAS`;
    this.rangosInactividad = [rangoAlerta, SIN_HISTORIAL];
    this.alertas = this.expVisibles
      .filter(x => x.DiasInactivo == null || x.DiasInactivo >= this.diasAlerta)
      .sort((a, b) => (b.DiasInactivo ?? Infinity) - (a.DiasInactivo ?? Infinity));
    this.porInactividad = this.pivot(this.alertas, x => x.Especialista,
      x => x.DiasInactivo == null ? SIN_HISTORIAL : rangoAlerta, this.rangosInactividad);
    this.totalesInactividad = this.totalizar(this.porInactividad, this.rangosInactividad);

    this.porArea = this.contar(this.expVisibles, x => x.AreaSigla);
    this.maximoArea = Math.max(1, ...this.porArea.map(a => a.total));

    this.situacional = this.tipos
      .map(t => {
        const filas = this.expVisibles
          .filter(x => x.TipoGrupo === t)
          .sort((a, b) => a.AreaSigla.localeCompare(b.AreaSigla) || a.Especialista.localeCompare(b.Especialista));
        const subtotales: Record<string, number> = {};
        this.estados.forEach(e => subtotales[e] = filas.filter(f => f.Grupo === e).length);
        return { tipo: t, filas, subtotales };
      })
      .filter(g => g.filas.length > 0);
    this.totalesSituacional = {};
    this.estados.forEach(e => this.totalesSituacional[e] = this.expVisibles.filter(x => x.Grupo === e).length);
  }

  cambiarDiasAlerta(): void {
    const n = Math.floor(Number(this.diasAlerta));
    this.diasAlerta = Number.isFinite(n) && n > 0 ? n : 3;
    this.recalcular();
  }

  get maximoAsignados(): number {
    return Math.max(1, ...this.asignados.map(a => a.total));
  }

  alto(valor: number, maximo: number): number {
    return (valor / maximo) * 100;
  }

  claseTipo(tipo: string): string {
    return 'tipo--' + tipo.toLowerCase();
  }

  claseDias(dias: number | null): string {
    if (dias == null) {
      return 'nivel--sin';
    }
    return dias >= this.diasAlerta * 2 ? 'nivel--bajo' : 'nivel--medio';
  }

  claseRestante(dias: number | null): string {
    if (dias == null) {
      return 'nivel--sin';
    }
    if (dias < 0) {
      return 'nivel--bajo';
    }
    return dias <= 15 ? 'nivel--medio' : 'nivel--alto';
  }

  trackEtiqueta = (_: number, f: { etiqueta: string }) => f.etiqueta;
  trackExpediente = (_: number, x: ExpedienteAtencion) => x.IdExpediente;
  trackOrden = (_: number, o: OrdenVigente) => o.IdOrdenServicio;

  private contar(lista: ExpedienteAtencion[], clave: (x: ExpedienteAtencion) => string): Conteo[] {
    const mapa = new Map<string, number>();
    lista.forEach(x => mapa.set(clave(x), (mapa.get(clave(x)) ?? 0) + 1));
    return [...mapa.entries()]
      .map(([etiqueta, total]) => ({ etiqueta, total }))
      .sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta));
  }

  private pivot(lista: ExpedienteAtencion[], fila: (x: ExpedienteAtencion) => string,
                columna: (x: ExpedienteAtencion) => string, columnas: string[]): FilaPivot[] {
    const mapa = new Map<string, FilaPivot>();
    lista.forEach(x => {
      const clave = fila(x);
      let f = mapa.get(clave);
      if (!f) {
        f = { etiqueta: clave, valores: Object.fromEntries(columnas.map(c => [c, 0])), total: 0 };
        mapa.set(clave, f);
      }
      const c = columna(x);
      f.valores[c] = (f.valores[c] ?? 0) + 1;
      f.total++;
    });
    return [...mapa.values()].sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta));
  }

  private totalizar(filas: FilaPivot[], columnas: string[]): Record<string, number> {
    const t: Record<string, number> = { TOTAL: 0 };
    columnas.forEach(c => t[c] = 0);
    filas.forEach(f => {
      columnas.forEach(c => t[c] += f.valores[c] ?? 0);
      t['TOTAL'] += f.total;
    });
    return t;
  }
}
