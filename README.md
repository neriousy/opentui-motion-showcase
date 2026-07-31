# opentui-motion showcase

A standalone, recordable OpenTUI reel for `opentui-motion`. Eleven focused scenes play one by one: declarative entrance,
easing and spring motion, a physical stagger, color keyframes, manual enter/exit, mid-flight retargeting, animated
mouse retargeting with hover/press, numbers, a lifecycle-safe spinner beside low-level loops, an interactive
`opentui-toast` stack, and the core/presets/framework install finale.

The project consumes only public package APIs. Until the packages are published, it installs packed archives produced
from the sibling `../opentui-motion` and `../opentui-toast` checkouts. This faithfully exercises the npm artifacts and
prevents a local symlink from loading a second copy of `@opentui/core`.

## Run the showcase

```bash
bun install
bun run demo
```

Controls: left/right or H/L changes scenes, Space pauses autoplay, R restarts the current scene, and Q quits. Open a
specific scene with `bun src/slides.ts --scene=3 --manual`.

For a live mouse take, open the pointer scene directly and move, hover, press, or drag inside its field:

```bash
bun src/slides.ts --scene=6 --manual
```

The toast scene is also fully interactive. Click `SHOW TOAST` as quickly as you like, hover the collapsed deck to fan
out its cards and pause every timer, or press an action/close target:

```bash
bun src/slides.ts --scene=9 --manual
```

## Record a clean run

Recording mode hides the navigation footer, plays every scene once, and exits after the final hold:

```bash
bun run record
```

Use a terminal around 110×34 cells for the intended composition. The reel uses only terminal cells, so it does not need
Kitty graphics support. `DEMO_SPEED=0.5 bun run record` creates a faster rehearsal; keep the default speed for capture.

The demo is silent so it can be screen-recorded and scored in post-production.

After changing either package, rebuild and refresh both local archives with:

```bash
bun run sync:packages
```
