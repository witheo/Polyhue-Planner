import { expect, test } from '@playwright/test'

test('adds a task to the backlog', async ({ page }) => {
  await page.goto('/')

  const backlog = page.getByRole('region', { name: 'Backlog' })
  await expect(backlog).toBeVisible()

  await backlog.getByLabel('Title').fill('E2E smoke task')
  await backlog.getByRole('button', { name: 'Add', exact: true }).click()

  await expect(backlog.getByText('E2E smoke task')).toBeVisible()
})
