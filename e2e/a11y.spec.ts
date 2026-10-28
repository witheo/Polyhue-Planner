import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { addBacklogTask, dragTo, taskCard } from './helpers'

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([])
}

test.describe('axe (WCAG 2.1 A/AA)', () => {
  test('empty planner', async ({ page }) => {
    await page.goto('/')
    await expectNoViolations(page)
  })

  test('with backlog and scheduled tasks', async ({ page }) => {
    await page.goto('/')
    await addBacklogTask(page, 'Alpha')
    await addBacklogTask(page, 'Beta')
    const day = page.locator('[data-ph-schedule-date]').first()
    await dragTo(page, taskCard(page.getByRole('region', { name: 'Backlog' }), 'Beta'), day, {
      x: 60,
      y: 120,
    })
    await expectNoViolations(page)
  })

  test('task detail panel open', async ({ page }) => {
    await page.goto('/')
    await addBacklogTask(page, 'Alpha')
    await page.getByRole('button', { name: 'Open details for Alpha' }).click()
    await expectNoViolations(page)
  })

  test('brain dump dialog open', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Import from text…' }).click()
    await expectNoViolations(page)
  })
})

test.describe('keyboard', () => {
  test('reorders the backlog with the keyboard via the move buttons', async ({ page }) => {
    await page.goto('/')
    await addBacklogTask(page, 'First')
    await addBacklogTask(page, 'Second')
    const titles = page.locator('.ph-backlog__item .ph-card__title-link')
    const before = await titles.allTextContents()

    await page.getByRole('button', { name: 'Move Second up in backlog' }).focus()
    await page.keyboard.press('Enter')

    await expect.poll(() => titles.allTextContents()).toEqual([...before].reverse())
  })

  test('Enter on a card title opens its details', async ({ page }) => {
    await page.goto('/')
    await addBacklogTask(page, 'Alpha')

    await page.getByRole('button', { name: 'Open details for Alpha' }).focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).toBeVisible()
  })

  // Known limitation (documented in README): dnd-kit's keyboard sensor lifts the card, but arrow
  // keys never change the drop target, so the order does not change. The move buttons above are
  // the keyboard path for now.
  test.fixme('reorders the backlog with Space and arrow keys', async ({ page }) => {
    await page.goto('/')
    await addBacklogTask(page, 'First')
    await addBacklogTask(page, 'Second')
    const titles = page.locator('.ph-backlog__item .ph-card__title-link')
    const before = await titles.allTextContents()

    await taskCard(page.getByRole('region', { name: 'Backlog' }), 'Second').focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Space')

    await expect.poll(() => titles.allTextContents()).toEqual([...before].reverse())
  })

  test('the scrollable schedule panel is keyboard focusable', async ({ page }) => {
    await page.goto('/')
    const panel = page.locator('#ph-schedule-panel')
    await panel.focus()
    await expect(panel).toBeFocused()
  })
})
