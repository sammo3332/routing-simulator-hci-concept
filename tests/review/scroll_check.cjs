const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.goto(process.env.BASE || "http://127.0.0.1:5173");
  console.log(await p.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight, scrollWidth: document.documentElement.scrollWidth, innerWidth, bodyMargin: getComputedStyle(document.body).margin })));
  await p.keyboard.press("End"); await p.waitForTimeout(200); console.log("scrollY after End key:", await p.evaluate(() => scrollY)); await b.close(); })();
