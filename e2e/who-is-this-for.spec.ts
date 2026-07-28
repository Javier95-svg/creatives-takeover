import { expect, test } from "@playwright/test";

test("hero audience dialog rotates, stops, resumes, and navigates manually", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });

  await page.getByRole("button", { name: "Who is this for?" }).click();
  const dialog = page.getByRole("dialog", { name: "Who is Creatives Takeover for?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("You need evidence before you need code.")).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Open ICP Builder:/ })).toHaveAttribute(
    "href",
    "/icp-builder",
  );
  await expect(dialog.getByRole("link", { name: /Open Demo Studio:/ })).toHaveAttribute(
    "href",
    "/demo-studio/try",
  );

  await expect(dialog.getByText("You shipped. Now growth still depends on you.")).toBeVisible({
    timeout: 7_000,
  });

  await dialog.getByRole("button", { name: "Stop automatic profile rotation" }).click();
  await page.waitForTimeout(5_300);
  await expect(dialog.getByText("You shipped. Now growth still depends on you.")).toBeVisible();

  await dialog.getByRole("button", { name: "Resume automatic profile rotation" }).click();
  await expect(dialog.getByText("You need evidence before you need code.")).toBeVisible({
    timeout: 7_000,
  });

  await dialog.getByRole("button", { name: "Show next founder profile" }).click();
  await expect(dialog.getByText("You shipped. Now growth still depends on you.")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Resume automatic profile rotation" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("reduced motion starts paused and the dialog fits a mobile viewport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "commit" });

  await page.getByRole("button", { name: "Who is this for?" }).click();
  const dialog = page.getByRole("dialog", { name: "Who is Creatives Takeover for?" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Resume automatic profile rotation" }),
  ).toBeVisible();

  await page.waitForTimeout(5_300);
  await expect(dialog.getByText("You need evidence before you need code.")).toBeVisible();
  await expect(dialog.getByText("You shipped. Now growth still depends on you.")).toHaveCount(0);

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.height).toBeLessThanOrEqual(844 * 0.91);

  const pmfLink = dialog.getByRole("link", { name: /Open PMF Lab:/ });
  await pmfLink.scrollIntoViewIfNeeded();
  await expect(pmfLink).toBeVisible();
});
