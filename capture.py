#!/usr/bin/env python3
"""
capture.py — record video + stills of the deployed portfolio.

What it does
------------
1. Opens the live URL in headless Chromium with WebGL enabled.
2. For each viewport (desktop + mobile):
   - Records a scroll-through video via CDP screencast.
   - Saves per-section stills at 4 scroll positions.
3. Converts the raw WebM screencast into a clean WebM (or MP4) and
   extracts evenly-spaced frames for vision analysis.
4. Writes a summary JSON with metadata.

Usage
-----
    python3 capture.py                       # capture from default URL
    python3 capture.py --url <URL>           # capture from a specific URL
    python3 capture.py --out captures/run-01 # custom output dir
    python3 capture.py --no-video            # stills only (faster)
    python3 capture.py --viewport desktop   # only one viewport

Outputs (under <out>/)
----------------------
    desktop.webm           full-page scroll video (desktop)
    mobile.webm            full-page scroll video (mobile)
    desktop-frames/        N PNG frames extracted from desktop.webm
    mobile-frames/         N PNG frames extracted from mobile.webm
    desktop-still-NNN.png  stills at 4 key scroll positions
    mobile-still-NNN.png
    summary.json           metadata: duration, fps, size, frames extracted, etc.
"""

import argparse
import asyncio
import base64
import json
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright", file=sys.stderr)
    sys.exit(1)


# ---------- defaults ----------
DEFAULT_URL = "https://wiseamos-portfolio-2026.vercel.app"
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900,  "device_scale_factor": 1, "is_mobile": False},
    "mobile":  {"width": 390,  "height": 844,  "device_scale_factor": 2, "is_mobile": True,  "has_touch": True},
}
SCROLL_DURATION_S = 12   # how long the scroll-through video should be
FPS = 20                 # screencast capture rate
FRAME_COUNT = 12         # evenly-spaced frames extracted for vision analysis
KEEP_RAW_SCREENCAST = False  # if False, delete per-frame PNGs after encoding (~95MB savings)


# ---------- helpers ----------

def log(*a):
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}]", *a, flush=True)


def run_ffmpeg(args: list[str]) -> None:
    """Run ffmpeg, raise on failure."""
    log("ffmpeg", " ".join(args))
    res = subprocess.run(args, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed (rc={res.returncode}):\n{res.stderr}")


def get_video_meta(path: Path) -> dict:
    """Probe a video file with ffprobe and return duration / size / fps."""
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration,size:stream=width,height,r_frame_rate,codec_name",
         "-of", "json", str(path)],
        capture_output=True, text=True
    )
    if res.returncode != 0:
        return {"error": res.stderr}
    try:
        data = json.loads(res.stdout)
    except json.JSONDecodeError:
        return {"raw": res.stdout, "error": "parse failed"}
    fmt = data.get("format", {})
    streams = data.get("streams", [])
    s0 = streams[0] if streams else {}
    # r_frame_rate is "30/1" etc
    rfr = s0.get("r_frame_rate", "0/1")
    try:
        num, den = rfr.split("/")
        fps = float(num) / float(den) if float(den) else 0
    except Exception:
        fps = 0
    return {
        "duration_s": float(fmt.get("duration", 0)),
        "size_bytes": int(fmt.get("size", 0)),
        "width": int(s0.get("width", 0)),
        "height": int(s0.get("height", 0)),
        "fps": round(fps, 2),
        "codec": s0.get("codec_name"),
    }


def extract_frames(video: Path, out_dir: Path, count: int) -> list[Path]:
    """Extract `count` evenly-spaced PNG frames from a video."""
    out_dir.mkdir(parents=True, exist_ok=True)
    # Get duration first
    meta = get_video_meta(video)
    dur = meta.get("duration_s", 0)
    if dur <= 0:
        log("WARN: video has 0 duration, skipping frame extraction")
        return []
    # fps=count/dur gives exactly `count` frames evenly distributed
    fps_extract = max(0.5, count / dur)
    pattern = out_dir / "frame-%03d.png"
    run_ffmpeg([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(video),
        "-vf", f"fps={fps_extract}",
        "-frames:v", str(count),
        str(pattern),
    ])
    frames = sorted(out_dir.glob("frame-*.png"))
    return frames


def remux_webm(src: Path, dst: Path) -> Path:
    """Re-encode raw CDP screencast into a sane WebM (VP8/VP9). CDP output is
    already WebM/VP8 but stream metadata can be quirky; remux is safer."""
    run_ffmpeg([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(src),
        "-c:v", "libvpx-vp9", "-b:v", "2M", "-row-mt", "1",
        str(dst),
    ])
    return dst


# ---------- core capture ----------

