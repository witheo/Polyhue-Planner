import { expect, type Locator, type Page } from '@playwright/test'

export async function addBacklogTask(page: Page, title: string) {
  const backlog = page.getByRole('region', { name: 'Backlog' })
  await backlog.getByLabel('Title').fill(title)
  await backlog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(backlog.getByRole('button', { name: `Open details for ${title}` })).toBeVisible()
}

/** Task card (draggable element) by title. */
export function taskCard(scope: Page | Locator, title: string) {
  return scope.getByLabel(new RegExp(`^Drag to move: ${title}`))
}

/** Pointer drag in small steps; dnd-kit's PointerSensor needs real move events past its 6px threshold. */
export async function dragTo(page: Page, source: Locator, target: Locator, targetOffset?: { x: number; y: number }) {
  // The composer pushes lower backlog cards below the fold at the default 720px viewport.
  await source.scrollIntoViewIfNeeded()
  const s = await source.boundingBox()
  const t = await target.boundingBox()
  if (!s || !t) throw new Error('drag source or target not visible')
  // Grab near the top-left: the card's centre is the title button, which swallows pointerdown.
  const from = { x: s.x + 12, y: s.y + 12 }
  const to = targetOffset
    ? { x: t.x + targetOffset.x, y: t.y + targetOffset.y }
    : { x: t.x + t.width / 2, y: t.y + t.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  // Nudge toward the target first so the sensor activates in the drag direction.
  await page.mouse.move(from.x + 8, from.y + (to.y < from.y ? -8 : 8), { steps: 3 })
  await page.mouse.move(to.x, to.y, { steps: 20 })
  await page.mouse.up()
  // Let the DragOverlay drop animation (220ms) and dnd-kit's post-drag click guard finish; a click
  // issued immediately after a drop is swallowed.
  await page.waitForTimeout(300)
}
