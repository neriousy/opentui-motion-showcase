import { ASCIIFontRenderable, BoxRenderable, TextAttributes, TextRenderable, type RenderContext } from "@opentui/core"

export interface HeroPalette {
  background: string
  muted: string
  pink: string
  purple: string
  blue: string
}

export interface HeroCompositionOptions {
  compact: boolean
  width: number
  palette: HeroPalette
}

export interface HeroComposition {
  root: BoxRenderable
  kicker: TextRenderable
  headline: ASCIIFontRenderable | TextRenderable
  headlineSlot: BoxRenderable
  headlineReveal: BoxRenderable
  caption: TextRenderable
  captionSlot: BoxRenderable
  revealWidth: number
}

const FULL_HEADLINE_WIDTH = 53
const FULL_HEADLINE_HEIGHT = 2
const COMPACT_HEADLINE = "OPENTUI MOTION"

export function createHeroComposition(
  context: RenderContext,
  { compact, width, palette }: HeroCompositionOptions,
): HeroComposition {
  const headlineHeight = compact ? 1 : FULL_HEADLINE_HEIGHT
  const revealWidth = compact ? COMPACT_HEADLINE.length : FULL_HEADLINE_WIDTH
  const root = new BoxRenderable(context, {
    width,
    height: compact ? 5 : 6,
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    flexShrink: 0,
  })
  const kicker = heroText(context, compact ? "NO MORE SNAPS" : "YOUR TUI DOESN'T HAVE TO SNAP", palette.muted, true)
  const kickerSlot = fixedSlot(context, width, 1)
  const headlineSlot = fixedSlot(context, width, headlineHeight, true)
  const captionSlot = fixedSlot(context, width, 1)
  const headline = compact
    ? new TextRenderable(context, {
        content: COMPACT_HEADLINE,
        fg: palette.pink,
        attributes: TextAttributes.BOLD,
        width: revealWidth,
        height: headlineHeight,
      })
    : new ASCIIFontRenderable(context, {
        text: COMPACT_HEADLINE,
        font: "tiny",
        color: [palette.pink, palette.purple, palette.blue],
        backgroundColor: palette.background,
        selectable: false,
      })
  const headlineReveal = new BoxRenderable(context, {
    width: 0,
    height: headlineHeight,
    position: "absolute",
    left: Math.floor((width - revealWidth) / 2),
    top: 0,
    overflow: "hidden",
    flexShrink: 0,
    opacity: 0,
  })
  const caption = heroText(
    context,
    compact ? "Tweens · springs · keyframes" : "Tweens · springs · keyframes · renderer-native",
    palette.muted,
  )
  caption.opacity = 0

  kickerSlot.add(kicker)
  headlineReveal.add(headline)
  headlineSlot.add(headlineReveal)
  captionSlot.add(caption)
  root.add(kickerSlot)
  root.add(headlineSlot)
  root.add(captionSlot)

  return {
    root,
    kicker,
    headline,
    headlineSlot,
    headlineReveal,
    caption,
    captionSlot,
    revealWidth,
  }
}

function fixedSlot(context: RenderContext, width: number, height: number, positioned = false): BoxRenderable {
  return new BoxRenderable(context, {
    width,
    height,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    ...(positioned ? { position: "relative" as const } : {}),
  })
}

function heroText(context: RenderContext, content: string, color: string, bold = false): TextRenderable {
  return new TextRenderable(context, {
    content,
    fg: color,
    ...(bold ? { attributes: TextAttributes.BOLD } : {}),
  })
}
