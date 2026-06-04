/** Right Agents sidebar layout icon geometry */
export const RIGHT_PANEL_LAYOUT_ICON_MARKERS = {
  outer: 'x="2.5" y="3.5" width="11" height="9"',
  inner: 'x="9" y="4.5" width="3.5" height="7"',
} as const

/** @deprecated legacy Agents icon for regression */
export const LEGACY_AGENTS_PANEL_ICON_MARKERS = {
  outer: 'x="2.5" y="4.5" width="11" height="7"',
  inner: 'x="10.5" y="5" width="2.5" height="6"',
} as const

export function includesRightPanelLayoutIcon(source: string): boolean {
  return (
    source.includes(RIGHT_PANEL_LAYOUT_ICON_MARKERS.outer) &&
    source.includes(RIGHT_PANEL_LAYOUT_ICON_MARKERS.inner)
  )
}
