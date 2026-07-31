import { afterEach, describe, expect, test } from "bun:test"
import { BoxRenderable } from "@opentui/core"
import { createTestRenderer, type TestRenderer } from "@opentui/core/testing"
import { createHeroComposition } from "./hero"

const palette = {
  background: "#07070a",
  muted: "#777783",
  pink: "#f5c2e7",
  purple: "#cba6f7",
  blue: "#89b4fa",
}

let renderer: TestRenderer | undefined

afterEach(() => {
  renderer?.destroy()
  renderer = undefined
})

describe("hero composition", () => {
  test("reserves its final copy slots before the headline and caption are revealed", async () => {
    const setup = await createTestRenderer({ width: 110, height: 34, useThread: false })
    renderer = setup.renderer
    const host = new BoxRenderable(renderer, {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    })
    const hero = createHeroComposition(renderer, {
      compact: false,
      width: 72,
      palette,
    })
    host.add(hero.root)
    renderer.root.add(host)

    await setup.renderOnce()
    const hiddenHeadlineRows = setup.captureCharFrame().split("\n").slice(16, 18).join("")
    const initialGeometry = {
      rootHeight: hero.root.height,
      rootY: hero.root.screenY,
      headlineSlotHeight: hero.headlineSlot.height,
      headlineSlotY: hero.headlineSlot.screenY,
      headlineY: hero.headline.screenY,
      captionSlotY: hero.captionSlot.screenY,
    }

    hero.headlineReveal.width = hero.revealWidth
    hero.headlineReveal.opacity = 1
    hero.caption.opacity = 1
    await setup.renderOnce()
    const revealedHeadlineRows = setup.captureCharFrame().split("\n").slice(16, 18).join("")

    expect(hiddenHeadlineRows.trim()).toBe("")
    expect(revealedHeadlineRows.trim()).not.toBe("")
    expect(initialGeometry).toEqual({
      rootHeight: 6,
      rootY: 14,
      headlineSlotHeight: 2,
      headlineSlotY: 16,
      headlineY: 16,
      captionSlotY: 19,
    })
    expect({
      rootHeight: hero.root.height,
      rootY: hero.root.screenY,
      headlineSlotHeight: hero.headlineSlot.height,
      headlineSlotY: hero.headlineSlot.screenY,
      headlineY: hero.headline.screenY,
      captionSlotY: hero.captionSlot.screenY,
    }).toEqual(initialGeometry)
  })
})
