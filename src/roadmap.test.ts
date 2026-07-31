import { afterEach, describe, expect, test } from "bun:test"
import { BoxRenderable } from "@opentui/core"
import { createTestRenderer, type TestRenderer } from "@opentui/core/testing"
import { createRoadmapComposition } from "./roadmap"

const palette = {
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
}

const featureLabels = ["TIMELINES", "REPEAT", "MOTION VALUES", "PRESENCE", "LAYOUT", "DRAG + INERTIA"]
const url = "github.com/neriousy/opentui-motion"
let renderer: TestRenderer | undefined

afterEach(() => {
  renderer?.destroy()
  renderer = undefined
})

describe("roadmap composition", () => {
  for (const [width, height] of [
    [110, 34],
    [80, 24],
  ] as const) {
    test(`reserves a clipped-free ${width}x${height} frame before revealing it`, async () => {
      const setup = await createTestRenderer({ width, height, useThread: false })
      renderer = setup.renderer
      const host = new BoxRenderable(renderer, {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      })
      const roadmap = createRoadmapComposition(renderer, { terminalWidth: width, url, palette })
      host.add(roadmap.root)
      renderer.root.add(host)

      await setup.renderOnce()
      const hiddenFrame = setup.captureCharFrame()
      const initialGeometry = {
        x: roadmap.root.screenX,
        y: roadmap.root.screenY,
        width: roadmap.root.width,
        height: roadmap.root.height,
      }
      expect(hiddenFrame).not.toContain("COMING SOON")
      expect(hiddenFrame).not.toContain("TIMELINES")
      expect(hiddenFrame).not.toContain(url)

      roadmap.intro.opacity = 1
      roadmap.intro.translateY = 0
      for (const chip of roadmap.chips) {
        chip.opacity = 1
        chip.translateY = 0
        chip.backgroundColor = palette.panelBright
      }
      roadmap.follow.opacity = 1
      await setup.renderOnce()
      const revealedFrame = setup.captureCharFrame()

      expect(revealedFrame).toContain("COMING SOON")
      expect(revealedFrame).toContain(url)
      for (const label of featureLabels) expect(revealedFrame).toContain(label)
      expect({
        x: roadmap.root.screenX,
        y: roadmap.root.screenY,
        width: roadmap.root.width,
        height: roadmap.root.height,
      }).toEqual(initialGeometry)
      for (const chip of roadmap.chips) {
        expect(chip.screenX).toBeGreaterThanOrEqual(0)
        expect(chip.screenX + chip.width).toBeLessThanOrEqual(width)
      }
    })
  }
})
