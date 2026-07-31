import {
  ASCIIFontRenderable,
  BoxRenderable,
  CliRenderEvents,
  MouseEvent,
  TextAttributes,
  TextRenderable,
  createCliRenderer,
  engine,
  type KeyEvent,
} from "@opentui/core"
import {
  MotionBoxRenderable,
  MotionSpinnerRenderable,
  animate,
  stagger,
  type MotionPlaybackControls,
} from "opentui-motion"
import { createCtaTabs } from "./cta-tabs"
import { createHeroComposition } from "./hero"
import { getResponsiveLayout } from "./responsive"

const COLORS = {
  background: "#07070a",
  panel: "#111117",
  panelBright: "#1b1b24",
  grid: "#292936",
  muted: "#777783",
  text: "#f4f4f5",
  blue: "#89b4fa",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  pink: "#f5c2e7",
  purple: "#cba6f7",
  teal: "#94e2d5",
  red: "#f38ba8",
} as const

const SCENE_COUNT = 10
const args = process.argv.slice(2)
const speed = boundedNumber(readOption("speed") ?? process.env.DEMO_SPEED, 1, 0.05, 4)
const isRecording = args.includes("--recording")
const isManual = args.includes("--manual")
const shouldLoop = !isRecording && args.includes("--loop")
const shouldExit = isRecording || args.includes("--exit")
const callToActionUrl = process.env.DEMO_URL ?? "github.com/neriousy/opentui-motion"
const initialScene = Math.trunc(boundedNumber(readOption("scene"), 0, 0, SCENE_COUNT - 1))

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
  backgroundColor: COLORS.background,
  targetFps: 60,
})
engine.attach(renderer)

const page = new BoxRenderable(renderer, {
  width: "100%",
  height: "100%",
  flexDirection: "column",
  backgroundColor: COLORS.background,
})
const stage = new BoxRenderable(renderer, {
  width: "100%",
  flexGrow: 1,
  backgroundColor: COLORS.background,
})
const sceneCounter = text("", COLORS.muted)
const autoplayLabel = text("", COLORS.muted)
let footerControls: TextRenderable | undefined
page.add(stage)
if (!isRecording) {
  const footer = new BoxRenderable(renderer, {
    width: "100%",
    height: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingX: 2,
  })
  footerControls = text("←/→ scenes   space autoplay   r replay   q quit", COLORS.muted)
  footer.add(sceneCounter)
  footer.add(footerControls)
  footer.add(autoplayLabel)
  page.add(footer)
}
renderer.root.add(page)

interface SceneInstance {
  root: BoxRenderable
  play?: (signal: AbortSignal) => Promise<void>
  exit?: (signal: AbortSignal) => Promise<void>
}

interface SceneDefinition {
  name: string
  durationMs: number
  create: () => SceneInstance
}

let currentScene = -1
let requestedScene = initialScene
let currentInstance: SceneInstance | undefined
let sceneAbort = new AbortController()
let exitAbort = new AbortController()
let advanceTimer: ReturnType<typeof setTimeout> | undefined
let autoplay = !isManual
let shuttingDown = false
let changingScene = false
let pendingScene: number | null | undefined
let exitAfterScene = false

const scenes: SceneDefinition[] = [
  { name: "declarative entrance", durationMs: 4_200, create: createHeroScene },
  { name: "easing + spring", durationMs: 8_000, create: createEasingScene },
  { name: "physical stagger", durationMs: 8_000, create: createStaggerScene },
  { name: "keyframe route", durationMs: 8_000, create: createKeyframeRouteScene },
  { name: "enter + exit", durationMs: 7_500, create: createEnterExitScene },
  { name: "mid-flight retarget", durationMs: 8_000, create: createRetargetScene },
  { name: "mouse spring", durationMs: 8_500, create: createPointerScene },
  { name: "animated values", durationMs: 7_000, create: createCounterScene },
  { name: "micro-motion", durationMs: 8_000, create: createLoaderScene },
  { name: "install", durationMs: 10_800, create: createCallToActionScene },
]

renderer.keyInput.on("keypress", handleKey)
renderer.on(CliRenderEvents.RESIZE, handleResize)
process.once("SIGTERM", shutdown)
process.once("SIGINT", shutdown)
requestScene(initialScene)

function createHeroScene(): SceneInstance {
  const root = createCenteredScene()
  const { compactBanner } = getResponsiveLayout(renderer.terminalWidth)
  const railWidth = sceneWidth(72, 42)
  const hero = createHeroComposition(renderer, {
    compact: compactBanner,
    width: railWidth,
    palette: COLORS,
  })
  const rail = new BoxRenderable(renderer, {
    width: railWidth,
    height: 3,
    position: "relative",
    backgroundColor: COLORS.panel,
    marginTop: 1,
  })
  const spark = new MotionBoxRenderable(renderer, {
    width: 7,
    height: 1,
    position: "absolute",
    top: 1,
    left: 0,
    backgroundColor: COLORS.pink,
    initial: { translateX: 0, opacity: 0.25, backgroundColor: COLORS.pink },
    animate: {
      translateX: railWidth - 7,
      opacity: 1,
      backgroundColor: COLORS.teal,
    },
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 12,
      mass: 0.8,
    },
  })
  rail.add(spark)
  root.add(hero.root)
  root.add(rail)

  return {
    root,
    async play(signal) {
      if (!(await wait(360, signal))) return
      hero.headlineReveal.opacity = 1
      if (
        !(await runControls(
          [animate(hero.headlineReveal, { width: hero.revealWidth }, { duration: ms(520), ease: "linear" })],
          signal,
        ))
      )
        return
      if (!(await wait(100, signal))) return
      await runControls([animate(hero.caption, { opacity: 1 }, { duration: ms(380), ease: "outQuad" })], signal)
    },
    async exit(signal) {
      await runControls(
        [
          animate(hero.kicker, { opacity: 0 }, { duration: ms(240), ease: "inQuad" }),
          animate(hero.headlineReveal, { width: 0, opacity: 0 }, { duration: ms(320), delay: ms(40), ease: "inQuad" }),
          animate(hero.caption, { opacity: 0 }, { duration: ms(260), delay: ms(80), ease: "inQuad" }),
          animate(rail, { opacity: 0, translateY: 1 }, { duration: ms(360), delay: ms(120), ease: "inOutSine" }),
        ],
        signal,
      )
    },
  }
}

