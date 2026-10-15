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

test('learning path: pass a stage from the move page', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('thirdball:v1', JSON.stringify({ schemaVersion: 2, profile: {
      name: 'Kim', hand: 'R', grip: 'shakehand', level: 2, style: 'balanced', goals: ['consistency'], moves: [{ id: 'bh-push', mode: 'learn' }],
      workoutTypes: [], setups: ['partner'], schedule: { days: [0,1,2,3,4,5,6], time: null, length: 30, weeks: 4, startDate: '2026-01-05' },
      lowImpact: false, voice: 'calm', regenCount: 0 }, settings: { theme: 'light', sound: false, readCues: false } }));
  });
  await page.reload();
  await page.goto('./#/learn/bh-push');
  await expect(page.getByRole('heading', { name: 'See it' })).toBeVisible();
  await page.getByRole('button', { name: "I've watched it" }).click();
  await expect(page.getByRole('heading', { name: 'Shadow it' })).toBeVisible();
  const pass = page.getByRole('button', { name: 'I passed this stage' });
  await expect(pass).toBeDisabled();
  for (const g of await page.locator('.selfcheck').all()) await g.getByRole('radio', { name: 'Yes' }).click();
  await expect(pass).toBeEnabled();
  await pass.click();
  await expect(page.getByRole('heading', { name: 'Feel it' })).toBeVisible();
  await page.goto('./#/learn');
  await expect(page.getByText('Feel it').first()).toBeVisible();
});
