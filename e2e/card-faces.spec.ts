import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { addBacklogTask, dragTo, taskCard } from './helpers'

test.describe('card faces (spike #17)', () => {
  test('are absent by default', async ({ page }) => {
    await page.goto('/')
    await addBacklogTask(page, 'Alpha')
    await expect(page.locator('.ph-card__face')).toHaveCount(0)
  })

  test('render decorative, aria-hidden and non-interactive with ?faces=1', async ({ page }) => {
    await page.goto('/?faces=1')
    await addBacklogTask(page, 'Alpha')
    const face = page.locator('.ph-card__face')
    await expect(face).toHaveCount(1)
    await expect(face).toHaveAttribute('aria-hidden', 'true')
    await expect(face).toHaveCSS('pointer-events', 'none')
    await expect(face.locator('.ph-card__face-eye').first()).toHaveCSS('animation-name', 'ph-face-blink')
  })

  test('cards still drag backlog -> schedule and back', async ({ page }) => {
    await page.goto('/?faces=1')
    await addBacklogTask(page, 'Plan the week')
    const backlog = page.getByRole('region', { name: 'Backlog' })
    const day = page.locator('[data-ph-schedule-date]').first()

    await dragTo(page, taskCard(backlog, 'Plan the week'), day, { x: 60, y: 120 })
    await expect(taskCard(day, 'Plan the week')).toBeVisible()
    await expect(page.locator('.ph-card__face')).toHaveCount(1)

    await dragTo(page, taskCard(day, 'Plan the week'), backlog)
    await expect(taskCard(backlog, 'Plan the week')).toBeVisible()
    await expect(taskCard(day, 'Plan the week')).toHaveCount(0)
  })

  test('a drag can start on the face itself (pointer events pass through to the card)', async ({ page }) => {
    await page.goto('/?faces=1')
    await addBacklogTask(page, 'Alpha')
    const backlog = page.getByRole('region', { name: 'Backlog' })
    const day = page.locator('[data-ph-schedule-date]').first()
    const fb = await backlog.locator('.ph-card__face').boundingBox()
    const t = await day.boundingBox()
    if (!fb || !t) throw new Error('face or day not visible')
    await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2)
    await page.mouse.down()
    await page.mouse.move(fb.x + 8, fb.y - 8, { steps: 3 })
    await page.mouse.move(t.x + 60, t.y + 120, { steps: 20 })
    await page.mouse.up()
    await page.waitForTimeout(300)
    await expect(taskCard(day, 'Alpha')).toBeVisible()
  })

  test('inner controls still work', async ({ page }) => {
    await page.goto('/?faces=1')
    await addBacklogTask(page, 'First')
    await addBacklogTask(page, 'Second')
    const titles = page.locator('.ph-backlog__item .ph-card__title-link')
    const before = await titles.allTextContents()
    await page.getByRole('button', { name: 'Move Second up in backlog' }).click()
    expect(await titles.allTextContents()).toEqual([...before].reverse())

    await page.getByRole('button', { name: 'Open details for First' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('reduced motion turns the animation off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?faces=1')
    await addBacklogTask(page, 'Alpha')
    await expect(page.locator('.ph-card__face-eye').first()).toHaveCSS('animation-name', 'none')
    await expect(page.locator('.ph-card__face-smile')).toHaveCSS('animation-name', 'none')
  })

  test('axe: no violations with faces on', async ({ page }) => {
    await page.goto('/?faces=1')
    await addBacklogTask(page, 'Alpha')
    await addBacklogTask(page, 'Beta')
    const day = page.locator('[data-ph-schedule-date]').first()
    await dragTo(page, taskCard(page.getByRole('region', { name: 'Backlog' }), 'Beta'), day, { x: 60, y: 120 })
    await expect(page.locator('.ph-card__face')).toHaveCount(2)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations.map((v) => v.id)).toEqual([])
  })
})
