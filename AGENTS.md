# AGENTS.md — Multiply

Guía para agentes (Claude Code u otros) que trabajen en este repositorio.

## Reglas
- Código, identificadores, documentación y comentarios en **inglés**, Textos visibles del juego en **inglés**. Conversaciones y planes de desarrollo en **castellano**. Los ficheros que se haga commit en **inglés**.
- Sin dependencias, sin build, sin red: HTML + CSS + JS clásico (`<script>` normales, NO módulos ES) para que funcione abriendo `index.html` vía `file://`. Todo cuelga del namespace global `window.MX`.
- Licencia MIT. Commits pequeños y frecuentes.
- `make open` abre el juego, `make test` ejecuta tests con node, `make check` valida sintaxis.

## Plan aceptado

### Decisiones de diseño
- Todo se dibuja en un `<canvas>` de 320×180 escalado con `image-rendering: pixelated` (look 8-bit). Fuente bitmap 5×7 propia (Ñ, ¡, ¿, tildes).
- Sonido: WebAudio sintetizado (cuadrada/triángulo/ruido): SFX + música chiptune en bucle. Tecla M = mute.
- Menú: título animado + selector NIVEL 1 / 2 / 3 + START. La dificultad = nivel de inicio. Progresión: Nivel 1 (30 s por pregunta) → Nivel 2 (20 s) → Nivel 3 (10 s) → Monstruo final (5 s).
- Mecánica: aparece `7 × 8 = ?` y 4 asteroides con números; se pulsa el correcto (ratón/táctil o teclas 1-4). Barra de tiempo por pregunta.
- Sin pistas: al fallar o agotar el tiempo NO se muestra la respuesta; la pregunta se reencola.
- Pasar de nivel: acertar las 100 multiplicaciones (1..10 × 1..10) en orden aleatorio.
- Bonus: cartón 10×10 (fila = tabla del N) que se ilumina sin números. Tabla completa = ¡LÍNEA! (+puntos, +1 vida). Cartón completo = ¡BINGO! → fin de nivel + viaje warp.
- 5 vidas. Game over → reintentar nivel o menú.
- Jefe final con 20 de vida, preguntas aleatorias a 5 s.
- Robot-araña animado abajo a la izquierda que reacciona (nunca da pistas).
- Animaciones: estrellas parallax, planetas, hiperespacio, explosiones de partículas, shake, textos flotantes, combos.
- Récord en `localStorage` (con try/catch).

### Estructura
```
index.html, css/style.css
js/font.js       bitmap font
js/audio.js      synth WebAudio
js/input.js      ratón/táctil/teclado
js/fx.js         estrellas, partículas, shake, warp, textos flotantes
js/sprites.js    sprites pixel
js/questions.js  mazo, distractores, líneas/bingo (puro, testeable en node)
js/game.js       máquina de estados
js/main.js       bucle y arranque
tests/questions.test.js
Makefile, LICENSE, README.md
```
