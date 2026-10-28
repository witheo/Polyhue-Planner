import { expect, test, type Page } from '@playwright/test'

import { addBacklogTask, taskCard } from './helpers'

const readColors = (page: Page) =>
  page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('polyhue-planner.v1') ?? '{}')
    const tasks = raw.tasks ?? raw.state?.tasks ?? []
    return Object.fromEntries(tasks.map((t: { title: string; color: string }) => [t.title, t.color]))
  })

test('color picked in the composer is applied and persists', async ({ page }) => {
  await page.goto('/')
  const backlog = page.getByRole('region', { name: 'Backlog' })
  const swatch = backlog.getByRole('button', { name: 'New task color #4ECDC4' })
  await swatch.click()
  await expect(swatch).toHaveAttribute('aria-pressed', 'true')
  await addBacklogTask(page, 'Teal task')

  await expect(taskCard(backlog, 'Teal task')).toHaveCSS('border-left-color', 'rgb(78, 205, 196)')
  // Selection resets after adding.
  await expect(swatch).toHaveAttribute('aria-pressed', 'false')

  await expect.poll(() => readColors(page)).toMatchObject({ 'Teal task': '#4ECDC4' })
  await page.reload()
  await expect(taskCard(page.getByRole('region', { name: 'Backlog' }), 'Teal task')).toHaveCSS(
    'border-left-color',
    'rgb(78, 205, 196)',
  )
})

test('clicking the selected swatch again falls back to the automatic color', async ({ page }) => {
  await page.goto('/')
  const backlog = page.getByRole('region', { name: 'Backlog' })
  const swatch = backlog.getByRole('button', { name: 'New task color #6C63FF' })
  await swatch.click()
  await swatch.click()
  await expect(swatch).toHaveAttribute('aria-pressed', 'false')
  await addBacklogTask(page, 'First auto')
  await expect.poll(() => readColors(page)).toMatchObject({ 'First auto': '#FF6B6B' })
})

test('default behaviour without a swatch rotates the palette', async ({ page }) => {
  await page.goto('/')
  await addBacklogTask(page, 'Auto one')
  await addBacklogTask(page, 'Auto two')
  await expect.poll(() => readColors(page)).toMatchObject({
    'Auto one': '#FF6B6B',
    'Auto two': '#4ECDC4',
  })
})
