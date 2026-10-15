import { test, expect } from '@playwright/test';

test('new player: onboarding to plan, then log a drill', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Set up my plan' }).click();

  // 1 About you
  await page.getByPlaceholder('Optional').fill('Alex');
  await page.getByRole('button', { name: 'Next' }).click();
  // 2 Level: tick level 2 checks
  await page.getByRole('checkbox', { name: 'I can keep a forehand rally going 20+ times' }).click();
  await page.getByRole('checkbox', { name: 'Same on the backhand' }).click();
  await page.getByRole('checkbox', { name: 'I can push a backspin ball back low most of the time' }).click();
  await expect(page.getByText('Suggested level: Improver')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  // 3 Style
  await page.getByRole('radio', { name: /All-round attacker/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  // 4 Goals
  await page.getByRole('checkbox', { name: /Consistency/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  // 5 Moves: learn the forehand loop
  await page.getByRole('radiogroup', { name: 'Forehand loop against backspin' }).getByRole('radio', { name: 'Learn' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  // 6 Workouts
  await page.getByRole('button', { name: 'Next' }).click();
  // 7 Setup
  await page.getByRole('checkbox', { name: /A partner who can feed multiball/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  // 8 Schedule: every day so there is a session today
  for (const d of ['Sun', 'Mon', 'Wed', 'Fri']) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  // 9 Goal
  await page.getByRole('button', { name: 'Next' }).click();
  // 10 Options
  await page.getByRole('button', { name: 'Build my plan' }).click();

  await expect(page.getByRole('heading', { name: 'Why this plan' })).toBeVisible();
  await expect(page.getByText('Alex')).toBeVisible();
  await page.getByRole('link', { name: 'See today' }).click();
  await expect(page.getByText("Today's session")).toBeVisible();

  // Start the session and log the first drill
  await page.getByRole('link', { name: 'Start' }).first().click();
  await expect(page.locator('.player__count')).toHaveText(/^1 of/);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('radio', { name: 'Right' }).click();
  await page.getByRole('radio', { name: 'Yes' }).first().click();
  await page.getByRole('button', { name: 'Save and next' }).click();
  await expect(page.locator('.player__count')).toHaveText(/^2 of/);

  // Leave: the log is kept and the plan still shows
  await page.getByRole('button', { name: 'Close session' }).click();
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByText("Today's session")).toBeVisible();
  await page.getByRole('link', { name: 'Plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your plan' })).toBeVisible();
});