function createEasingScene(): SceneInstance {
  const root = createCenteredScene()
  addSceneHeading(
    root,
    "01 / MOTION CHARACTER",
    "SAME DESTINATION. DIFFERENT ARRIVAL.",
    "Three clocks, one terminal track.",
  )

  const width = sceneWidth(78, 46)
  const trackWidth = width - 17
  const laneGroup = new BoxRenderable(renderer, {
    width,
    flexDirection: "column",
    gap: 1,
    marginTop: 1,
  })
  const laneSpecs = [
    { label: "LINEAR", color: COLORS.blue },
    { label: "OUT BOUNCE", color: COLORS.yellow },
    { label: "SPRING", color: COLORS.pink },
  ] as const
  const runners = laneSpecs.map((spec) => {
    const row = new BoxRenderable(renderer, {
      width,
      height: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    })
    row.add(new TextRenderable(renderer, { content: spec.label, fg: spec.color, width: 13 }))
    const track = new BoxRenderable(renderer, {
      width: trackWidth,
      height: 3,
      position: "relative",
      backgroundColor: COLORS.panel,
    })
    const runner = new BoxRenderable(renderer, {
      width: 4,
      height: 1,
      position: "absolute",
      left: 0,
      top: 1,
      backgroundColor: spec.color,
    })
    track.add(runner)
    row.add(track)
    laneGroup.add(row)
    return runner
  })
  root.add(laneGroup)

  return {
    root,
    async play(signal) {
      if (!(await wait(650, signal))) return
      const destination = trackWidth - 4
      while (!signal.aborted) {
        const outbound = [
          animate(runners[0]!, { translateX: destination }, { duration: ms(1_700), ease: "linear" }),
          animate(runners[1]!, { translateX: destination }, { duration: ms(1_700), ease: "outBounce" }),
          animate(runners[2]!, { translateX: destination }, { type: "spring", stiffness: 140, damping: 11, mass: 0.8 }),
        ]
        if (!(await runControls(outbound, signal))) return
        if (!(await wait(650, signal))) return
        const home = runners.map((runner) =>
          animate(runner, { translateX: 0 }, { duration: ms(900), ease: "inOutSine" }),
        )
        if (!(await runControls(home, signal))) return
        if (!(await wait(500, signal))) return
      }
    },
  }
}

function createStaggerScene(): SceneInstance {
  const root = createCenteredScene()
  addSceneHeading(
    root,
    "02 / ORCHESTRATION",
    "A RIPPLE, BUILT FROM DELAY",
    "Independent controls compose into one physical wave.",
  )

  const columns = renderer.terminalWidth < 74 ? 9 : 13
  const rows = 5
  const cells: BoxRenderable[] = []
  const grid = new BoxRenderable(renderer, {
    flexDirection: "column",
    gap: 1,
    marginTop: 2,
  })
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const row = new BoxRenderable(renderer, { flexDirection: "row", gap: 1 })
    for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
      const cell = new BoxRenderable(renderer, {
        width: 2,
        height: 1,
        backgroundColor: COLORS.grid,
        opacity: 0.32,
      })
      row.add(cell)
      cells.push(cell)
    }
    grid.add(row)
  }
  root.add(grid)

  return {
    root,
    async play(signal) {
      if (!(await wait(650, signal))) return
      const origins = [
        { x: Math.floor(columns / 2), y: Math.floor(rows / 2), color: COLORS.purple },
        { x: 0, y: rows - 1, color: COLORS.teal },
      ] as const
      for (const origin of origins) {
        const controls = cells.map((cell, index) => {
          const x = index % columns
          const y = Math.floor(index / columns)
          const distance = Math.hypot(x - origin.x, y - origin.y)
          return animate(
            cell,
            {
              opacity: [0.32, 1, 0.32],
              translateY: [0, -1, 0],
              backgroundColor: [COLORS.grid, origin.color, COLORS.grid],
            },
            {
              duration: ms(760),
              delay: ms(distance * 62),
              times: [0, 0.42, 1],
              ease: "inOutSine",
            },
          )
        })
        if (!(await runControls(controls, signal))) return
        if (!(await wait(520, signal))) return
      }
    },
  }
}

