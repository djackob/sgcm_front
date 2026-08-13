import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio',
  },
  {
    path: 'requerimiento/anexo5-listado/5',
    loadComponent: () => import('../gestion-cmn/gestion-cmn.component').then(m => m.GestionCmnComponent),
  },
  {
    path: 'servicios/bandeja-listado',
    loadComponent: () => import('../bandeja-externo/bandeja-externo.component').then(m => m.BandejaExternoComponent),
  },
  {
    path: 'gestion-cmn',
    loadComponent: () => import('../gestion-cmn/gestion-cmn.component').then(m => m.GestionCmnComponent),
  },
];
