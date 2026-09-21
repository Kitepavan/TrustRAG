"""Capture the benchmark page full-height and crop to metric cards + all scenarios."""
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = "/home/pavan/TrustRAG/ppt_assets/screenshots"
from PIL import Image


def login(username, password):
    req = urllib.request.Request(
        "http://localhost:8000/auth/login",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=10).read())["access_token"]


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page.set_default_timeout(30000)
    tok = login("admin", "admin123")
    page.goto(BASE + "/")
    page.evaluate("(t) => { try { localStorage.setItem('trustrag_token', t); } catch(e) {} }", tok)
    page.goto(BASE + "/evaluation")
    page.wait_for_selector("text=Attack Benchmark Scenarios")
    page.wait_for_timeout(900)
    # full scrollable page
    page.screenshot(path=f"{OUT}/evaluation_full.png", full_page=True)
    h = page.evaluate("document.body.scrollHeight")
    print("full page height:", h)
    browser.close()

im = Image.open(f"{OUT}/evaluation_full.png")
w, hh = im.size
print("full image:", w, hh)
# crop: keep from top through the end of scenario 4 (leave a small bottom margin)
crop_h = min(hh, int(w * 0.78))  # ~1440x1123, keeps metric cards + 4 scenarios
im.crop((0, 0, w, crop_h)).save(f"{OUT}/evaluation.png")
print("cropped to:", w, crop_h)
