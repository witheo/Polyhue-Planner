import { expect, test } from '@playwright/test'

import { dragTo, taskCard } from './helpers'

test('tells the user when a drop has no free slot', async ({ page }) => {
  // Today leaves only a 1h gap (5-6 AM), too small for the 2h task.
  await page.addInitScript(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const t = (id: string, title: string, durationMinutes: number, status: string) => ({
      id,
      title,
      durationMinutes,
      status,
      createdAt: '2026-01-01T00:00:00.000Z',
      color: '#6C63FF',
    })
    localStorage.setItem(
      'polyhue-planner.v1',
      JSON.stringify({
        tasks: [
          t('early', 'Early block', 300, 'scheduled'),
          t('late', 'Late block', 1080, 'scheduled'),
          t('big', 'Two hour task', 120, 'backlog'),
        ],
        blocks: [
          { taskId: 'early', startMinuteOfDay: 0, scheduledDate: today },
          { taskId: 'late', startMinuteOfDay: 360, scheduledDate: today },
        ],
      }),
    )
  })
  await page.goto('/')

  const backlog = page.getByRole('region', { name: 'Backlog' })
  const todayColumn = page.locator('[data-ph-schedule-date]').filter({
    has: page.getByLabel('Drag to move: Late block'),
  })
  await dragTo(page, taskCard(backlog, 'Two hour task'), todayColumn, { x: 60, y: 60 })

  await expect(page.locator('.ph-notice-region')).toHaveText('No free slot at that time')
  await expect(taskCard(backlog, 'Two hour task')).toBeVisible()
})
