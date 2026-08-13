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
