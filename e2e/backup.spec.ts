import { expect, test } from '@playwright/test'

import { addBacklogTask, dragTo, taskCard } from './helpers'

test('export then import on a clean profile restores the plan', async ({ page, browser }, testInfo) => {
  await page.goto('/')
  await addBacklogTask(page, 'Stays in backlog')
  await addBacklogTask(page, 'Gets scheduled')
  const backlog = page.getByRole('region', { name: 'Backlog' })
  const day = page.locator('[data-ph-schedule-date]').first()
  await dragTo(page, taskCard(backlog, 'Gets scheduled'), day, { x: 60, y: 120 })
  await expect(taskCard(day, 'Gets scheduled')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('polyhue-planner-backup.json')
  const backupPath = testInfo.outputPath('backup.json')
  await download.saveAs(backupPath)

  // A new browser context has empty localStorage, like a clean profile.
  const context = await browser.newContext()
  const fresh = await context.newPage()
  await fresh.goto('/')
  await fresh.locator('input[type=file]').setInputFiles(backupPath)

  const freshDay = fresh.locator('[data-ph-schedule-date]').first()
  await expect(taskCard(fresh.getByRole('region', { name: 'Backlog' }), 'Stays in backlog')).toBeVisible()
  await expect(taskCard(freshDay, 'Gets scheduled')).toBeVisible()
  await context.close()
})

test('malformed import shows an error and keeps the current plan', async ({ page }, testInfo) => {
  await page.goto('/')
  await addBacklogTask(page, 'Keep me')

  const bad = testInfo.outputPath('bad.json')
  await (await import('node:fs/promises')).writeFile(bad, '{"tasks": "nope"}')
  await page.locator('input[type=file]').setInputFiles(bad)

  await expect(page.locator('.ph-notice-region')).toContainText('Import failed')
  await expect(taskCard(page.getByRole('region', { name: 'Backlog' }), 'Keep me')).toBeVisible()
})

test('importing over existing data asks first, and cancel keeps the plan', async ({ page }, testInfo) => {
  await page.goto('/')
  await addBacklogTask(page, 'Original')

  const other = testInfo.outputPath('other.json')
  const payload = {
    tasks: [{ id: 'x', title: 'Imported', durationMinutes: 30, status: 'backlog', createdAt: '2026-01-01T00:00:00.000Z' }],
    blocks: [],
  }
  await (await import('node:fs/promises')).writeFile(other, JSON.stringify(payload))

  page.once('dialog', (d) => d.dismiss())
  await page.locator('input[type=file]').setInputFiles(other)
  await expect(taskCard(page.getByRole('region', { name: 'Backlog' }), 'Original')).toBeVisible()
  await expect(taskCard(page.getByRole('region', { name: 'Backlog' }), 'Imported')).toHaveCount(0)

  page.once('dialog', (d) => d.accept())
  await page.locator('input[type=file]').setInputFiles(other)
  await expect(taskCard(page.getByRole('region', { name: 'Backlog' }), 'Imported')).toBeVisible()
  await expect(taskCard(page.getByRole('region', { name: 'Backlog' }), 'Original')).toHaveCount(0)
})
