import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/Users/denglubin/curioSync/frontend/tests/screenshots/v3';

async function visualReview() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Testing streaming completion with reasoning block...');

  try {
    // Create topic via API
    const response = await fetch('http://localhost:8000/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Reasoning测试', description: '测试reasoning块' })
    });
    const topic = await response.json();

    await page.goto(`${BASE_URL}/topic/${topic.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('textarea[placeholder*="问点什么吧"]', { timeout: 15000 });

    // Send a message that will trigger reasoning
    const inputArea = page.locator('textarea[placeholder*="问点什么吧"]');
    await inputArea.fill('为什么天空是蓝色的？');
    await page.locator('button:has-text("↑")').click();

    // Wait for streaming to complete - look for "生成中" to disappear
    console.log('Waiting for streaming to complete...');

    // Wait up to 15 seconds for "生成中" to disappear
    try {
      await page.waitForFunction(() => {
        const content = document.body.innerText;
        return !content.includes('生成中');
      }, { timeout: 15000 });
    } catch (e) {
      console.log('Timeout waiting for streaming to complete');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-streaming-final-state.png` });

    // Check for reasoning block
    const pageText = await page.innerText('body');
    console.log('\nPage contains "reasoning":', pageText.includes('reasoning'));
    console.log('Page contains "思考":', pageText.includes('思考'));
    console.log('Page contains "Reasoning":', pageText.includes('Reasoning'));

    // Look for any toggle buttons
    const buttons = await page.locator('button').all();
    console.log('\nAll buttons found:');
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => '');
      if (text.trim()) console.log('  - "' + text.trim() + '"');
    }

    console.log('\nFinal screenshot saved.');

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error-streaming.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
}

visualReview();