async def smooth_scroll(page, duration_s: float) -> None:
    """Scroll the page top→bottom over `duration_s` seconds, ease-in-out."""
    h = await page.evaluate("document.documentElement.scrollHeight - window.innerHeight")
    if h <= 0:
        return
    # Animate window.scrollY from 0 → h
    await page.evaluate(f"""
      (async () => {{
        const start = performance.now();
        const dur = {int(duration_s * 1000)};
        const total = {int(h)};
        function ease(t) {{ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }}
        return new Promise(resolve => {{
          function step(now) {{
            const t = Math.min(1, (now - start) / dur);
            window.scrollTo(0, total * ease(t));
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          }}
          requestAnimationFrame(step);
        }});
      }})();
    """)
    # Hold at bottom for a beat so we capture the footer
    await page.wait_for_timeout(600)


async def capture_viewport(name: str, vp: dict, url: str, out_dir: Path,
                           record_video: bool, *, scroll_duration: float,
                           fps: int, frame_count: int, keep_raw: bool) -> dict:
    """Capture one viewport. Returns metadata dict."""
    log(f"== {name} ==")
    p = await async_playwright().start()
    browser = await p.chromium.launch(
        executable_path="/usr/bin/chromium-browser",
        args=[
            "--use-gl=swiftshader",
            "--ignore-gpu-blocklist",
            "--enable-webgl",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
    )
    try:
        ctx = await browser.new_context(
            viewport={"width": vp["width"], "height": vp["height"]},
            device_scale_factor=vp.get("device_scale_factor", 1),
            is_mobile=vp.get("is_mobile", False),
            has_touch=vp.get("has_touch", False),
        )
        page = await ctx.new_page()

        # Allow WebGL on headless
        await page.add_init_script("""
          // No-op: just place for any per-context init
        """)

        # CDP screencast setup (always — we want frames regardless of
        # whether we keep the video, for the stills at 4 key positions)
        client = await page.context.new_cdp_session(page)
        await client.send("Page.enable")

        results: dict = {
            "viewport": name,
            "width": vp["width"],
            "height": vp["height"],
            "video_path": None,
            "video_meta": None,
            "stills": [],
            "frames_dir": None,
            "frame_count": 0,
            "error": None,
        }

        # Start screencast BEFORE navigation
        frame_dir = out_dir / f"{name}-screencast-frames"
        if record_video:
            frame_dir.mkdir(parents=True, exist_ok=True)
        frames_received: list[bytes] = []
        screencast_format = {"format": "png", "quality": 80}

        async def on_screencast(msg):
            if not record_video:
                try:
                    await client.send("Page.screencastFrameAck", {"sessionId": msg["sessionId"]})
                except Exception:
                    pass
                return
            data = msg.get("data")
            if data:
                frames_received.append(base64.b64decode(data))
            # Ack to keep stream going
            try:
                await client.send("Page.screencastFrameAck", {"sessionId": msg["sessionId"]})
            except Exception:
                pass

        def on_msg(m):
            # Schedule the coroutine; ignore if loop is closing
            try:
                asyncio.create_task(on_screencast(m))
            except RuntimeError:
                pass

        client.on("Page.screencastFrame", on_msg)
        await client.send("Page.startScreencast", screencast_format)

        # Navigate
        log(f"  → {url}")
        await page.goto(url, wait_until="networkidle", timeout=30000)
        # Let the 3D settle and GSAP reveal animations play
        await page.wait_for_timeout(2500)

        # ----- Still 1: top of page (hero) -----
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(800)
        still1 = out_dir / f"{name}-still-01-top.png"
        await page.screenshot(path=str(still1), full_page=False)
        results["stills"].append(str(still1))

        # ----- Scroll through (this also generates the screencast video) -----
        log(f"  scroll-through ({scroll_duration}s)…")
        await smooth_scroll(page, scroll_duration)

        # ----- Still at end -----
        still_end = out_dir / f"{name}-still-02-bottom.png"
        await page.screenshot(path=str(still_end), full_page=False)
        results["stills"].append(str(still_end))

        # ----- Stills at scene section: 25% and 75% of pin range -----
        scene_info = await page.evaluate("""
          () => {
            const s = document.getElementById('scene');
            if (!s) return null;
            return { top: s.getBoundingClientRect().top + window.scrollY,
                     h: s.offsetHeight, vh: window.innerHeight };
          }
        """)
        if scene_info and scene_info["h"] > scene_info["vh"]:
            pinStart = scene_info["top"] + (scene_info["h"] - scene_info["vh"]) * 0.25
            await page.evaluate(f"window.scrollTo({{top:{pinStart}, behavior:'instant'}})")
            await page.wait_for_timeout(1200)
            still3 = out_dir / f"{name}-still-03-scene-25.png"
            await page.screenshot(path=str(still3), full_page=False)
            results["stills"].append(str(still3))

            pinStart = scene_info["top"] + (scene_info["h"] - scene_info["vh"]) * 0.75
            await page.evaluate(f"window.scrollTo({{top:{pinStart}, behavior:'instant'}})")
            await page.wait_for_timeout(1200)
            still4 = out_dir / f"{name}-still-04-scene-75.png"
            await page.screenshot(path=str(still4), full_page=False)
            results["stills"].append(str(still4))

        # ----- Stop screencast & save raw frames as WebM -----
        await client.send("Page.stopScreencast")

        if record_video and frames_received:
            # CDP screencast frames are PNGs. Combine into a video:
            #   1. Write each frame to disk
            #   2. ffmpeg from the pattern → WebM
            log(f"  writing {len(frames_received)} screencast frames…")
            for i, png_bytes in enumerate(frames_received, 1):
                (frame_dir / f"f{i:05d}.png").write_bytes(png_bytes)

            raw_webm = out_dir / f"{name}-raw.webm"
            # Encode the screencast PNGs into a WebM. Use H.264? No — WebM
            # players expect VP8/VP9. libvpx is slow but still much faster
            # than re-encoding an already-encoded stream. To speed up we use
            # "-deadline realtime -cpu-used 5" which trades quality for speed.
            run_ffmpeg([
                "ffmpeg", "-y", "-loglevel", "error",
                "-framerate", str(fps),
                "-i", str(frame_dir / "f%05d.png"),
                "-c:v", "libvpx-vp9", "-b:v", "2M",
                "-deadline", "realtime", "-cpu-used", "5",
                "-row-mt", "1", "-threads", "0",
                "-pix_fmt", "yuv420p",
                str(raw_webm),
            ])
            # The "remux" step was a no-op identity; skip it and just rename.
            final_webm = out_dir / f"{name}.webm"
            raw_webm.replace(final_webm)
            results["video_path"] = str(final_webm)
            results["video_meta"] = get_video_meta(final_webm)
            # Save the raw frames dir for debugging
            results["frames_dir"] = str(frame_dir)

            # Extract evenly-spaced analysis frames
            analysis_dir = out_dir / f"{name}-frames"
            frames = extract_frames(final_webm, analysis_dir, frame_count)
            results["frame_count"] = len(frames)
            log(f"  extracted {len(frames)} analysis frames → {analysis_dir}")

            # Cleanup the redundant raw.webm (we already moved it to final_webm)
            # Note: raw_webm.replace(final_webm) above already moved it; nothing to do.

            # Optionally delete raw per-frame PNGs to save disk
            if not keep_raw:
                try:
                    shutil.rmtree(frame_dir)
                    log(f"  removed raw frames (use --keep-raw to preserve)")
                    results["frames_dir"] = None
                except Exception as e:
                    log(f"  WARN: could not remove {frame_dir}: {e}")

        await ctx.close()
        return results
    except Exception as e:
        log(f"  ERROR: {e}")
        return {"viewport": name, "error": str(e)}
    finally:
        try:
            await browser.close()
        except Exception:
            pass
        try:
            await p.stop()
        except Exception:
            pass


# ---------- main ----------

async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default=DEFAULT_URL, help="URL to capture (default: %(default)s)")
    ap.add_argument("--out", default=None, help="Output directory (default: captures/<timestamp>)")
    ap.add_argument("--no-video", action="store_true", help="Skip video recording; stills only")
    ap.add_argument("--viewport", choices=["desktop", "mobile", "both"], default="both",
                    help="Which viewports to capture (default: both)")
    ap.add_argument("--scroll-duration", type=float, default=SCROLL_DURATION_S,
                    help="Seconds for the scroll-through animation (default: %(default)s)")
    ap.add_argument("--frames", type=int, default=FRAME_COUNT,
                    help="Number of analysis frames to extract per video (default: %(default)s)")
    ap.add_argument("--fps", type=int, default=FPS,
                    help="Target capture framerate (default: %(default)s)")
    ap.add_argument("--keep-raw", action="store_true",
                    help="Keep raw per-frame PNGs (large; ~100MB per viewport). Default: delete after encoding.")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        print("ERROR: ffmpeg is not installed or not on PATH.", file=sys.stderr)
        sys.exit(1)
    if not shutil.which("ffprobe"):
        print("ERROR: ffprobe is not installed or not on PATH.", file=sys.stderr)
        sys.exit(1)

    scroll_duration = args.scroll_duration
    frame_count = args.frames
    fps = args.fps

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = Path(args.out) if args.out else Path("captures") / f"run-{ts}"
    out_dir.mkdir(parents=True, exist_ok=True)
    log(f"out = {out_dir}")
    log(f"url = {args.url}")
    viewports = {}
    if args.viewport in ("desktop", "both"):
        viewports["desktop"] = VIEWPORTS["desktop"]
    if args.viewport in ("mobile", "both"):
        viewports["mobile"] = VIEWPORTS["mobile"]

    summary = {
        "url": args.url,
        "timestamp": ts,
        "scroll_duration_s": scroll_duration,
        "fps": fps,
        "frame_count": frame_count,
        "viewports": {},
    }

    for name, vp in viewports.items():
        res = await capture_viewport(
            name, vp, args.url, out_dir,
            not args.no_video,
            scroll_duration=scroll_duration,
            fps=fps,
            frame_count=frame_count,
            keep_raw=args.keep_raw,
        )
        summary["viewports"][name] = res

    summary_path = out_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2))
    log(f"wrote {summary_path}")

    # Pretty print summary
    print()
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
