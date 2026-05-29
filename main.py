from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from datetime import datetime, timezone
import json
import os

app = FastAPI(title="Trading AI Bot")

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "degistir")
PAPER_MODE = os.getenv("PAPER_MODE", "true").lower() == "true"
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

signals = []

def send_telegram(message: str):
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "bos":
        return
    import requests
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}, timeout=8)
    except Exception:
        pass

def process_signal(payload: dict):
    symbol = payload.get("symbol", "?")
    action = payload.get("action", "?")
    price = payload.get("price", 0)
    timeframe = payload.get("timeframe", "?")
    sl = payload.get("sl", "-")
    tp = payload.get("tp", "-")

    signals.append({
        "created_at": datetime.now(timezone.utc).isoformat(),
        "symbol": symbol,
        "action": action,
        "price": price,
        "timeframe": timeframe,
        "sl": sl,
        "tp": tp,
        "paper": PAPER_MODE
    })

    mode = "📋 KAĞIT" if PAPER_MODE else "🔴 CANLI"
    emoji = "🟢" if action == "buy" else "🔴"
    msg = (
        f"{emoji} *{action.upper()} SİNYALİ* [{mode}]\n"
        f"Sembol: `{symbol}`\n"
        f"Fiyat: `{price}`\n"
        f"Zaman Dilimi: `{timeframe}`\n"
        f"SL: `{sl}` | TP: `{tp}`"
    )
    send_telegram(msg)

@app.get("/health")
def health():
    return {"status": "ok", "paper_mode": PAPER_MODE, "signals_count": len(signals)}

@app.post("/webhook/tradingview")
async def webhook(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    if payload.get("secret") != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Yetkisiz")
    background_tasks.add_task(process_signal, payload)
    return {"ok": True}

@app.get("/signals")
def get_signals():
    return signals[-50:]
