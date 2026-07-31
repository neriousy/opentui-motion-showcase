import { BoxRenderable, TextAttributes, TextRenderable, type RenderContext } from "@opentui/core"

export interface CtaTab {
  label: string
  color: string
}

export interface CtaTabs {
  root: BoxRenderable
  labels: TextRenderable[]
  select: (index: number) => void
}

/** Reserve the panel's layout while keeping its first frame hidden for the entrance animation. */
export function stageCtaPanelEntrance(panel: BoxRenderable): void {
  panel.opacity = 0
  panel.translateX = 5
}

export function createCtaTabs(context: RenderContext, tabs: readonly CtaTab[], muted: string): CtaTabs {
  const root = new BoxRenderable(context, { flexDirection: "row", gap: 4 })
  const labels = tabs.map(
    (tab) =>
      new TextRenderable(context, {
        content: tab.label,
        fg: muted,
        attributes: TextAttributes.BOLD,
      }),
  )
  for (const label of labels) root.add(label)

  const select = (index: number): void => {
    const active = tabs[index]
    if (!active) throw new RangeError(`Unknown CTA tab index: ${index}`)
    for (let tabIndex = 0; tabIndex < labels.length; tabIndex++) {
      labels[tabIndex]!.fg = tabIndex === index ? active.color : muted
    }
  }
  select(0)

  return {
    root,
    labels,
    select,
  }
}
