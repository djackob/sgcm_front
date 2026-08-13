import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { SsoLoginService } from '../../core/services/sso-login.service';
import { Menu } from './models/IMenu';
import { Login } from '../../core/interfaces/login.interface';

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

  constructor(
    private router: Router,
    private SessionService: SessionService,
    private ssoService: SsoLoginService,
    private route: ActivatedRoute
  ) {
  }

  ngOnDestroy(): void {
    document.getElementsByTagName('body')[0].classList.remove('tema-01');
  }

  ngOnInit(): void {
    document.getElementsByTagName('body')[0].classList.add('tema-01');
    const usuario = this.SessionService.getUsuario();

    this.nombre_usuario = usuario.nombre + ' ' + (usuario.apellido_paterno || '');
    this.siglas_usuario = usuario.nombre.toUpperCase().substring(0, 1) + (usuario.apellido_paterno || '').substring(0, 1);
    this.perfil_usuario = (usuario.detalle[0] != undefined) ? usuario.detalle[0].perfil[0].perfil : '';
    this.ArmarMenu();
  }

  Salir(e: any) {
    e.preventDefault();
    this.ssoService.loginOut().subscribe(
      data => {
        if (data.estado == 'OK') {
          sessionStorage.clear();
          window.location.href = data.mensaje;
        }
      }
    );
  }

  ActivarMenu() {
    this.menu_activo = !(this.menu_activo);
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
    const elemento: HTMLElement = document.getElementsByTagName('nav')[0];
    elemento.classList.remove('inactive');
  }

  OcultarMenu() {
    const elemento: HTMLElement = document.getElementsByTagName('nav')[0];
    elemento.classList.add('inactive');
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