function createKeyframeRouteScene(): SceneInstance {
  const root = createCenteredScene()
  addSceneHeading(
    root,
    "03 / KEYFRAMES",
    "DRAW A ROUTE THROUGH TIME",
    "Position and color share a choreographed set of moments.",
  )

  const boardWidth = sceneWidth(66, 44)
  const boardHeight = renderer.terminalHeight < 28 ? 10 : 12
  const traceWidth = boardWidth - 5
  const traceHeight = boardHeight - 4
  const board = new BoxRenderable(renderer, {
    width: boardWidth,
    height: boardHeight,
    position: "relative",
    border: true,
    borderStyle: "rounded",
    borderColor: COLORS.grid,
    backgroundColor: COLORS.panel,
    marginTop: 1,
  })
  const traceGrid = Array.from({ length: traceHeight }, () => Array.from({ length: traceWidth }, () => " "))
  let previousTracePoint: { x: number; y: number } | null = null
  const trace = new TextRenderable(renderer, {
    content: "",
    fg: COLORS.purple,
    width: traceWidth,
    height: traceHeight,
    position: "absolute",
    left: 2,
    top: 2,
    wrapMode: "none",
  })
  const tracer = new BoxRenderable(renderer, {
    width: 3,
    height: 1,
    position: "absolute",
    left: 2,
    top: 2,
    zIndex: 2,
    backgroundColor: COLORS.pink,
  })
  board.add(trace)
  board.add(tracer)
  root.add(board)

  const xMax = traceWidth - 3
  const yMax = traceHeight - 1
  const xKeyframes = [0, xMax, xMax, Math.round(xMax * 0.45), 0, Math.round(xMax * 0.2), 0]
  const yKeyframes = [0, 0, yMax, yMax, Math.round(yMax * 0.45), Math.round(yMax * 0.2), 0]
  const colors = [COLORS.pink, COLORS.purple, COLORS.blue, COLORS.teal, COLORS.green, COLORS.yellow, COLORS.pink]
  const times = [0, 0.2, 0.38, 0.58, 0.75, 0.88, 1]

  return {
    root,
    async play(signal) {
      if (!(await wait(650, signal))) return
      const controls = animate(
        tracer,
        {
          translateX: xKeyframes,
          translateY: yKeyframes,
          backgroundColor: colors,
        },
        {
          duration: ms(4_500),
          times,
          ease: "inOutSine",
          onUpdate: (target) => {
            const x = Math.max(0, Math.min(traceWidth - 1, Math.round(target.translateX)))
            const y = Math.max(0, Math.min(traceHeight - 1, Math.round(target.translateY)))
            const start = previousTracePoint ?? { x, y }
            const changed = drawTraceSegment(traceGrid, start.x, start.y, x, y)
            previousTracePoint = { x, y }
            if (changed) {
              trace.content = traceGrid.map((line) => line.join("")).join("\n")
            }
          },
        },
      )
      await runControls([controls], signal)
    },
  }
}

function createEnterExitScene(): SceneInstance {
  const root = createCenteredScene()
  const caption = addSceneHeading(
    root,
    "04 / PRESENCE PATTERN",
    "ANIMATE OUT. THEN REMOVE.",
    "Manual exit stays alive until every control is finished.",
  )
  const width = sceneWidth(62, 42)
  const messages = [
    { icon: "✓", label: "Build completed", meta: "218 ms", color: COLORS.green },
    { icon: "↗", label: "Preview deployed", meta: "ready", color: COLORS.blue },
    { icon: "◆", label: "Agent connected", meta: "live", color: COLORS.purple },
    { icon: "!", label: "One review note", meta: "new", color: COLORS.yellow },
  ] as const
  const stack = new BoxRenderable(renderer, {
    width,
    height: messages.length * 3 + (messages.length - 1),
    flexDirection: "column",
    gap: 1,
    marginTop: 1,
  })
  const cards = messages.map((message) => {
    const card = new BoxRenderable(renderer, {
      width,
      height: 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingX: 1,
      backgroundColor: COLORS.panel,
      opacity: 0,
    })
    card.translateX = 16
    const lead = new BoxRenderable(renderer, { flexDirection: "row", gap: 2 })
    lead.add(text(message.icon, message.color, true))
    lead.add(text(message.label, COLORS.text))
    card.add(lead)
    card.add(text(message.meta, COLORS.muted))
    stack.add(card)
    return card
  })
  root.add(stack)

  return {
    root,
    async play(signal) {
      if (!(await wait(500, signal))) return
      const entrances = cards.map((card, index) =>
        animate(
          card,
          { opacity: 1, translateX: 0 },
          { duration: ms(560), delay: ms(stagger(index, { each: 115 })), ease: "outQuad" },
        ),
      )
      if (!(await runControls(entrances, signal))) return
      if (!(await wait(1_350, signal))) return
      const exits = cards.map((card, index) =>
        animate(
          card,
          { opacity: 0, translateX: -14 },
          {
            duration: ms(460),
            delay: ms(stagger(index, { each: 105, from: "last", total: cards.length })),
            ease: "inBack",
          },
        ),
      )
      if (!(await runControls(exits, signal))) return
      for (const card of cards) {
        stack.remove(card)
        card.destroyRecursively()
      }
      caption.content = "Finished controls · removed renderables · zero orphan work"
      caption.fg = COLORS.green
    },
  }
}

