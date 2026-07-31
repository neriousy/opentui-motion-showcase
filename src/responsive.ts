export interface ResponsiveLayout {
  compactBanner: boolean
  compactCode: boolean
  compactFooter: boolean
  loaderCardWidth: number
  stackLoaders: boolean
}

const FULL_BANNER_TERMINAL_WIDTH = 57
const FULL_CODE_TERMINAL_WIDTH = 72
const FULL_FOOTER_TERMINAL_WIDTH = 90
const FULL_LOADER_CARDS_TERMINAL_WIDTH = 81
const STACKED_LOADER_TERMINAL_WIDTH = 69

export function getResponsiveLayout(width: number): ResponsiveLayout {
  const terminalWidth = Math.max(1, Math.trunc(width))

  return {
    compactBanner: terminalWidth < FULL_BANNER_TERMINAL_WIDTH,
    compactCode: terminalWidth < FULL_CODE_TERMINAL_WIDTH,
    compactFooter: terminalWidth < FULL_FOOTER_TERMINAL_WIDTH,
    loaderCardWidth: terminalWidth < FULL_LOADER_CARDS_TERMINAL_WIDTH ? 19 : 23,
    stackLoaders: terminalWidth < STACKED_LOADER_TERMINAL_WIDTH,
  }
}
