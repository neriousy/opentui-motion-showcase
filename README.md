# opentui-motion showcase

A standalone, recordable OpenTUI reel for `opentui-motion`. Eleven focused scenes play one by one: declarative entrance,
easing and spring motion, a physical stagger, color keyframes, manual enter/exit, mid-flight retargeting, animated
mouse retargeting with hover/press, numbers, a lifecycle-safe spinner beside low-level loops, an interactive
`opentui-toast` stack, and the core/presets/framework entry-point finale.

The project consumes only public package APIs. For deterministic development and recordings, it installs committed
package archives built from the sibling `../opentui-motion` and `../opentui-toast` checkouts. This exercises the same
packed-artifact path used for releases and prevents a local symlink from loading a second copy of `@opentui/core`.

Install the motion library in your own OpenTUI app with `bun add opentui-motion`.

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
Kitty graphics support. `DEMO_SPEED=0.5 bun run record` creates a faster rehearsal; use `DEMO_SPEED=0.8` for a tighter
social cut or keep the default speed for the full take.

The demo is silent so it can be screen-recorded and scored in post-production.

After changing either package, rebuild and refresh both local archives with:

```bash
bun run sync:packages
```