function createRetargetScene(): SceneInstance {
  const root = createCenteredScene()
  const caption = addSceneHeading(
    root,
    "05 / INTERRUPTION",
    "CHANGE YOUR MIND MID-FLIGHT",
    "A new target takes one property. The color animation keeps going.",
  )
  const width = sceneWidth(76, 44)
  const track = new BoxRenderable(renderer, {
    width,
    height: 5,
    position: "relative",
    backgroundColor: COLORS.panel,
    marginTop: 2,
  })
  const destination = width - 6
  for (const position of [0, Math.round(destination / 3), destination]) {
    track.add(
      new BoxRenderable(renderer, {
        width: 1,
        height: 3,
        position: "absolute",
        left: position + 2,
        top: 1,
        backgroundColor: COLORS.grid,
      }),
    )
  }
  const runner = new BoxRenderable(renderer, {
    width: 5,
    height: 1,
    position: "absolute",
    left: 1,
    top: 2,
    zIndex: 2,
    backgroundColor: COLORS.pink,
  })
  track.add(runner)
  root.add(track)
  const ownership = text("translateX → original   ·   backgroundColor → original", COLORS.muted)
  root.add(ownership)

  return {
    root,
    async play(signal) {
      if (!(await wait(650, signal))) return
      caption.content = "Target: far edge"
      const original = animate(
        runner,
        {
          translateX: [null, Math.round(destination * 0.58), destination],
          backgroundColor: [null, COLORS.blue, COLORS.teal],
        },
        { duration: ms(3_300), times: [0, 0.55, 1], ease: "inOutSine" },
      )
      if (!(await wait(900, signal))) {
        original.stop()
        return
      }
      caption.content = "New target: first marker"
      caption.fg = COLORS.yellow
      ownership.content = "translateX → new spring   ·   backgroundColor → original"
      ownership.fg = COLORS.purple
      const replacement = animate(
        runner,
        { translateX: Math.round(destination / 3) },
        { type: "spring", stiffness: 170, damping: 15, mass: 0.75 },
      )
      if (!(await runControls([original, replacement], signal))) return
      caption.content = "Retargeted from the live value. No jump."
      caption.fg = COLORS.green
    },
  }
}

function createPointerScene(): SceneInstance {
  const root = createCenteredScene()
  const caption = addSceneHeading(
    root,
    "06 / POINTER INPUT",
    "LET THE MOUSE MOVE THE MOTION",
    "Move or drag anywhere inside the field.",
  )
  const boardWidth = sceneWidth(70, 46)
  const boardHeight = renderer.terminalHeight < 28 ? 10 : 13
  const board = new BoxRenderable(renderer, {
    width: boardWidth,
    height: boardHeight,
    position: "relative",
    border: true,
    borderStyle: "rounded",
    borderColor: COLORS.grid,
    backgroundColor: COLORS.panel,
    marginTop: 1,
  })
  const gridWidth = boardWidth - 4
  const gridHeight = boardHeight - 4
  board.add(
    new TextRenderable(renderer, {
      content: Array.from({ length: gridHeight }, () => "· ".repeat(Math.floor(gridWidth / 2))).join("\n"),
      fg: COLORS.grid,
      width: gridWidth,
      height: gridHeight,
      position: "absolute",
      left: 2,
      top: 2,
      wrapMode: "none",
      opacity: 0.7,
      selectable: false,
    }),
  )
  const follower = new MotionBoxRenderable(renderer, {
    width: 4,
    height: 1,
    position: "absolute",
    left: 2,
    top: 2,
    zIndex: 2,
    backgroundColor: COLORS.teal,
    whileHover: { opacity: 1, backgroundColor: COLORS.pink },
    whilePress: { opacity: 0.55, backgroundColor: COLORS.yellow },
    transition: { type: "spring", stiffness: 240, damping: 20, mass: 0.7 },
  })
  board.add(follower)
  root.add(board)
  const status = text("POINTER → SPRING TARGET", COLORS.purple, true)
  root.add(status)

  let activeControl: MotionPlaybackControls | null = null
  let userControlled = false
  let dispatchingScriptedGesture = false

  const moveFollower = (x: number, y: number, pressed = false): MotionPlaybackControls => {
    const targetX = Math.max(0, Math.min(boardWidth - 7, Math.round(x)))
    const targetY = Math.max(0, Math.min(boardHeight - 5, Math.round(y)))
    status.content =
      "TARGET " +
      String(targetX).padStart(2, "0") +
      " : " +
      String(targetY).padStart(2, "0") +
      (pressed ? "  ·  DRAG" : "  ·  MOVE")
    status.fg = pressed ? COLORS.yellow : COLORS.purple
    activeControl = animate(
      follower,
      {
        translateX: targetX,
        translateY: targetY,
      },
      {
        type: "spring",
        stiffness: 230,
        damping: 22,
        mass: 0.72,
        maxDuration: 1_800,
      },
    )
    return activeControl
  }

  board.onMouse = (event) => {
    if (dispatchingScriptedGesture) return
    if (!["move", "drag", "down", "up"].includes(event.type)) return
    userControlled = true
    const localX = event.x - board.screenX - 3
    const localY = event.y - board.screenY - 3
    moveFollower(localX, localY, event.type === "down" || event.type === "drag")
  }

  const dispatchGesture = (type: "over" | "down" | "up" | "out", inside = true): void => {
    const attributes = {
      button: 0,
      x: Math.round(inside ? follower.screenX : follower.screenX - 1),
      y: Math.round(follower.screenY),
      modifiers: { shift: false, alt: false, ctrl: false },
    }
    dispatchingScriptedGesture = true
    try {
      follower.processMouseEvent(new MouseEvent(follower, { ...attributes, type }))
    } finally {
      dispatchingScriptedGesture = false
    }
  }

  return {
    root,
    async play(signal) {
      if (isManual && !isRecording) {
        caption.content = "Live mouse input · hover and press the moving block"
        caption.fg = COLORS.teal
        return
      }
      if (!(await wait(520, signal))) return
      const stop = () => activeControl?.stop()
      signal.addEventListener("abort", stop, { once: true })
      const points = [
        [boardWidth - 10, 1],
        [Math.round(boardWidth * 0.52), boardHeight - 6],
        [4, Math.round(boardHeight * 0.55)],
        [Math.round(boardWidth * 0.68), 2],
      ] as const
      for (const [x, y] of points) {
        if (signal.aborted || userControlled) break
        moveFollower(x, y)
        if (!(await wait(820, signal))) break
      }
      if (!signal.aborted && !userControlled) {
        dispatchGesture("over")
        caption.content = "whileHover"
        caption.fg = COLORS.pink
        if (await wait(520, signal)) {
          dispatchGesture("down")
          caption.content = "whilePress"
          caption.fg = COLORS.yellow
          if (await wait(460, signal)) {
            dispatchGesture("up")
            dispatchGesture("out", false)
            caption.content = "Target-dispatched gestures. Spring-driven response."
            caption.fg = COLORS.green
          }
        }
      }
      signal.removeEventListener("abort", stop)
    },
  }
}

