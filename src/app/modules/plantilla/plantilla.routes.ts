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
  {
    /* sigcm.Modulo.Ruta del modulo EJECUCION (S038). */
    path: 'gestion-ejecucion',
    loadComponent: () => import('../gestion-ejecucion/gestion-ejecucion.component')
      .then(m => m.GestionEjecucionComponent),
  },
  {
    /* sigcm.Modulo.Ruta del modulo MODIFICACION (S039). */
    path: 'gestion-modificacion',
    loadComponent: () => import('../gestion-modificacion/gestion-modificacion.component')
      .then(m => m.GestionModificacionComponent),
  },
  {
    /* sigcm.Modulo.Ruta del modulo RESOLUCION (S040). */
    path: 'gestion-resolucion',
    loadComponent: () => import('../gestion-resolucion/gestion-resolucion.component')
      .then(m => m.GestionResolucionComponent),
  },
  {
    path: 'gestion-pago',
    loadComponent: () => import('../gestion-pago/gestion-pago.component')
      .then(m => m.GestionPagoComponent),
  },
  {
    /* Panel de accesos y perfiles. Sólo lo ve ADMIN_SISTEMA, y no porque esta
       ruta lo compruebe: el menú sale de sigcm.RolModulo y la rutina de la base
       vuelve a validar el rol. Aquí no hay ninguna regla que mantener al día. */
    path: 'mantenimiento-sso',
    loadComponent: () => import('../mantenimiento-sso/mantenimiento-sso.component')
      .then(m => m.MantenimientoSsoComponent),
  },
];
