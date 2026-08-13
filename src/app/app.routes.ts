import { Routes } from '@angular/router';
import { PlantillaComponent } from './modules/plantilla/plantilla.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'sso-acceso',
    pathMatch: 'full'
  },
  {
    path: 'sso-acceso',
    loadComponent: () => import('./modules/sso/sso.component').then(c => c.SsoComponent)
  },
  {
    path: 'sso-acceso-externo',
    loadComponent: () => import('./modules/sso-externo/sso-externo.component').then(c => c.SsoExternoComponent)
  },
  {
    // Ingreso de pruebas sin SSO. Convive con sso-acceso en vez de sustituirlo:
    // la integración con el SSO ya está hecha y debe seguir siendo la puerta por
    // defecto. En producción el backend apaga los endpoints y esta ruta queda
    // sin servicio.
    path: 'acceso-local',
    loadComponent: () => import('./modules/acceso-local/acceso-local.component').then(c => c.AccesoLocalComponent)
  },
  {
    path: '',
    component: PlantillaComponent,
    loadChildren: () => import('./modules/plantilla/plantilla.routes').then(m => m.routes),
  },
  {
    path: 'page-no-found',
    loadComponent: () => import('./modules/page-no-found/page-no-found.component').then(m => m.PageNoFoundComponent)
  },
  {
    path: '**',
    pathMatch: 'full',
    loadComponent: () => import('./modules/page-no-found/page-no-found.component').then(m => m.PageNoFoundComponent)
  },
];