function createCounterScene(): SceneInstance {
  const root = createCenteredScene()
  const caption = addSceneHeading(
    root,
    "07 / VALUE ANIMATION",
    "NOT EVERYTHING IS A BOX",
    "Animate a plain object. Render the result anywhere.",
  )
  const counter = new ASCIIFontRenderable(renderer, {
    text: "0%",
    font: "tiny",
    color: [COLORS.blue, COLORS.purple],
    backgroundColor: COLORS.background,
    marginTop: 1,
  })
  const railWidth = sceneWidth(68, 38)
  const rail = new BoxRenderable(renderer, {
    width: railWidth,
    height: 3,
    position: "relative",
    backgroundColor: COLORS.panel,
  })
  const fill = new BoxRenderable(renderer, {
    width: 1,
    height: 1,
    position: "absolute",
    left: 0,
    top: 1,
    backgroundColor: COLORS.blue,
  })
  rail.add(fill)
  root.add(counter)
  root.add(rail)
  const model = { value: 0 }
  let renderedValue = -1

  return {
    root,
    async play(signal) {
      if (!(await wait(650, signal))) return
      const numberControl = animate(
        model,
        { value: 100 },
        {
          duration: ms(2_800),
          ease: "outExpo",
          onUpdate: (target) => {
            const next = Math.round(target.value)
            if (next === renderedValue) return
            renderedValue = next
            counter.text = String(next) + "%"
          },
        },
      )
      const fillControl = animate(
        fill,
        { width: railWidth, backgroundColor: COLORS.teal },
        { duration: ms(2_800), ease: "outExpo" },
      )
      if (!(await runControls([numberControl, fillControl], signal))) return
      caption.content = "Exact endpoint applied · 100"
      caption.fg = COLORS.green
    },
  }
}

function createLoaderScene(): SceneInstance {
  const root = createCenteredScene()
  const { loaderCardWidth, stackLoaders } = getResponsiveLayout(renderer.terminalWidth)
  addSceneHeading(
    root,
    "08 / MICRO-MOTION",
    "SMALL LOOPS. BIG DIFFERENCE.",
    "A ready-made spinner beside low-level jump and scan loops.",
  )

  const collection = new BoxRenderable(renderer, {
    width: sceneWidth(82, 56),
    flexDirection: stackLoaders ? "column" : "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
  })

  const jumpCard = createLoaderCard("JUMP", loaderCardWidth)
  const jumpDots: BoxRenderable[] = []
  const jumpRow = new BoxRenderable(renderer, {
    width: 17,
    height: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  })
  for (const color of [COLORS.pink, COLORS.purple, COLORS.blue]) {
    const dot = new BoxRenderable(renderer, { width: 3, height: 1, backgroundColor: color })
    jumpDots.push(dot)
    jumpRow.add(dot)
  }
  jumpCard.add(jumpRow)

  const spinnerCard = createLoaderCard("SPINNER", loaderCardWidth)
  const spinnerBody = new BoxRenderable(renderer, {
    width: 17,
    height: 5,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  })
  const spinner = new MotionSpinnerRenderable(renderer, {
    frames: "arc",
    interval: ms(85),
    label: "renderer ready",
    fg: COLORS.teal,
    attributes: TextAttributes.BOLD,
  })
  spinnerBody.add(spinner)
  spinnerBody.add(text("AUTO CLEANUP", COLORS.muted, true))
  spinnerCard.add(spinnerBody)

  const scanCard = createLoaderCard("SCAN", loaderCardWidth)
  const scanTrack = new BoxRenderable(renderer, {
    width: 17,
    height: 5,
    position: "relative",
    backgroundColor: COLORS.panel,
  })
  const scanner = new BoxRenderable(renderer, {
    width: 4,
    height: 1,
    position: "absolute",
    left: 0,
    top: 2,
    backgroundColor: COLORS.yellow,
  })
  scanTrack.add(scanner)
  scanCard.add(scanTrack)

  collection.add(jumpCard)
  collection.add(spinnerCard)
  collection.add(scanCard)
  root.add(collection)

  return {
    root,
    async play(signal) {
      if (!(await wait(450, signal))) return
      await Promise.all([loopJump(jumpDots, signal), loopScan(scanner, signal)])
    },
  }
}

