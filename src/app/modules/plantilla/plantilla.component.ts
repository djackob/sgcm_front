import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { SsoLoginService } from '../../core/services/sso-login.service';
import { Menu } from './models/IMenu';
import { Login } from '../../core/interfaces/login.interface';
import { MetodoService } from '../../core/services/metodo.service';

const INTERVALO_ALERTAS_MS = 5 * 60 * 1000;

const RUTA_MODULO: Record<string, string> = {
  CMN: 'gestion-cmn',
  REQUERIMIENTO: 'gestion-requerimiento',
  EJECUCION: 'gestion-ejecucion',
  MODIFICACION: 'gestion-modificacion',
  RESOLUCION: 'gestion-resolucion',
  PAGO: 'gestion-pago'
};

type TipoAlerta = 'VENCIDO' | 'POR_VENCER' | 'PENDIENTE';

interface AlertaModulo {
  CodigoModulo: string;
  Modulo: string;
  Pendientes: number;
  PorVencer: number;
  Vencidos: number;
  Nuevas: number;
}

interface AlertaItem {
  IdExpediente: string;
  CodigoModulo: string;
  Modulo: string;
  Codigo: string;
  BuscarCodigo: string;
  Estado: string;
  Descripcion: string | null;
  FechaLimite: string | null;
  Tipo: TipoAlerta;
  DiasParaVencer: number | null;
  Nueva: boolean;
}

interface ResumenAlertas {
  Pendientes: number;
  PorVencer: number;
  Vencidos: number;
  Nuevas: number;
  Modulos: AlertaModulo[];
  Items: AlertaItem[];
}

@Component({
  selector: 'app-plantilla',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './plantilla.component.html',
  styleUrl: './plantilla.component.scss'
})
export class PlantillaComponent implements OnInit, OnDestroy {
  siglas_usuario = '';
  nombre_usuario = '';
  perfil_usuario = '';
  menu_activo = false;
  menu: Menu[] = [];
  alertas: ResumenAlertas | null = null;
  campana_activa = false;
  private modulosPermitidos = new Set<string>();
  private temporizadorAlertas: ReturnType<typeof setInterval> | null = null;

  constructor(
    private router: Router,
    private SessionService: SessionService,
    private ssoService: SsoLoginService,
    private route: ActivatedRoute,
    private api: MetodoService
  ) {
  }

  ngOnDestroy(): void {
    document.getElementsByTagName('body')[0].classList.remove('tema-01');
    if (this.temporizadorAlertas) {
      clearInterval(this.temporizadorAlertas);
    }
  }

  get totalAlertas(): number {
    return this.alertas?.Nuevas || 0;
  }

  get hayVencidoNuevo(): boolean {
    return !!this.alertas?.Items.some(i => i.Nueva && i.Tipo === 'VENCIDO');
  }

  private iniciarAlertas(): void {
    const usuario: Login = this.SessionService.getUsuario();
    const menu: any[] = (usuario?.detalle?.[0]?.perfil?.[0]?.menu as any[]) || [];
    const urls = menu.map(m => String(m?.url || ''));
    Object.entries(RUTA_MODULO).forEach(([modulo, ruta]) => {
      if (urls.some(u => u.includes(ruta))) {
        this.modulosPermitidos.add(modulo);
      }
    });
    if (this.modulosPermitidos.size === 0) {
      return;
    }
    this.cargarAlertas();
    this.temporizadorAlertas = setInterval(() => this.cargarAlertas(), INTERVALO_ALERTAS_MS);
  }

  cargarAlertas(): void {
    this.api.GET('api/sigcm/resumenAlertas', {}).subscribe({
      next: (r: any) => { this.alertas = r?.estado === 1 ? this.soloPermitidos(r) : null; },
      error: () => { this.alertas = null; }
    });
  }

  private soloPermitidos(r: ResumenAlertas): ResumenAlertas {
    const modulos = (r.Modulos || []).filter(m => this.modulosPermitidos.has(m.CodigoModulo));
    const suma = (campo: 'Pendientes' | 'PorVencer' | 'Vencidos' | 'Nuevas') =>
      modulos.reduce((total, m) => total + (Number(m[campo]) || 0), 0);
    return {
      Pendientes: suma('Pendientes'),
      PorVencer: suma('PorVencer'),
      Vencidos: suma('Vencidos'),
      Nuevas: suma('Nuevas'),
      Modulos: modulos,
      Items: (r.Items || [])
        .filter(i => this.modulosPermitidos.has(i.CodigoModulo))
        .map(i => ({ ...i, Nueva: !!i.Nueva }))
    };
  }

