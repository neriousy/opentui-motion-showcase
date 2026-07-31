import { BoxRenderable, TextAttributes, TextRenderable, type RenderContext } from "@opentui/core"

export interface RoadmapPalette {
  panel: string
  panelBright: string
  grid: string
  muted: string
  text: string
  blue: string
  green: string
  yellow: string
  pink: string
  purple: string
  teal: string
}

export interface RoadmapCompositionOptions {
  terminalWidth: number
  url: string
  palette: RoadmapPalette
}

export interface RoadmapComposition {
  root: BoxRenderable
  intro: BoxRenderable
  chips: BoxRenderable[]
  follow: TextRenderable
}

export function createRoadmapComposition(
  context: RenderContext,
  { terminalWidth, url, palette }: RoadmapCompositionOptions,
): RoadmapComposition {
  const root = new BoxRenderable(context, {
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
  })
  const intro = new BoxRenderable(context, {
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    opacity: 0,
  })
  intro.translateY = 1
  intro.add(roadmapText(context, "11 / COMING SOON", palette.muted, true))
  intro.add(roadmapText(context, "THIS IS JUST THE FIRST FRAME.", palette.text, true))
  intro.add(roadmapText(context, "The motion system grows from here.", palette.muted))
  root.add(intro)

  const features = [
    { label: "TIMELINES", color: palette.blue },
    { label: "REPEAT", color: palette.yellow },
    { label: "MOTION VALUES", color: palette.pink },
    { label: "PRESENCE", color: palette.green },
    { label: "LAYOUT", color: palette.purple },
    { label: "DRAG + INERTIA", color: palette.teal },
  ] as const
  const chipWidth = terminalWidth < 84 ? 20 : 22
  const rows = new BoxRenderable(context, {
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    marginTop: 1,
  })
  const chips: BoxRenderable[] = []

  for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
    const row = new BoxRenderable(context, { flexDirection: "row", gap: 2 })
    for (const feature of features.slice(rowIndex * 3, rowIndex * 3 + 3)) {
      const chip = new BoxRenderable(context, {
        width: chipWidth,
        height: 3,
        alignItems: "center",
        justifyContent: "center",
        border: true,
        borderStyle: "rounded",
        borderColor: palette.grid,
        backgroundColor: palette.panel,
        opacity: 0,
      })
      chip.translateY = 2
      chip.add(roadmapText(context, feature.label, feature.color, true))
      row.add(chip)
      chips.push(chip)
    }
    rows.add(row)
  }
  root.add(rows)

  const follow = roadmapText(context, "FOLLOW THE BUILD → " + url, palette.muted, true)
  follow.opacity = 0
  root.add(follow)

  return { root, intro, chips, follow }
}

function roadmapText(context: RenderContext, content: string, color: string, bold = false): TextRenderable {
  return new TextRenderable(context, {
    content,
    fg: color,
    ...(bold ? { attributes: TextAttributes.BOLD } : {}),
  })
}