function createCallToActionScene(): SceneInstance {
  const root = createCenteredScene()
  const { compactBanner, compactCode } = getResponsiveLayout(renderer.terminalWidth)
  const kicker = text("09 / USE IT YOUR WAY", COLORS.muted, true)
  const heading = text("ONE ENGINE · FOUR WAYS IN", COLORS.text, true)
  const caption = text("Core, presets, React, or Solid.", COLORS.muted)
  root.add(kicker)
  root.add(heading)
  root.add(caption)

  const snippets = [
    {
      label: "CORE",
      color: COLORS.blue,
      source: compactCode
        ? [
            "import { animate }",
            '  from "opentui-motion"',
            "animate(panel,",
            "  { translateX: 24 },",
            '  { type: "spring", damping: 18 },',
            ")",
          ].join("\n")
        : [
            'import { animate } from "opentui-motion"',
            "",
            "animate(panel,",
            "  { translateX: 24 },",
            '  { type: "spring", damping: 18 },',
            ")",
          ].join("\n"),
    },
    {
      label: "PRESETS",
      color: COLORS.yellow,
      source: compactCode
        ? [
            "import { slideIn, stagger }",
            '  from "opentui-motion"',
            'const entrance = slideIn("up", {',
            "  delay: stagger(i, { each: 90 }),",
            "})",
          ].join("\n")
        : [
            'import { slideIn, stagger } from "opentui-motion"',
            "",
            'const entrance = slideIn("up", {',
            "  delay: stagger(index, { each: 90 }),",
            "})",
          ].join("\n"),
    },
    {
      label: "REACT",
      color: COLORS.pink,
      source: compactCode
        ? [
            "import { registerMotion }",
            '  from "opentui-motion/react"',
            "registerMotion()",
            "<motion initial={{ opacity: 0 }}",
            "  animate={{ opacity: 1 }}",
            "/>",
          ].join("\n")
        : [
            'import { registerMotion } from "opentui-motion/react"',
            "",
            "registerMotion()",
            "",
            "<motion initial={{ opacity: 0 }} animate={{ opacity: 1 }} />",
          ].join("\n"),
    },
    {
      label: "SOLID",
      color: COLORS.teal,
      source: compactCode
        ? [
            "import { registerMotion }",
            '  from "opentui-motion/solid"',
            "registerMotion()",
            "<motion",
            "  animate={{ translateX: 24 }} />",
          ].join("\n")
        : [
            'import { registerMotion } from "opentui-motion/solid"',
            "",
            "registerMotion()",
            "",
            "<motion animate={{ translateX: 24 }} />",
          ].join("\n"),
    },
  ] as const
  const codeArea = new BoxRenderable(renderer, {
    width: sceneWidth(76, 48),
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    marginTop: 1,
  })
  const tabs = createCtaTabs(renderer, snippets, COLORS.muted)
  const codePanel = new BoxRenderable(renderer, {
    width: "100%",
    height: 10,
    border: true,
    borderStyle: "rounded",
    borderColor: COLORS.grid,
    backgroundColor: COLORS.panel,
    padding: 1,
  })
  const code = new TextRenderable(renderer, {
    content: snippets[0].source,
    fg: snippets[0].color,
    wrapMode: "none",
  })
  codePanel.add(code)
  codeArea.add(tabs.root)
  codeArea.add(codePanel)
  root.add(codeArea)

  return {
    root,
    async play(signal) {
      if (!(await wait(450, signal))) return
      for (let index = 0; index < snippets.length; index++) {
        if (index > 0) {
          if (
            !(await runControls(
              [animate(codePanel, { opacity: 0, translateX: -5 }, { duration: ms(260), ease: "inQuad" })],
              signal,
            ))
          ) {
            return
          }
        }
        const snippet = snippets[index]!
        tabs.select(index)
        code.content = snippet.source
        code.fg = snippet.color
        codePanel.opacity = 0
        codePanel.translateX = 5
        if (
          !(await runControls(
            [animate(codePanel, { opacity: 1, translateX: 0 }, { duration: ms(520), ease: "outBack" })],
            signal,
          ))
        ) {
          return
        }
        if (!(await wait(1_050, signal))) return
      }

      if (
        !(await runControls(
          [animate(codeArea, { opacity: 0, translateY: -2 }, { duration: ms(380), ease: "inQuad" })],
          signal,
        ))
      ) {
        return
      }
      root.remove(codeArea)
      codeArea.destroyRecursively()
      heading.content = "READY WHEN YOU ARE."
      caption.content = compactBanner
        ? "No DOM · no browser globals"
        : "No DOM · no requestAnimationFrame · no browser globals"
      caption.fg = COLORS.purple

      const install = new BoxRenderable(renderer, {
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        opacity: 0,
        marginTop: 1,
      })
      install.translateY = 2
      install.add(
        compactBanner
          ? text("OPENTUI MOTION", COLORS.teal, true)
          : new ASCIIFontRenderable(renderer, {
              text: "OPENTUI MOTION",
              font: "tiny",
              color: [COLORS.teal, COLORS.blue, COLORS.purple],
              backgroundColor: COLORS.background,
            }),
      )
      install.add(text("bun add opentui-motion", COLORS.text, true))
      install.add(text(callToActionUrl, COLORS.muted))
      root.add(install)
      await runControls(
        [animate(install, { opacity: 1, translateY: 0 }, { duration: ms(720), ease: "outBack" })],
        signal,
      )
    },
  }
}

