"""
Full-scroll audit. Captures every viewport-height of the live site at both
desktop (1440x900) and mobile (390x844). Records any DOM/console errors.
"""
import asyncio, json, os
from playwright.async_api import async_playwright

URL = "https://wiseamos-portfolio-2026.vercel.app"
OUT = "/root/wiseamos-portfolio-2026/captures/audit-v3-live-2026-06-11"
os.makedirs(OUT, exist_ok=True)
os.makedirs(f"{OUT}/desktop", exist_ok=True)
os.makedirs(f"{OUT}/mobile", exist_ok=True)

async def run(viewport, label):
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=[
            '--use-gl=swiftshader', '--ignore-gpu-blocklist', '--no-sandbox',
        ])
        ctx = await b.new_context(viewport=viewport, device_scale_factor=1)
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(f"PAGEERR: {e}"))
        def on_console(m):
            if m.type in ("error", "warning"):
                errors.append(f"CONSOLE[{m.type}]: {m.text}")
        page.on("console", on_console)
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2500)

        total = await page.evaluate("() => document.documentElement.scrollHeight")
        vh = viewport["height"]
        steps = max(1, (total + vh - 1) // vh)
        print(f"[{label}] total={total}px, vh={vh}, steps={steps}")

        for i in range(steps):
            y = i * vh
            await page.evaluate(f"window.scrollTo({{top:{y},behavior:'instant'}})")
            await page.wait_for_timeout(400)
            await page.evaluate("window.dispatchEvent(new Event('scroll'))")
            await page.wait_for_timeout(300)
            path = f"{OUT}/{label}/step-{i:02d}-y{y}.png"
            await page.screenshot(path=path, full_page=False)

        audit = await page.evaluate("""() => {
          const all = document.querySelectorAll('*');
          const overflowing = [];
          all.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > window.innerWidth + 1 || r.left < -1) {
              overflowing.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,40), left:Math.round(r.left), right:Math.round(r.right), w:Math.round(r.width)});
            }
          });
          const workT = document.querySelector('#workTable, .work__table, table');
          return {
            docW: document.documentElement.scrollWidth,
            viewportW: window.innerWidth,
            overflowCount: overflowing.length,
            firstOverflow: overflowing.slice(0,8),
            workTableExists: !!workT,
            workTableSize: workT ? {w:workT.offsetWidth, h:workT.offsetHeight, rows:workT.querySelectorAll('tr').length} : null,
          };
        }""")
        print(f"[{label}] AUDIT: {json.dumps(audit, indent=2)}")
        if errors:
            print(f"[{label}] CONSOLE/PAGE ERRORS: {errors[:10]}")
        await b.close()

async def main():
    await run({"width":1440,"height":900}, "desktop")
    await run({"width":390,"height":844}, "mobile")

asyncio.run(main())
