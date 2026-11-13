# Campeones FC: iconos de login (cajón «Entrar»)

Iconos de los tres botones de login: Apple, Google y correo. **Los logos de Apple y Google son los archivos oficiales.** No los dibujé a mano ni les cambié la forma ni el color. El de correo es nuestro.

## Archivos
| Archivo | Qué es | Origen | ¿Funciona en react-native-svg? |
|---|---|---|---|
| `google.svg` | «G» oficial sola | `oficial/google/Android + Web/SVG/Light/…Show text=No, Shape=Square…svg`. Solo se le quitaron los dos `<path>` del rectángulo del botón y se cambió el `viewBox` a `8 8 24 24`, para que la G de 20 px quede centrada en una grilla de 24 con 2 px de margen. La G no se tocó. | **No**: usa `mask`, `filter` y `foreignObject` con un `conic-gradient`. Ver «Cómo usarlo en la app». |
| `google-boton-claro.svg` | botón oficial de solo icono, tema claro (#FFFFFF con borde #747775) | oficial, sin cambios | No (mismo motivo) |
| `google-sobre-oscuro.svg` | botón oficial de solo icono, tema oscuro (#131314 con borde #8E918F) | oficial, sin cambios | No |
| `apple-blanco.svg` | logo Apple blanco, versión «Logo only» (trae su cuadro negro y su margen) | `oficial/apple/Sign in with Apple - Logo Only/SVG/…White.svg`, sin cambios | Sí (solo `rect` y `path`, colores fijos) |
| `apple-negro.svg` | logo Apple negro, «Logo only» (cuadro blanco) | `…Logo-only - Black.svg`, sin cambios | Sí |
| `apple-blanco-con-texto.svg` / `apple-negro-con-texto.svg` | logo para botón con texto, alineado a la izquierda, tamaño Medium (31×44) | `oficial/apple/Sign in with Apple - Left Aligned/SVG/…Medium.svg`, sin cambios | Sí |
| `correo.svg` | sobre de trazo 1.75 con `currentColor`, igual que `app/correo.svg` | propio | Sí |
| `correo-solido.svg` | sobre sólido con la solapa calada, `currentColor` | propio | Sí |
| `png/<nombre>-24/48/96.png` | render en Chrome de cada SVG. El correo va en #37003C. Los logos llevan sus colores oficiales. Los de «con texto» respetan su proporción de 31×44. | | |
| `oficial/` | paquetes oficiales completos, sin tocar: `signin-assets.zip` de Google (SVG y PNG de 1x a 4x, iOS y Android/Web, claro/neutro/oscuro, cuadrado/píldora) y `Logo-Sign-in-with-Apple.dmg` (SVG, PDF y PNG) con su licencia | | |
| `_hoja-login.png` | cajón simulado sobre #37003C con los tres botones, variante del correo, referencia en fondo claro e iconos sueltos a 24 y 48 px | | |

**Excepciones a las reglas del paquete:** `google*.svg` y `apple-*.svg` no siguen la grilla 0 0 24 24 ni las reglas de «sin filter/transform». Las guías de marca prohíben recortar, redibujar o recolorear esos logos, y los archivos oficiales vienen así.

## Cómo usarlo en la app (react-native)
- **Apple:**
  - en iOS, lo recomendado es el botón nativo `AppleAuthenticationButton` de `expo-apple-authentication`, con `buttonType=CONTINUE` y `buttonStyle=WHITE` (fondo oscuro). Apple lo garantiza, se traduce solo y permite `cornerRadius`;
  - si se necesita un botón propio, por ejemplo para alinear los tres logos o en Android/web: `apple-negro-con-texto.svg` en un botón blanco (o `apple-blanco-con-texto.svg` en uno negro), con el SVG a **la misma altura que el botón**.
- **Google:**
  - el SVG oficial no se renderiza fiel en react-native-svg (filtros y `foreignObject`), así que en la app se usa como **imagen PNG**: `png/google-48.png` / `google-96.png` (render exacto del oficial) o los PNG oficiales de `oficial/google/iOS/PNG @2x|@3x/…`;
  - otra opción es el botón nativo `GoogleSigninButton` de `@react-native-google-signin/google-signin`;
  - en web, `google.svg` funciona tal cual con `<img>`.
- **Correo:** `correo.svg` o `correo-solido.svg` como cualquier icono del paquete, teñido con `color`.

## Qué permite cada guía

### Google: *Sign in with Google Branding Guidelines*
Fuente: https://developers.google.com/identity/branding-guidelines (actualizada el 2026-07-07). Recursos: https://developers.google.com/static/identity/images/signin-assets.zip

- **Logo:**
  - es la «G» estándar a color. Desde 2025–2026 es la *super G* con degradado, ya no la G plana de 4 colores;
  - no se puede cambiar su tamaño relativo ni su color. Está prohibido usar la G monocroma, una G desactualizada o una dibujada a mano;
  - si hace falta otro tamaño, se parte de los archivos del paquete;
  - «Do: use the Google "G" by itself for action button if needed».
- **Temas del botón:**
  - Light: fondo #FFFFFF, borde #747775 de 1 px por dentro, texto #1F1F1F;
  - Dark: fondo #131314, borde #8E918F de 1 px, texto #E3E3E3;
  - Neutral: fondo #F2F2F2 sin borde, texto #1F1F1F;
  - está prohibido poner la G sobre otro color de fondo (el morado #37003C no vale como fondo del botón).
- **Botón oscuro:** está permitido. En el archivo oficial actual, la G va directamente sobre #131314, **sin círculo blanco**. Por eso entregué `google-sobre-oscuro.svg` como el botón oficial oscuro y no agregué ningún círculo, que sería inventar. El texto de la guía todavía dice «appear on a white background», pero sus propios recursos oscuros no lo hacen. En la hoja usé el tema claro, que no deja dudas.
- **Texto:**
  - recomendado: «Sign in with Google», «Sign up with Google» o «Continue with Google». Se puede y se recomienda traducir: «Continuar con Google»;
  - no se puede poner solo «Google».
- **Fuente:** Google Sans Medium, 14/20 (https://fonts.google.com/specimen/Google+Sans).
- **Márgenes:**
  - Android/Web: 12 px antes del logo, 10 px después y 12 px después del texto;
  - iOS: 16 / 12 / 16 px, con altura de referencia 40 (Android/Web) o 44 (iOS) y logo de 20 px.
- **Tamaño:** se puede escalar el botón, pero manteniendo la proporción, sin estirar la G.
- **Prominencia:** el botón de Google debe ser al menos tan visible como los demás de terceros: tamaño y peso visual parecidos.
- **Se recomienda no usar la G sola sin el borde del botón ni sin texto.**

### Apple: *Human Interface Guidelines, Sign in with Apple*
Fuente: https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple. Recursos: https://developer.apple.com/design/resources/ («Sign in with Apple», `Logo-Sign-in-with-Apple.dmg`).

- **Color:**
  - el logo y el texto van los dos en negro o los dos en blanco, sin colores propios;
  - el fondo del botón también es blanco o negro; se admite una textura o un degradado sutil.
- **Estilos:**
  - White, para fondos oscuros: es el que corresponde sobre #37003C;
  - White with outline, para fondos blancos o claros;
  - Black, para fondos claros, nunca sobre negro u oscuro.
- **Logo:**
  - usar solo el arte descargado de Apple Design Resources, nunca un logo propio;
  - no usar el logo como botón;
  - la altura del archivo del logo tiene que ser igual a la del botón;
  - **no recortar el archivo** ni añadirle margen vertical;
  - en botones de solo logo, la proporción es 1:1 y se usa tal cual (se puede enmascarar en círculo o rectángulo redondeado, sin recortar su margen).
- **Texto:**
  - solo «Sign in with Apple», «Sign up with Apple» o «Continue with Apple», con su traducción: «Continuar con Apple»;
  - la fuente, el peso y el tamaño se pueden cambiar, pero manteniendo la proporción del sistema: el texto mide el 43 % de la altura del botón;
  - mayúsculas solo si toda la interfaz va en mayúsculas.
- **Forma:** los botones con logo y texto son rectangulares; el radio de esquina es libre (puede imitar al de los otros botones), y se permite borde o sombra.
- **Tamaño mínimo:** 140 × 30 pt.
- **Márgenes:** el margen alrededor del botón es de al menos 1/10 de su altura; el margen a la derecha del texto, de al menos el 8 % del ancho.
- **Prominencia:** el botón no puede ser más chico que los otros de login y no debe obligar a hacer scroll.
- **App Review revisa todos los botones de Apple que no sean el nativo.**
- **Licencia de Apple Design Resources (incluida en `oficial/apple/`):** dice que los recursos son para maquetas («mock-ups») y que no se pueden incrustar en software. La HIG, en cambio, indica justamente usar este arte para botones propios. Ante esa contradicción, lo más seguro en iOS es el botón nativo.

### Correo (propio)
Sin restricciones externas. Va en el estilo del paquete: trazo 1.75 o sólido, con `currentColor`. En el cajón se ve en verde #00FF87 con icono y texto #37003C, o con contorno blanco.

## Qué no se puede cambiar
- **Google:** el color, el degradado, la forma y la proporción de la G, y los colores de los tres temas del botón. Tampoco se puede poner la G sobre un fondo de color.
- **Apple:** el dibujo del logo, sus colores (solo blanco o negro), el margen que trae el archivo y los títulos permitidos.

## Regenerar
`python3 _build/build_login.py`. Usa el generador del paquete en `../_build/` y Chrome con playwright-core. Actualiza `../iconos.json` (categoría `login`, con `fuente`, `rn_svg` y `png` de cada pieza).