function createLoaderCard(label: string, width: number): BoxRenderable {
  const card = new BoxRenderable(renderer, {
    width,
    height: 9,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: true,
    borderStyle: "rounded",
    borderColor: COLORS.grid,
    backgroundColor: COLORS.panel,
  })
  card.add(text(label, COLORS.muted, true))
  return card
}

async function loopJump(dots: BoxRenderable[], signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    const controls = dots.map((dot, index) =>
      animate(
        dot,
        { translateY: [0, -2, 0], backgroundColor: [COLORS.purple, COLORS.pink, COLORS.purple] },
        {
          duration: ms(720),
          delay: ms(stagger(index, { each: 120 })),
          times: [0, 0.45, 1],
          ease: "inOutSine",
        },
      ),
    )
    if (!(await runControls(controls, signal))) return
    if (!(await wait(180, signal))) return
  }
}

async function loopScan(scanner: BoxRenderable, signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    const control = animate(
      scanner,
      {
        translateX: [0, 13, 0],
        backgroundColor: [COLORS.yellow, COLORS.red, COLORS.yellow],
      },
      { duration: ms(1_350), times: [0, 0.5, 1], ease: "inOutSine" },
    )
    if (!(await runControls([control], signal))) return
    if (!(await wait(220, signal))) return
  }
}

function createCenteredScene(): BoxRenderable {
  return new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 1,
    padding: 2,
    backgroundColor: COLORS.background,
  })
}

function addSceneHeading(root: BoxRenderable, kicker: string, heading: string, caption: string): TextRenderable {
  root.add(text(kicker, COLORS.muted, true))
  root.add(text(heading, COLORS.text, true))
  const captionRenderable = text(caption, COLORS.muted)
  root.add(captionRenderable)
  return captionRenderable
}

function text(content: string, color: string, bold = false): TextRenderable {
  return new TextRenderable(renderer, {
    content,
    fg: color,
    ...(bold ? { attributes: TextAttributes.BOLD } : {}),
  })
}

function sceneWidth(preferred: number, minimum: number): number {
  const available = Math.max(24, renderer.terminalWidth - 8)
  return Math.max(Math.min(minimum, available), Math.min(preferred, available))
}

function requestScene(index: number): void {
  if (shuttingDown) return
  clearAdvanceTimer()
  requestedScene = normalizeScene(index)
  pendingScene = requestedScene
  exitAfterScene = false
  void changeScene()
}

function requestShowcaseExit(): void {
  if (shuttingDown) return
  clearAdvanceTimer()
  pendingScene = null
  exitAfterScene = true
  void changeScene()
}

async function changeScene(): Promise<void> {
  if (changingScene || shuttingDown) return
  changingScene = true

  try {
    while (pendingScene !== undefined && !shuttingDown) {
      let targetScene = pendingScene
      let shutdownAfterExit = targetScene === null && exitAfterScene
      pendingScene = undefined
      exitAfterScene = false

      const outgoing = currentInstance
      if (outgoing) {
        sceneAbort.abort()
        updateFooter(true)
        exitAbort.abort()
        exitAbort = new AbortController()
        await exitScene(outgoing, exitAbort.signal)
        if (shuttingDown) return

        if (currentInstance === outgoing) currentInstance = undefined
        stage.remove(outgoing.root)
        outgoing.root.destroyRecursively()
      }

      // Navigation can be pressed again during the short exit. Mount only the latest request.
      if (pendingScene !== undefined) {
        targetScene = pendingScene
        shutdownAfterExit = targetScene === null && exitAfterScene
        pendingScene = undefined
        exitAfterScene = false
      }

      if (targetScene === null) {
        if (shutdownAfterExit) shutdown()
        continue
      }

      mountScene(targetScene)
    }
  } catch (error) {
    if (!shuttingDown) {
      console.error(error)
      shutdown()
    }
  } finally {
    changingScene = false
    if (pendingScene !== undefined && !shuttingDown) void changeScene()
  }
}

async function exitScene(instance: SceneInstance, signal: AbortSignal): Promise<void> {
  if (instance.exit) {
    await instance.exit(signal)
    return
  }
  await runControls(
    [animate(instance.root, { opacity: 0, translateY: -1 }, { duration: ms(420), ease: "inOutSine" })],
    signal,
  )
}

function mountScene(index: number): void {
  currentScene = normalizeScene(index)
  requestedScene = currentScene
  currentInstance = scenes[currentScene]!.create()
  stage.add(currentInstance.root)
  updateFooter()
  sceneAbort = new AbortController()
  const playSignal = sceneAbort.signal
  if (currentInstance.play) {
    void currentInstance.play(playSignal).catch((error) => {
      if (!playSignal.aborted) {
        console.error(error)
        shutdown()
      }
    })
  }
  scheduleAdvance()
}

