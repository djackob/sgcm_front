import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio',
  },
  {
    /* Ruta heredada del prototipo. Apuntaba a la bandeja del CMN porque el
       módulo de requerimiento no existía; ahora lleva al suyo. Se conserva
       para no romper enlaces guardados: la ruta del menú es
       'gestion-requerimiento', que es la que siembra sigcm.Modulo. */
    path: 'requerimiento/anexo5-listado/5',
    redirectTo: 'gestion-requerimiento',
  },
  {
    path: 'servicios/bandeja-listado',
    loadComponent: () => import('../bandeja-externo/bandeja-externo.component').then(m => m.BandejaExternoComponent),
  },
  {
    path: 'gestion-cmn',
    loadComponent: () => import('../gestion-cmn/gestion-cmn.component').then(m => m.GestionCmnComponent),
  },
  {
    /* Debe coincidir exactamente con sigcm.Modulo.Ruta: el guard compara
       menu.url contra route.routeConfig.path. */
    path: 'gestion-requerimiento',
    loadComponent: () => import('../gestion-requerimiento/gestion-requerimiento.component')
      .then(m => m.GestionRequerimientoComponent),
  },
];
