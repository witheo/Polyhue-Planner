import { expect, test } from '@playwright/test'

import { addBacklogTask, dragTo, taskCard } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('drags a backlog task onto the schedule and back', async ({ page }) => {
  await addBacklogTask(page, 'Plan the week')
  const backlog = page.getByRole('region', { name: 'Backlog' })
  const day = page.locator('[data-ph-schedule-date]').first()

  await dragTo(page, taskCard(backlog, 'Plan the week'), day, { x: 60, y: 120 })

  await expect(taskCard(day, 'Plan the week')).toBeVisible()
  await expect(taskCard(backlog, 'Plan the week')).toHaveCount(0)

  await dragTo(page, taskCard(day, 'Plan the week'), backlog)

  await expect(taskCard(backlog, 'Plan the week')).toBeVisible()
  await expect(taskCard(day, 'Plan the week')).toHaveCount(0)
})

test('reorders the backlog with the arrow buttons', async ({ page }) => {
  await addBacklogTask(page, 'First')
  await addBacklogTask(page, 'Second')
  const titles = page.locator('.ph-backlog__item .ph-card__title-link')
  const before = await titles.allTextContents()

  await page.getByRole('group', { name: 'Reorder Second in backlog' }).getByRole('button').first().click()

  expect(await titles.allTextContents()).toEqual([...before].reverse())
})

test('reorders the backlog by dragging', async ({ page }) => {
  await addBacklogTask(page, 'First')
  await addBacklogTask(page, 'Second')
  const backlog = page.getByRole('region', { name: 'Backlog' })
  const titles = page.locator('.ph-backlog__item .ph-card__title-link')
  const before = await titles.allTextContents()

  await dragTo(page, taskCard(backlog, 'Second'), taskCard(backlog, 'First'), { x: 12, y: 20 })

  expect(await titles.allTextContents()).toEqual([...before].reverse())
})
