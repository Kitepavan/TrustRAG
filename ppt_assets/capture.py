"""Capture real implementation screenshots of the TrustRAG web app."""
import json
import urllib.request
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = "/home/pavan/TrustRAG/ppt_assets/screenshots"


def login(username: str, password: str) -> str:
    req = urllib.request.Request(
        "http://localhost:8000/auth/login",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=10).read())["access_token"]


def open_page(page, token: str, path: str):
    page.goto(BASE + "/")
    page.evaluate(
        "(t) => { try { localStorage.setItem('trustrag_token', t); } catch(e) {} }", token
    )
    page.goto(BASE + path)
    page.wait_for_timeout(1200)


def shot(page, name: str):
    page.screenshot(path=f"{OUT}/{name}.png")
    print("saved", name)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page.set_default_timeout(20000)

    # ---- Admin persona (shows RBAC switcher + baseline toggle) ----
    admin_tok = login("admin", "admin123")
    emp_tok = login("emp_user", "emp123")

    # 1. Dashboard
    open_page(page, admin_tok, "/")
    page.wait_for_selector("text=Secure Retrieval-Augmented Generation")
    page.wait_for_timeout(600)
    shot(page, "dashboard")

    # 2. RAG Chat with a live query (secure mode)
    open_page(page, admin_tok, "/chat")
    page.wait_for_selector("textarea")
    page.fill("textarea", "What is the password rotation policy?")
    page.click("button[type='submit']")
    # wait for the assistant answer bubble to appear
    page.wait_for_selector("text=ANSWER", timeout=60000)
    page.wait_for_timeout(1200)
    shot(page, "chat_secure")

    # 3. Security Benchmark
    open_page(page, admin_tok, "/evaluation")
    page.wait_for_selector("text=Attack Benchmark Scenarios")
    page.wait_for_timeout(800)
    shot(page, "evaluation")

    # 4. Documents
    open_page(page, admin_tok, "/documents")
    page.wait_for_selector("text=Documents")
    page.wait_for_timeout(600)
    shot(page, "documents")

    # 5. Knowledge Base
    open_page(page, admin_tok, "/knowledge")
    page.wait_for_selector("text=Knowledge")
    page.wait_for_timeout(600)
    shot(page, "knowledge")

    # 6. System Status
    open_page(page, admin_tok, "/status")
    page.wait_for_selector("text=Status")
    page.wait_for_timeout(600)
    shot(page, "status")

    browser.close()
    print("ALL DONE")
