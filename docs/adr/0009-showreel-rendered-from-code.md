# ADR-0009: The showreel is rendered from code

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Hien ("làm video showcase tầm 120s … go all out")

## Context

- The submission needs a 2–3 minute video ([event rules §4](../event-rules.md)). The old demo pipeline
  (`scripts/demo-video.sh`, `scripts/make-video.mjs`) films the YouCam product that left in ADR-0002.
- A screen recording of a chat is slow to watch and hard to re-cut when the product changes.

## Decision

- **A motion piece, rendered from code** in `video/`: an HTML stage with a deterministic `render(t)`,
  stepped frame by frame in headless Chromium and encoded with ffmpeg (1080p60). No editor, no
  hand-placed keyframes; a change to the product is a change to a scene file.
- **Cut to the music:** the bed in `assets/audio/bed.mp3` measures 99.4 BPM; the film is 50 bars and every
  scene starts on a bar.
- **Real screens in the montage** come from `video/shots.ts`: live keys for read-only start screens,
  preview mode for screens with data, so tests never write to mainnet.
- **Every number on screen is measured** (test counts, E2E steps, line kinds, move latency).
- Build output (`video/.build/`) and the video (`artifacts/*.mp4`) are not committed.

## Consequences

- Re-rendering takes a few minutes and needs ffmpeg and Playwright's Chromium.
- The voice-over and the blog post are still separate work; the piece carries its story in type.
- `scripts/demo-video.sh` and `scripts/make-video.mjs` stay as the YouCam history.

## Links

[video/README.md](../../video/README.md) · [ADR-0002](0002-mira-becomes-a-money-friend.md)
