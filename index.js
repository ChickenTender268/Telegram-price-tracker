require("dotenv").config();
const axios = require("axios");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;


const LOWER = 13.7;
const UPPER = 13.9;


const currencies = ["PLN", "PGK", "KES", "RWF", "MDL"];

// 💱 Manual FX (update occasionally or automate later)
const FX = {
  PLN: 0.26,
  PGK: 0.30,
  KES: 0.11,
  RWF: 0.01,
  MDL: 1.23
};

// 🧠 Prevent spam
let lastAlert = null;

// 📡 Fetch Binance P2P price
async function getPrice(currency) {
  try {
    const res = await axios.post(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        asset: "USDT",
        fiat: currency,
        tradeType: "BUY",
        page: 1,
        rows: 5
      }
    );

    const ads = res.data.data;
    if (!ads.length) return null;

    // Take best (lowest) price
    return parseFloat(ads[0].adv.price);
  } catch (err) {
    console.log(`Error fetching ${currency}`, err.message);
    return null;
  }
}

// 📲 Send Telegram alert
async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  await axios.post(url, {
    chat_id: CHAT_ID,
    text: message
  });
}

// 🔁 Main loop
async function scan() {
  console.log("Scanning markets...\n");

  let best = {
    currency: null,
    price: Infinity,
    bwp: Infinity
  };

  for (let cur of currencies) {
    const price = await getPrice(cur);
    if (!price || !FX[cur]) continue;

    const bwp = price * FX[cur];

    console.log(`${cur}: ${price} → ${bwp.toFixed(2)} BWP`);

    if (bwp < best.bwp) {
      best = { currency: cur, price, bwp };
    }
  }

  console.log("\nBest deal:", best);

  // 🚨 Alert logic
  if (best.bwp >= LOWER && best.bwp <= UPPER) {
    const msg = `🔥 BUY OPPORTUNITY

Currency: ${best.currency}
Price: ${best.price}
BWP Rate: ${best.bwp.toFixed(2)}

Target: ${LOWER} - ${UPPER}`;

    // Prevent duplicate spam
    if (lastAlert !== msg) {
      await sendTelegram(msg);
      lastAlert = msg;
    }
  }
}

// ⏱ Run every 30 seconds
setInterval(scan, 30000);
