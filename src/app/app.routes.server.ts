import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Saved codes live in the browser's storage, so that page is rendered on the client.
  { path: 'guardados', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
