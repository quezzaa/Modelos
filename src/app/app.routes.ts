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
  },
  {
    path: 'discretos/poisson',
    loadComponent: () =>
      import('./Discretos/poisson/poisson')
        .then(p => p.Poisson)
  },
  { path: 'discretos/colas',
    loadComponent: () =>
      import('./Discretos/colas/colas')
        .then(c => c.Colas)
  },
];
