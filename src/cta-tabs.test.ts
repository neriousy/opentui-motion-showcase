import { afterEach, describe, expect, test } from "bun:test"
import { BoxRenderable, parseColor } from "@opentui/core"
import { createTestRenderer, type TestRenderer } from "@opentui/core/testing"
import { createCtaTabs } from "./cta-tabs"

const COLORS = {
  muted: "#777783",
  blue: "#89b4fa",
  yellow: "#f9e2af",
} as const

let renderer: TestRenderer | undefined

afterEach(() => {
  renderer?.destroy()
  renderer = undefined
})

describe("CTA tabs", () => {
  test("renders CORE selected on the first frame and updates later selections", async () => {
    const setup = await createTestRenderer({ width: 40, height: 4, useThread: false })
    renderer = setup.renderer
    const host = new BoxRenderable(renderer, { width: "100%", height: "100%" })
    const tabs = createCtaTabs(
      renderer,
      [
        { label: "CORE", color: COLORS.blue },
        { label: "PRESETS", color: COLORS.yellow },
      ],
      COLORS.muted,
    )
    host.add(tabs.root)
    renderer.root.add(host)

    await setup.renderOnce()
    const firstFrameSpans = setup.captureSpans().lines.flatMap((line) => line.spans)
    const initialCore = firstFrameSpans.find((span) => span.text.trim() === "CORE")
    const initialPresets = firstFrameSpans.find((span) => span.text.trim() === "PRESETS")
    expect(initialCore?.fg.equals(parseColor(COLORS.blue))).toBe(true)
    expect(initialPresets?.fg.equals(parseColor(COLORS.muted))).toBe(true)

    tabs.select(1)
    await setup.renderOnce()
    const nextFrameSpans = setup.captureSpans().lines.flatMap((line) => line.spans)
    const nextCore = nextFrameSpans.find((span) => span.text.trim() === "CORE")
    const nextPresets = nextFrameSpans.find((span) => span.text.trim() === "PRESETS")
    expect(nextCore?.fg.equals(parseColor(COLORS.muted))).toBe(true)
    expect(nextPresets?.fg.equals(parseColor(COLORS.yellow))).toBe(true)
  })
})
