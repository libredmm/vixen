import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser } from "puppeteer";

puppeteer.use(StealthPlugin());

export async function createBrowser(): Promise<Browser> {
  return await puppeteer.launch({ headless: true });
}

interface Cookie {
  name: string;
  value: string;
}

export async function fetchPage(
  browser: Browser,
  url: string,
  cookies: Cookie[] = [],
): Promise<string> {
  const { hostname } = new URL(url);

  if (cookies.length > 0) {
    const cookieObjects = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: hostname,
      path: "/",
    }));
    await browser.setCookie(...cookieObjects);
  }

  const page = await browser.newPage();
  try {
    console.error(`[scrape] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    return await page.content();
  } finally {
    await page.close();
  }
}