function scheduleAdvance(): void {
  if (!autoplay || currentScene < 0) return
  const scene = scenes[currentScene]!
  const scheduledScene = currentScene
  advanceTimer = setTimeout(() => {
    advanceTimer = undefined
    if (currentScene !== scheduledScene || shuttingDown) return
    if (currentScene < scenes.length - 1) {
      requestScene(currentScene + 1)
      return
    }
    if (shouldLoop) {
      requestScene(0)
      return
    }
    autoplay = false
    updateFooter()
    if (shouldExit) requestShowcaseExit()
  }, ms(scene.durationMs))
}

function clearAdvanceTimer(): void {
  if (!advanceTimer) return
  clearTimeout(advanceTimer)
  advanceTimer = undefined
}

function updateFooter(leaving = false): void {
  if (isRecording || currentScene < 0) return
  const scene = scenes[currentScene]!
  const { compactFooter } = getResponsiveLayout(renderer.terminalWidth)
  sceneCounter.content = String(currentScene + 1).padStart(2, "0") + " / " + String(scenes.length).padStart(2, "0")
  if (footerControls) {
    footerControls.content = compactFooter ? "←/→ · space · r · q" : "←/→ scenes   space autoplay   r replay   q quit"
  }
  autoplayLabel.content = compactFooter
    ? leaving
      ? "leaving"
      : autoplay
        ? "playing"
        : "held"
    : leaving
      ? scene.name + " · leaving"
      : scene.name + (autoplay ? " · playing" : " · held")
}

function handleResize(): void {
  if (shuttingDown) return
  updateFooter(changingScene)
  // A scene already being changed will be created after the renderer has applied
  // its latest dimensions. Re-request only an otherwise stable active scene.
  if (currentScene < 0 || changingScene) return
  requestScene(requestedScene)
}

function handleKey(key: KeyEvent): void {
  if (key.eventType === "release") return
  if (key.ctrl && key.name === "c") {
    key.preventDefault()
    shutdown()
    return
  }
  if (key.name === "q" || key.name === "escape") {
    key.preventDefault()
    shutdown()
    return
  }
  if (key.name === "right" || key.name === "l") {
    key.preventDefault()
    requestScene(requestedScene + 1)
    return
  }
  if (key.name === "left" || key.name === "h") {
    key.preventDefault()
    requestScene(requestedScene - 1)
    return
  }
  if (key.name === "r") {
    key.preventDefault()
    requestScene(requestedScene)
    return
  }
  if (key.name === "space") {
    key.preventDefault()
    autoplay = !autoplay
    if (autoplay) scheduleAdvance()
    else clearAdvanceTimer()
    updateFooter()
  }
}

function shutdown(): void {
  if (shuttingDown) return
  shuttingDown = true
  renderer.off(CliRenderEvents.RESIZE, handleResize)
  clearAdvanceTimer()
  sceneAbort.abort()
  exitAbort.abort()
  pendingScene = undefined
  currentInstance?.root.destroyRecursively()
  currentInstance = undefined
  engine.clear()
  engine.detach()
  renderer.destroy()
}

function normalizeScene(index: number): number {
  return (index + scenes.length) % scenes.length
}

async function runControls(controls: MotionPlaybackControls[], signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) {
    for (const control of controls) control.stop()
    return false
  }
  const stop = () => {
    for (const control of controls) control.stop()
  }
  signal.addEventListener("abort", stop, { once: true })
  let results
  try {
    results = await Promise.all(controls.map((control) => control.finished))
  } finally {
    signal.removeEventListener("abort", stop)
  }

  if (signal.aborted) return false

  const failed = results.find((result) => result.status === "error")
  if (failed) {
    if (failed.error instanceof Error) throw failed.error
    throw new Error("Motion playback failed: " + String(failed.error))
  }

  const interrupted = results.find((result) => result.status !== "finished")
  if (interrupted) {
    throw new Error(`Motion playback ended unexpectedly with status "${interrupted.status}"`)
  }

  return true
}

function drawTraceSegment(grid: string[][], startX: number, startY: number, endX: number, endY: number): boolean {
  let x = startX
  let y = startY
  const deltaX = Math.abs(endX - startX)
  const deltaY = Math.abs(endY - startY)
  const stepX = startX < endX ? 1 : -1
  const stepY = startY < endY ? 1 : -1
  let error = deltaX - deltaY
  let changed = false

  while (true) {
    const row = grid[y]
    if (row?.[x] !== undefined && row[x] !== "·") {
      row[x] = "·"
      changed = true
    }
    if (x === endX && y === endY) break
    const doubledError = error * 2
    if (doubledError > -deltaY) {
      error -= deltaY
      x += stepX
    }
    if (doubledError < deltaX) {
      error += deltaX
      y += stepY
    }
  }

  return changed
}

function wait(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolveWait) => {
    if (signal.aborted) {
      resolveWait(false)
      return
    }
    const abort = () => {
      clearTimeout(timer)
      signal.removeEventListener("abort", abort)
      resolveWait(false)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolveWait(true)
    }, ms(milliseconds))
    signal.addEventListener("abort", abort, { once: true })
  })
}

function ms(milliseconds: number): number {
  return Math.max(1, milliseconds * speed)
}

function readOption(name: string): string | undefined {
  const prefix = "--" + name + "="
  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
}

function boundedNumber(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback
}
