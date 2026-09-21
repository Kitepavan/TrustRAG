"""Re-capture chat (real LLM answer + Trusted citation), benchmark (all 4 scenarios), dashboard (updated security card)."""
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = "/home/pavan/TrustRAG/ppt_assets/screenshots"
FALLBACK_MARKERS = ["transient rate-limit", "retrieved knowledge context", "External LLM service"]


def login(username, password):
    req = urllib.request.Request(
        "http://localhost:8000/auth/login",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=10).read())["access_token"]


def open_page(page, token, path):
    page.goto(BASE + "/")
    page.evaluate("(t) => { try { localStorage.setItem('trustrag_token', t); } catch(e) {} }", token)
    page.goto(BASE + path)
    page.wait_for_timeout(1200)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page.set_default_timeout(30000)
    admin_tok = login("admin", "admin123")

    # ---- Chat: retry until a real LLM answer (not the rate-limit fallback) ----
    for attempt in range(1, 6):
        open_page(page, admin_tok, "/chat")
        page.wait_for_selector("textarea")
        page.fill("textarea", "How often must employees change their passwords?")
        page.click("button[type='submit']")
        page.wait_for_selector("text=ANSWER", timeout=60000)
        page.wait_for_timeout(1000)
        body = page.inner_text("body")
        if not any(m in body for m in FALLBACK_MARKERS):
            print(f"chat attempt {attempt}: real LLM answer captured")
            break
        print(f"chat attempt {attempt}: fallback detected, retrying...")
        page.wait_for_timeout(2000)
    page.screenshot(path=f"{OUT}/chat_secure.png")

    # verify the citation shows a Trusted badge + doc id
    body = page.inner_text("body")
    print("doc id present:", "DOC-" in body, "| trusted badge:", "Trusted" in body)

    # ---- Evaluation: tall viewport so all 4 scenarios fit ----
    tall = browser.new_page(viewport={"width": 1440, "height": 1560}, device_scale_factor=1)
    tall.set_default_timeout(30000)
    open_page(tall, admin_tok, "/evaluation")
    tall.wait_for_selector("text=Attack Benchmark Scenarios")
    tall.wait_for_timeout(900)
    tall.screenshot(path=f"{OUT}/evaluation_full.png")

    # ---- Dashboard (updated security-layer card) ----
    open_page(page, admin_tok, "/")
    page.wait_for_selector("text=Secure Retrieval-Augmented Generation")
    page.wait_for_timeout(700)
    page.screenshot(path=f"{OUT}/dashboard.png")

    browser.close()
    print("RE-CAPTURE DONE")