  /** El descuento es inmediato; el servidor lo confirma en la siguiente carga. */
  private marcarVista(item: AlertaItem): void {
    if (!item.Nueva || !this.alertas) {
      return;
    }
    item.Nueva = false;
    this.alertas.Nuevas = Math.max(0, (this.alertas.Nuevas || 0) - 1);
    const modulo = this.alertas.Modulos.find(m => m.CodigoModulo === item.CodigoModulo);
    if (modulo) {
      modulo.Nuevas = Math.max(0, (modulo.Nuevas || 0) - 1);
    }
    this.api.POST('api/sigcm/marcarAlertaVista', { IdExpediente: item.IdExpediente, Tipo: item.Tipo })
      .subscribe({ error: () => { } });
  }

  ActivarCampana(): void {
    this.campana_activa = !this.campana_activa;
    if (this.campana_activa) {
      this.menu_activo = false;
      this.cargarAlertas();
    }
  }

  AbrirAlerta(item: AlertaItem): void {
    this.campana_activa = false;
    this.marcarVista(item);
    const ruta = RUTA_MODULO[item.CodigoModulo];
    if (!ruta) {
      return;
    }
    const queryParams = item.CodigoModulo === 'PAGO'
      ? { exp: item.IdExpediente }
      : { buscar: item.BuscarCodigo };
    this.router.navigate(['/' + ruta], { queryParams });
  }

  AbrirModulo(modulo: AlertaModulo): void {
    this.campana_activa = false;
    const ruta = RUTA_MODULO[modulo.CodigoModulo];
    if (ruta) {
      this.router.navigate(['/' + ruta]);
    }
  }

  EtiquetaTipo(tipo: TipoAlerta): string {
    return tipo === 'VENCIDO' ? 'Vencido' : tipo === 'POR_VENCER' ? 'Por vencer' : 'Por atender';
  }

  ngOnInit(): void {
    document.getElementsByTagName('body')[0].classList.add('tema-01');
    const usuario = this.SessionService.getUsuario();

    this.nombre_usuario = usuario.nombre + ' ' + (usuario.apellido_paterno || '');
    this.siglas_usuario = usuario.nombre.toUpperCase().substring(0, 1) + (usuario.apellido_paterno || '').substring(0, 1);
    this.perfil_usuario = (usuario.detalle[0] != undefined) ? usuario.detalle[0].perfil[0].perfil : '';
    this.ArmarMenu();
    this.iniciarAlertas();
  }

  Salir(e: any) {
    e.preventDefault();
    this.ssoService.loginOut().subscribe({
      next: data => {
        sessionStorage.clear();
        window.location.href = (data?.estado === 'OK' && data?.mensaje)
          ? data.mensaje
          : this.ssoService.urlLoginSso();
      },
      error: () => {
        sessionStorage.clear();
        window.location.href = this.ssoService.urlLoginSso();
      }
    });
  }

  ActivarMenu() {
    this.menu_activo = !(this.menu_activo);
    if (this.menu_activo) {
      this.campana_activa = false;
    }
  }

  ArmarMenu(): Promise<any> {
    return new Promise((resolve) => {
      const usuario: Login = this.SessionService.getUsuario();
      const menu_sesion = (usuario.detalle[0] != undefined) ? usuario.detalle[0].perfil[0].menu : [];

      if (menu_sesion != null) {
        this.menu = this.getJSONmenu(menu_sesion) as Menu[];
        resolve(true);
      }
    });
  }

  getJSONmenu(data: any): any {
    let i = 0;
    let item: any;
    const rpta: any = [];
    for (i = 0; i < data.length; i++) {
      item = data[i];
      if (item['nivel'] == 0) {
        item.hijos = this.cargarMenu(data, item['id_menu'], (item['nivel'] + 1));
        rpta.push(item);
      }
    }
    return rpta;
  }

  cargarMenu(_data: [], _id_menu: number, _nivel: number) {
    let i = 0;
    let item: any;
    const submenu = [];
    for (i = 0; i < _data.length; i++) {
      item = _data[i];
      if (item['id_menu_padre'] == _id_menu && item['nivel'] == _nivel) {
        item.hijos = this.cargarMenu(_data, item['id_menu'], (item['nivel'] + 1));
        submenu.push(item);
      }
    }
    return submenu;
  }

  MostrarMenu() {
    /* El menú de usuario (nav.sub-menu) también es un <nav>; hay que apuntar
       al lateral. Si se tomaba el primero, tras abrir el perfil el clic del
       hamburguesa no abría el menú y parecía que las opciones no respondían. */
    const elemento = document.querySelector('nav.menu') as HTMLElement | null;
    elemento?.classList.remove('inactive');
  }

  OcultarMenu() {
    const elemento = document.querySelector('nav.menu') as HTMLElement | null;
    elemento?.classList.add('inactive');
  }

  ExpandirMenu(id_menu: number) {
    const elemento: HTMLElement = (document.querySelector(`[data-id-menu='${id_menu}']`)) as HTMLElement;
    if (elemento.classList.contains('menu_abierto')) {
      elemento.classList.remove('menu_abierto');
      elemento.classList.add('menu_cerrado');
    } else {
      elemento.classList.add('menu_abierto');
      elemento.classList.remove('menu_cerrado');
    }
  }
}
