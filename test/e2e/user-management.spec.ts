import { test, expect } from '@playwright/test';

test('should complete the user registration flow', async ({ page }) => {
  await page.goto('/users');
  
  // 1. Ensure page is ready
  await page.waitForLoadState('networkidle');

  // 2. Click Register button
  const registerBtn = page.getByRole('button', { name: /register new/i });
  await registerBtn.click();

  // 3. Robust Dialog Detection
  // If 'dialog' role fails, we look for the specific Heading text
  // We use a broader locator to find the modal container
  const modalHeader = page.getByText('Create User', { exact: true });
  await expect(modalHeader).toBeVisible({ timeout: 10000 });

  // 4. Fill form using placeholders (Scoped to the visible text to ensure context)
  await page.getByPlaceholder('Full Name').fill('E2E Test User');
  await page.getByPlaceholder('Username').fill('Tesing_User');
  await page.getByPlaceholder('Email Address').fill('e2e@test.com');
  
  // 5. Shadcn Select (Combobox)
  await page.getByRole('combobox').click();
  // Options are usually rendered in a portal at the end of the body
  await page.getByRole('option', { name: 'Staff' }).click();

  await page.getByPlaceholder('********').fill('securepassword');

  // 6. Submit using the "Register" text from your Vue file
  await page.getByRole('button', { name: 'Register', exact: true }).click();

  // 7. Verification
  await expect(modalHeader).not.toBeVisible();
  await expect(page.locator('table')).toContainText('E2E Test User');
});