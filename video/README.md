# The showreel

A 2-minute motion piece about Mira, rendered from code: 50 bars of the music bed (99.4 BPM), so every cut
lands on a beat. Output: `artifacts/mira-showreel.mp4`, 1920×1080, 60 fps, AAC audio.

```bash
node video/shots.ts                 # real app screens → video/.build/shots (needs .env for the live start screens)
node video/render.ts                # → artifacts/mira-showreel.mp4
node video/render.ts --stills 3,45  # review frames → video/.build/stills
```

| File                         | Job                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `film/main.ts`               | The timeline: scenes on bars, the cuts between them (flash, wipe, iris, push), grain  |
| `film/lib.ts`                | Beat grid, easing, springs, seeded randomness, DOM helpers, the sound cue sheet        |
| `film/ui.ts`                 | Mira's interface rebuilt as layers: the phone, a deterministic thread, the cards       |
| `film/scenes-*.ts`           | The eleven scenes, four acts                                                           |
| `film/index.html`            | The stage (1920×1080) and every style                                                  |
| `sfx.ts`                     | Sound effects synthesised in code, plus `assets/audio/{pop,whoosh,ding}.wav`           |
| `render.ts`                  | Bundles the film, steps time frame by frame in Chromium (4 workers), encodes, mixes   |
| `shots.ts`                   | Captures the real app for the montage                                                  |

- **Deterministic:** every frame is `render(t)`; nothing reads the clock or `Math.random`.
- **Honest screens:** the start screens come from a local server on the live keys, read-only. Screens with
  data come from preview mode, so no test data reaches mainnet. Numbers on screen (91 unit tests, 16-step
  E2E, 7 line kinds, ≈3 s a move) are measured, not invented.
- **Sound:** `assets/audio/bed.mp3` (GarageBand loops) under synthesised ticks, pops, risers, impacts and a
  coin, placed by cues the scenes declare.
