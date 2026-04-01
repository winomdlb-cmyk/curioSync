import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/Users/denglubin/curioSync/frontend/tests/screenshots/v3';

async function visualReview() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Starting Visual Review...');

  try {
    // 1. Home page
    console.log('1. Home page...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    // Wait for the page to be fully interactive
    await page.waitForSelector('button:has-text("新建主题")', { timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-home-page.png` });

    // 2. New Topic Dialog
    console.log('2. New topic dialog...');
    await page.locator('button:has-text("新建主题")').click();
    await page.waitForSelector('h2:has-text("新建主题")', { timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-new-topic-dialog.png` });

    // 3. Fill form and create topic
    console.log('3. Creating topic...');
    await page.locator('input[placeholder*="量子力学"]').fill('视觉验收测试主题');
    await page.locator('textarea[placeholder*="你想了解"]').fill('用于视觉验收测试');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-new-topic-form.png` });

    await page.locator('button:has-text("创建")').click();

    // Wait for navigation and page to load
    await page.waitForURL(/\/topic\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Wait for the chat input to appear (this is the key indicator the page is ready)
    await page.waitForSelector('textarea[placeholder*="问点什么吧"]', { timeout: 15000 });
    await page.waitForTimeout(1000); // Extra time for React to render
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-topic-page-ready.png` });

    // 4. Send a message
    console.log('4. Sending message...');
    const inputArea = page.locator('textarea[placeholder*="问点什么吧"]');
    await inputArea.fill('什么是量子力学？');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-message-typed.png` });

    await page.locator('button:has-text("↑")').click();

    // Wait for user message to appear
    await page.waitForSelector('text=什么是量子力学？', { timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-user-message-sent.png` });

    // Wait for AI response to start streaming
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-streaming-active.png` });

    // Wait for streaming to complete
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-streaming-complete.png` });

    // 5. Check for reasoning block
    console.log('5. Checking reasoning block...');
    // Look for any expandable/collapsible reasoning section
    const pageContent = await page.content();
    const hasReasoning = pageContent.includes('reasoning') || pageContent.includes('思考');
    console.log('Page has reasoning content:', hasReasoning);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-after-streaming.png` });

    // 6. Switch to knowledge graph
    console.log('6. Knowledge graph...');
    await page.locator('button:has-text("知识图谱")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-knowledge-graph.png` });

    // 7. Back to chat
    console.log('7. Back to chat...');
    await page.locator('button:has-text("返回对话")').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-back-to-chat.png` });

    // 8. Check DropdownMenu (conversation options)
    console.log('8. Testing DropdownMenu...');
    const convItem = page.locator('aside [class*="space-y-1"] > div').first();
    await convItem.hover();
    await page.waitForTimeout(500);

    const menuBtn = page.locator('button:has-text("···")').first();
    const menuVisible = await menuBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (menuVisible) {
      await menuBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12-dropdown-menu.png` });
      await page.keyboard.press('Escape');
    } else {
      // Just take a screenshot of the current state
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12-sidebar-hover.png` });
    }

    // 9. Home page
    console.log('9. Home page final check...');
    await page.locator('button:has-text("返回主页")').click();
    await page.waitForURL(BASE_URL + '/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-home-final.png` });

    console.log('\n=== Visual Review Complete ===');
    const { execSync } = require('child_process');
    const files = execSync(`ls -la ${SCREENSHOT_DIR}`).toString();
    console.log(files);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
}

visualReview();