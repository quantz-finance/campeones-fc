# Campeones FC: iconos de interfaz

Iconos de nav (tab bar) y de la app, escritos a mano en código. Siguen la línea de los sets v4/v5: sobrios, de geometría limpia y terminaciones redondeadas, sin brillos.

## Contenido
- `nav/<tab>-inactivo.svg` (trazo) y `nav/<tab>-activo.svg` (sólido): 7 pestañas, 14 archivos.
- `app/<nombre>.svg`: 85 iconos.
- `png/<nombre>-<24|48|96>.png`: cada icono a 24, 48 y 96 px en #37003C, con fondo transparente (297 archivos).
- `_hoja-de-contacto.png`: todos los iconos con su nombre, en cuatro paneles:
  - morado sobre blanco a 24 px;
  - blanco sobre #37003C a 24 px;
  - morado sobre blanco a 48 px;
  - blanco sobre #37003C a 48 px.
- `_hoja-nav.png`: tab bar simulada, en oscuro y en claro, con cada pestaña activa por turno, más todos los pares inactivo/activo.
- `iconos.json`: lista de iconos con nombre, archivo, categoría, tipo (trazo o sólido) y tab.
- `_build/`: el generador.

## Reglas de grilla y trazo
- `viewBox="0 0 24 24"`. Área viva de unos 20 px (de 2 a 22) con 2 px de margen.
- Iconos de trazo (todos los de `app/` y los `-inactivo`):
  - `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"` y `stroke-linejoin="round"`, declarados en la raíz;
  - los puntos pequeños (menú, info, notificación, etc.) son círculos con `fill="currentColor"` y `stroke="none"`.
- Iconos sólidos (`-activo`):
  - un solo `<path>` con `fill="currentColor"` y `fill-rule="evenodd"`;
  - su contorno exterior coincide con el borde exterior del trazo del icono inactivo, así que ambos tienen el mismo tamaño óptico;
  - los detalles (la cruz de registrar, el check de grupos, las divisiones del podio, los dígitos del marcador) son calados del mismo grosor de 1.75.
- No hay `<text>`, `<filter>`, `<image>`, fuentes, transforms ni colores fijos. Son compatibles con react-native-svg.
- Las coordenadas van a la grilla de 0.25 px, con verticales y horizontales en enteros o medios. Con un trazo de 1.75 ninguna línea cae exacta en píxel: a 24 px el borde lleva un poco de antialias, igual que en Lucide.

## Cómo teñir
Todos los iconos heredan el color con `currentColor`.
- **Web:** `<svg style="color:#37003C">` o con CSS (`color: ...`).
- **react-native-svg:** con `react-native-svg-transformer`, `<Icono color="#37003C" width={24} height={24} />`. También se puede pasar `color` o `stroke` como prop.
- Colores sugeridos:
  - pestaña activa: blanco o #37003C según el fondo, más un indicador verde #00FF87;
  - inactiva: lila #C9A2FF al 75 % sobre morado;
  - acentos (punto de notificación, en-vivo, victoria): #00FF87, que se aplica tiñendo el icono entero o superponiendo el punto.

## Nav
| Tab | Inactivo | Activo | Origen |
|---|---|---|---|
| inicio | casa | casa sólida | mockup y brief |
| grupos | escudo con check | escudo sólido con el check calado | mockup (el escudo con check es el icono que usa el mockup) |
| registrar | círculo con + | disco sólido con el + calado | mockup (botón central «Registrar») y brief (tab «jugar») |
| torneos | copa | copa sólida | mockup y brief |
| perfil | persona | persona sólida | mockup y brief |
| ranking | podio | podio sólido | extra, por si se agrega la pestaña |
| partidos | marcador | marcador sólido | extra, por si se agrega la pestaña |

El orden del mockup es: inicio · grupos · **registrar** (en el centro) · torneos · perfil.

## Lista de iconos de app
- **acciones** (19): agregar, menos, cerrar, menu-mas, buscar, filtrar, ordenar, editar, borrar, compartir, copiar, copiar-enlace, enlace, enviar, refrescar, descargar, qr, ojo, ojo-oculto
- **navegacion** (6): atras, adelante, chevron-abajo, chevron-arriba, flecha-atras, menu
- **social** (8): invitar-amigo, usuario, amigos, correo, chat, comentario, reaccion, ubicacion
- **multimedia** (4): camara, galeria, subir-foto, foto-perfil
- **estados** (13): notificaciones, notificaciones-punto, ayuda, info, check, confirmado, verificado, alerta, error, reloj, pendiente, reportar, en-vivo
- **ajustes** (9): ajustes, cerrar-sesion, candado, idioma, tema-oscuro, tema-claro, sonido, sonido-apagado, vibracion
- **tiempo** (3): calendario, historial, cronometro
- **datos** (4): estadisticas, grafica, tendencia-sube, tendencia-baja
- **partido** (7): victoria, derrota, empate, balon, control-de-juego, marcador, vs
- **logros** (8): racha, estrella, medalla, trofeo, corona, escudo, podio, rayo
- **torneos** (2): tabla-posiciones, llaves
- **vistas** (2): lista, cuadricula

## Regenerar
```
cd _build
python3 build.py
```
- Necesita Python con `shapely` y `svgpathtools` (para los sólidos) y Chrome con playwright-core (para los PNG y las hojas).
- `icons.py`: define los iconos de app.
- `nav.py`: define las pestañas y genera los sólidos (unión del relleno y el trazo con buffer de 0.875, menos los calados).
- `render.js`: genera los PNG y las dos hojas.
