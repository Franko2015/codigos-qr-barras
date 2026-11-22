import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Crear código QR o de barras',
    loadComponent: () => import('./features/generator/generator').then((m) => m.Generator),
  },
  {
    path: 'guardados',
    title: 'Códigos guardados',
    loadComponent: () => import('./features/saved/saved').then((m) => m.Saved),
  },
  { path: '**', redirectTo: '' },
];
