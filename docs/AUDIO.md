# Sonido de Campeones FC

No hay archivos de audio en el repositorio. Todo el sonido se sintetiza en el navegador con la Web Audio API (`src/ui/audio.ts`).

Eso lo hace propio del proyecto: no hay samples de terceros, no hay una pista con copyright y no suma peso a la descarga. Se puede silenciar, y esa preferencia queda en `localStorage` bajo la clave `campeones-fc-audio-muted`.

## Cómo está diseñado

La interfaz imita un gráfico de transmisión, no un juego de 8 bits. No hay ondas cuadradas ni notas que se deslicen como un «boing».

- **Clic**: un tick de ruido muy corto (pasa-altos) más un golpe grave de seno a frecuencia fija. Ataque y caída rápidos.
- **Barrido**: dos capas de ruido, una que sube en medios y otra más brillante, para el cambio de pantalla.
- **Confirmación**: el mismo tick, un poco más largo, al reactivar el sonido.
- **Golpe de entrada**: una subida de ruido de menos de medio segundo y un impacto (bombo, crack y un acorde corto). Suena una sola vez, en el primer toque de la portada.
- **Música**: un groove de ocho compases a 124 BPM. Bombo profundo en negras, charles cerrado (y abierto en los contratiempos), palmada, bajo en seno con un asentamiento de unos milisegundos, acordes cortos filtrados y un shaker. Los compases 3 a 6 se llenan; el último abre un hueco y sube un riser antes de volver al golpe. Debajo, un rumor grave muy bajo que respira. Arranca solo después del primer gesto, porque el navegador no deja sonar nada solo. Se pausa si la pestaña queda oculta.

## Volumen

Por defecto (`src/ui/audio-prefs.ts`):

- master `0.85`
- música `0.18` (por debajo de los efectos, aunque el arreglo tenga más capas)
- efectos `0.62`

El interruptor **SONIDO / MUTE** está fijo arriba a la derecha en todas las pantallas. Si el sistema pide menos movimiento, las animaciones se apagan; el sonido sigue disponible y se puede silenciar aparte.

## Licencia

El audio es obra original generada en el cliente por este repositorio. No aplica una licencia de terceros porque no se distribuye ninguna grabación. Se puede usar, modificar y redistribuir junto con el código del proyecto (licencia MIT del repo).
