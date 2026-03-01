import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full'
  },
  {
    path: 'discretos/binominal',
    loadComponent: () =>
      import('./Discretos/binominal/binominal')
        .then(b => b.Binominal)
  },
  {
    path: 'continuos/normal',
    loadComponent: () =>
      import('./Continuos/normal/normal')
        .then(n => n.Normal)
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./Bars/inicio/inicio')
        .then(i => i.Inicio)
  },
  {
    path: 'lectura/archivos',
    loadComponent: () =>
      import('./Lectura/archivos/archivos')
        .then(a => a.Archivos)
  }
];
