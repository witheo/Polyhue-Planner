import { expect, test } from '@playwright/test'

import { addBacklogTask, dragTo, taskCard } from './helpers'

test('backlog and scheduled tasks survive a reload', async ({ page }) => {
  await page.goto('/')
  await addBacklogTask(page, 'Stays in backlog')
  await addBacklogTask(page, 'Gets scheduled')

  const backlog = page.getByRole('region', { name: 'Backlog' })
  const day = page.locator('[data-ph-schedule-date]').first()
  await dragTo(page, taskCard(backlog, 'Gets scheduled'), day, { x: 60, y: 120 })
  await expect(taskCard(day, 'Gets scheduled')).toBeVisible()

  // Persistence is debounced; wait for it to hit localStorage before reloading.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('polyhue-planner.v1') ?? ''))
    .toContain('"status":"scheduled"')
  await page.reload()

  const dayAfter = page.locator('[data-ph-schedule-date]').first()
  await expect(taskCard(page.getByRole('region', { name: 'Backlog' }), 'Stays in backlog')).toBeVisible()
  await expect(taskCard(dayAfter, 'Gets scheduled')).toBeVisible()
})
