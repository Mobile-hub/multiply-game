# AGENTS.md — Multiply

Guide for agents (Claude Code or others) working in this repository.

## Rules
- Code, identifiers, documentation and comments in **English**. In-game visible text in **English**. Conversations and development plans in **Spanish (Castilian)**. Committed files in **English**.
- No dependencies, no build, no network: HTML + CSS + classic JS (plain `<script>` tags, NOT ES modules) so it works by opening `index.html` via `file://`. Everything hangs off the global `window.MX` namespace.
- MIT license. Small, frequent commits.
- `make open` opens the game, `make test` runs tests with node, `make check` validates syntax.

## Accepted plan

### Design decisions
- Everything is drawn on a 320×180 `<canvas>` scaled with `image-rendering: pixelated` (8-bit look). Custom 5×7 bitmap font (Ñ, ¡, ¿, accented letters).
- Sound: synthesized WebAudio (square/triangle/noise): SFX + looping chiptune music. M key = mute.
- Menu: animated title + LEVEL 1 / 2 / 3 selector + START. Difficulty = starting level. Progression: Level 1 (30 s per question) → Level 2 (20 s) → Level 3 (10 s) → Final monster (5 s).
- Mechanic: `7 × 8 = ?` appears along with 4 asteroids showing numbers; tap/click the correct one (mouse/touch or keys 1-4). Per-question timer bar.
- No hints: on a wrong answer or timeout the answer is NOT shown; the question is re-queued.
- Level up: answer all 100 multiplications (1..10 × 1..10) correctly, in random order.
- Bonus: 10×10 card (row = the N times table) that lights up without numbers. Completed table = LINE! (+points, +1 life). Completed card = BINGO! → end of level + warp trip.
- 5 lives. Game over → retry level or back to menu.
- Final boss with 20 HP, random questions at 5 s.
- Animated spider-robot in the bottom-left corner that reacts (never gives hints).
- Animations: parallax stars, planets, hyperspace, particle explosions, shake, floating texts, combos.
- Only the device's best final score (plus the mute setting) in `localStorage` (with try/catch). **No cookies**, nothing leaves the browser.

### Structure
```
index.html, css/style.css
js/font.js       bitmap font
js/audio.js      WebAudio synth
js/input.js      mouse/touch/keyboard
js/fx.js         stars, particles, shake, warp, floating texts
js/sprites.js    pixel sprites
js/questions.js  deck, distractors, lines/bingo (pure, testable in node)
js/game.js       state machine
js/main.js       loop and bootstrap
tests/questions.test.js
Makefile, LICENSE, README.md
```
