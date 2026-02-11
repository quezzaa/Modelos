import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  {
    path: 'discretos/binominal',
    loadComponent: () =>
      import('./Discretos/binominal/binominal')
        .then(b => b.Binominal)
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./Bars/inicio/inicio')
        .then(i => i.Inicio)
  }
];
