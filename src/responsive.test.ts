import { describe, expect, test } from "bun:test"
import { getResponsiveLayout } from "./responsive"

describe("showcase responsive layout", () => {
  test("keeps the canonical 110-column recording layout", () => {
    expect(getResponsiveLayout(110)).toEqual({
      compactBanner: false,
      compactCode: false,
      compactFooter: false,
      loaderCardWidth: 23,
      stackLoaders: false,
    })
  })

  test.each([70, 71, 72])("keeps all three loader cards on one row at %i columns", (terminalWidth) => {
    const layout = getResponsiveLayout(terminalWidth)
    const collectionWidth = terminalWidth - 8
    const cardsWidth = layout.loaderCardWidth * 3 + 2 * 2

    expect(layout.stackLoaders).toBe(false)
    expect(cardsWidth).toBeLessThanOrEqual(collectionWidth)
  })

  test("stacks loaders before their compact row would overflow", () => {
    expect(getResponsiveLayout(68).stackLoaders).toBe(true)
    expect(getResponsiveLayout(69).stackLoaders).toBe(false)
  })

  test("uses compact chrome and code below their measured full-width bounds", () => {
    expect(getResponsiveLayout(70)).toMatchObject({ compactCode: true, compactFooter: true })
    expect(getResponsiveLayout(72).compactCode).toBe(false)
    expect(getResponsiveLayout(90).compactFooter).toBe(false)
  })

  test("replaces the ASCII banner only when its measured width no longer fits", () => {
    expect(getResponsiveLayout(56).compactBanner).toBe(true)
    expect(getResponsiveLayout(57).compactBanner).toBe(false)
  })
})
