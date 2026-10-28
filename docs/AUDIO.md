# Sonido de Campeones FC

No hay archivos de audio en el repositorio. Todo el sonido se sintetiza en el navegador con la Web Audio API (`src/ui/audio.ts`).

Eso lo hace propio del proyecto: no hay samples de terceros, no hay una pista con copyright y no suma peso a la descarga. Se puede silenciar, y esa preferencia queda en `localStorage` bajo la clave `campeones-fc-audio-muted`.

## Qué suena

- **Clic**: un golpe corto (onda cuadrada + seno) al pulsar botones, pestañas y fichas.
- **Barrido**: ruido filtrado que sube de tono cuando una pantalla sale y entra la siguiente.
- **Confirmación**: dos notas (un intervalo de tercera) al reactivar el sonido.
- **Música de fondo**: un loop rítmico de estadio (bombo, caja, charles, bajo y un acorde corto) más un rumor grave muy bajo. Arranca solo después del primer gesto, porque el navegador no deja sonar nada solo.

## Volumen

Por defecto (`src/ui/audio-prefs.ts`):

- master `0.85`
- música `0.26` (de fondo)
- efectos `0.62` (por encima de la música)

El interruptor **SONIDO / MUTE** está fijo arriba a la derecha en todas las pantallas. Si el sistema pide menos movimiento, las animaciones se apagan; el sonido sigue disponible y se puede silenciar aparte.

## Licencia

El audio es obra original generada en el cliente por este repositorio. No aplica una licencia de terceros porque no se distribuye ninguna grabación. Se puede usar, modificar y redistribuir junto con el código del proyecto (licencia MIT del repo).
