const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  await new Promise((r) => setTimeout(r, 2000));

  console.log("Captured errors:", errors);

  // Get localStorage snapshot
  const snapshot = await page.evaluate(() => localStorage.getItem("et_snapshot"));
  if (snapshot) {
    const data = JSON.parse(snapshot);
    console.log("Categories count:", data.categories?.length);
    console.log("Expenses count:", data.expenses?.length);
  }

  await browser.close();
})();
