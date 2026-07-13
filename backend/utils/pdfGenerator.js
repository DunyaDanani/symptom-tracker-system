// Thin wrapper around Puppeteer for turning an HTML string into a PDF
// buffer. Launching headless Chrome takes ~1-2s, so instead of paying that
// cost on every report request, we launch one browser instance lazily on
// first use and keep it alive for the life of the server process — each
// request just opens/closes a lightweight page (tab) against it.

import puppeteer from "puppeteer";

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      .catch((err) => {
        // Don't cache a failed launch — otherwise every future request
        // reuses this same rejected promise and fails instantly without
        // ever retrying, until the server process is restarted.
        browserPromise = null;
        throw err;
      });

    browserPromise.then((browser) => {
      // If Chrome crashes/is killed later, drop the cached promise so the
      // next request launches a fresh instance instead of reusing a dead one.
      browser.on("disconnected", () => {
        browserPromise = null;
      });
    });
  }
  return browserPromise;
}

/**
 * Renders a self-contained HTML string to a PDF buffer (A4, print backgrounds on).
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
export async function renderPdfFromHtml(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1.5cm", bottom: "1.5cm", left: "1.5cm", right: "1.5cm" },
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

// Called from index.js on SIGINT/SIGTERM so the headless Chrome process
// doesn't linger after the server shuts down.
export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
