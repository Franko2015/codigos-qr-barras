# Códigos QR y de barras

Aplicación web (Angular 22) para **crear, descargar, imprimir y guardar** códigos QR y códigos de barras. Es responsive y todo se procesa en el dispositivo del usuario: no se envía nada a ningún servidor.

## Funciones

- **Inventario automático**: al elegir código de barras «Inventario», la app sugiere un código único como `SKU-48203917` (iniciales configurables, 8 números al azar que no repiten tus códigos guardados).
- **Crear**: código QR (enlaces, textos) o código de barras (Code 128, EAN-13, EAN-8, UPC-A, Code 39, ITF-14, Codabar), con validación y cálculo automático del dígito de control.
- **Personalizar**: colores (con aviso si el contraste impide la lectura), margen, nivel de corrección del QR, alto y grosor de barras.
- **Descargar**: PNG en alta resolución o SVG vectorial.
- **Imprimir**: elige número de copias, ancho en cm y si se muestra el nombre debajo.
- **Guardar**: en el almacenamiento local del navegador (sección «Guardados»), con búsqueda, edición y borrado.
- **Compartir**: en celulares, abre el menú del sistema para enviarlo o guardarlo en la galería.
- **Instalable (PWA)**: en teléfonos y tablets se puede instalar en la pantalla de inicio y funciona sin internet. En Android aparece el botón «Instalar app»; en iPhone/iPad se muestran los pasos (Compartir → Agregar a pantalla de inicio). En computadoras no se ofrece instalar.

## Publicar

- Se necesita **HTTPS** para que la app se pueda instalar (en `localhost` funciona sin HTTPS).
- El servidor SSR solo acepta los dominios permitidos: agrega el tuyo en `angular.json` → `security.allowedHosts` (por ejemplo `["codigos.midominio.com"]`) o usa la variable de entorno `NG_ALLOWED_HOSTS`.
- El service worker solo está activo en la compilación de producción (`npm run build`), no en `npm start`.

## Desarrollo

```bash
npm install
npm start          # http://localhost:4200
npm test           # pruebas unitarias (Vitest)
npm run build      # compilación de producción en dist/
```

## Estructura

- `src/app/core/` — modelo y validación (`code-spec.ts`), generación SVG (`code-renderer.ts`), exportación (`code-export.ts`), guardado local (`saved-codes.ts`), impresión y avisos.
- `src/app/features/generator/` — pantalla para crear códigos.
- `src/app/features/saved/` — códigos guardados.
- `src/app/core/install-app.ts` — detección de teléfono/tablet e instalación.
- `src/app/shared/` — diálogo y hoja de impresión, banner e instrucciones de instalación, avisos.
- `public/manifest.webmanifest`, `public/icons/`, `ngsw-config.json` — configuración de la app instalable.
