[Live Demo 🚀](https://stock-market-copilot.vercel.app)

# 📈 Zentrade

Your **AI-powered, RAG-based stock market dashboard** to track live prices, analyze your portfolio, receive real-time notifications, monitor trending stocks, get personalized research, and ask AI about the stock market.

---

## 🚀 Table of Contents

* [Features](#features)
* [Tech Stack](#tech-stack)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)

  * [Backend Setup (FastAPI)](#backend-setup-fastapi)
  * [Frontend Setup (Next.js)](#frontend-setup-nextjs)
* [Environment Variables](#environment-variables)
* [API Endpoints](#api-endpoints)
* [Key Functionality](#key-functionality)
* [Deployment](#deployment)
* [Troubleshooting](#troubleshooting)
* [FAQ](#faq)
* [Credits](#credits)

---

## ✨ Features

* **Live Stock Prices:**
  Get real-time price updates for S\&P 500 and other popular tickers.
* **Interactive Charts:**
  Dynamic charts for 1 month, 6 months, 1 year, 5 years, or all-time history.
* **Portfolio Management:**
  Add/remove stocks, track holdings, compute real-time total value.
* **Advanced Analytics:**
  See metrics like alpha, beta, Sharpe ratio, sector breakdown pie chart.
* **Watchlist:**
  Monitor stocks of interest, with live prices and trending tickers.
* **Real-Time Notifications:**
  WebSocket-based push alerts for portfolio events and price alerts.
* **Audit & History:**
  View your complete action and alert history.
* **AI-powered Research:**
  Latest news, research summaries, and natural-language Q\&A with a financial AI bot.
* **Authentication & Profiles:**
  JWT-based sign up/login, profile page, and secure token storage.
* **Import/Export:**
  Easily bulk-import/export your portfolio via CSV.

---

## 🛠️ Tech Stack

* **Frontend:**

  * [Next.js](https://nextjs.org/) (App Router, Client Components)
  * React + TypeScript
  * Tailwind CSS (utility-first design)
  * Chart.js + react-chartjs-2
  * Lucide React Icons

* **Backend:**

  * [FastAPI](https://fastapi.tiangolo.com/)
  * SQLite (for users, portfolio, watchlist, notifications, audit logs)
  * yFinance (Yahoo Finance API)
  * NewsAPI.org (financial news)
  * GROQ/OpenAI (LLM API for AI Q\&A)
  * JWT Auth

---

## 🗂️ Project Structure

```
/
├── backend/
│   ├── main.py            # FastAPI app
│   ├── requirements.txt   # Backend dependencies
│   └── ...                # (db files auto-generated)
├── frontend/
│   ├── app/               # Next.js pages and layouts
│   ├── components/        # Reusable React components
│   ├── public/            # favicon, icons, static assets
│   ├── tailwind.config.js # Tailwind CSS config
│   ├── package.json       # Frontend dependencies
│   └── ...                # Config files, etc.
├── README.md
└── .env.local             # Your local environment variables
```

---

## ⚡ Getting Started

### 1. **Clone the Repository**

```bash
git clone https://github.com/yourusername/zentrade.git
cd zentrade
```

---

### 2. **Backend Setup (FastAPI)**

#### **A. Install Python dependencies**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

#### **B. Environment Variables**

Create `.env.local` in `/backend` (or project root):

```env
SECRET_KEY=your_secret_key_here
NEWSAPI_KEY=your_newsapi_api_key
GROQ_API_KEY=your_groq_or_openai_key
```

#### **C. Run the FastAPI Server**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at [http://localhost:8000](http://localhost:8000).

---

### 3. **Frontend Setup (Next.js + Tailwind)**

```bash
cd frontend
npm install
```

#### **If not already done:**

Copy your `favicon.ico` to `/frontend/public`.

#### **Start the Frontend:**

```bash
npm run dev
```

Frontend will run at [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment Variables

You need these secrets in `.env.local` (see above):

* `SECRET_KEY` – for FastAPI JWT auth.
* `NEWSAPI_KEY` – from [newsapi.org](https://newsapi.org/).
* `GROQ_API_KEY` – get from [groq.com](https://console.groq.com/) (or use OpenAI).
* *(Optional)* You can also add other keys as your project expands.

---

## 🌐 API Endpoints (Backend)

| Route                 | Method | Description                       | Auth? |
| --------------------- | ------ | --------------------------------- | ----- |
| `/auth/register`      | POST   | Register user                     | No    |
| `/auth/login`         | POST   | Login user (returns JWT)          | No    |
| `/portfolio`          | GET    | Get user portfolio                | Yes   |
| `/portfolio`          | POST   | Add stock to portfolio            | Yes   |
| `/portfolio`          | DELETE | Remove stock from portfolio       | Yes   |
| `/portfolio/import`   | POST   | Bulk import via CSV               | Yes   |
| `/portfolio/export`   | GET    | Export portfolio as CSV           | Yes   |
| `/watchlist`          | GET    | Get user watchlist                | Yes   |
| `/watchlist`          | POST   | Add to watchlist                  | Yes   |
| `/watchlist`          | DELETE | Remove from watchlist             | Yes   |
| `/price/{symbol}`     | GET    | Get real-time price for symbol    | No    |
| `/chart/{symbol}`     | GET    | Get chart data for symbol         | No    |
| `/news/{symbol}`      | GET    | Fetch latest news for symbol      | No    |
| `/ask`                | POST   | Ask AI (LLM Q\&A)                 | No    |
| `/analytics/advanced` | POST   | Get alpha/beta/sharpe/sector data | Yes   |
| `/notifications`      | GET    | Get user notifications            | Yes   |
| `/ws/notifications`   | WS     | Live push notifications           | Yes   |
| `/audit`              | GET    | Get user's audit/event log        | Yes   |
| `/trending`           | GET    | Trending stocks (most popular)    | No    |
| `/profile`            | POST   | Update username                   | Yes   |

---

## 🧠 Key Functionality Details

* **Stock Search:**
  Search S\&P 500 stocks by name/symbol and select from presets.
* **Live Price Card:**
  Shows current price and daily change for selected stock.
* **Responsive Chart:**
  Interactive line chart (Chart.js) with selectable time ranges.
* **Portfolio Table:**
  Add/remove stocks, see real-time values, and download/upload CSV.
* **Advanced Analytics:**
  Backend calculates portfolio metrics and sector breakdown (pie chart).
* **Real-Time Alerts:**
  Uses FastAPI WebSocket for push notifications (price alerts, portfolio updates).
* **News Feed:**
  Shows latest relevant articles for the selected stock.
* **AI Q\&A:**
  Use GPT-style AI to answer natural language stock questions.
* **Trending Stocks:**
  Leaderboard of most commonly held stocks in all user portfolios.
* **Watchlist:**
  Track prices for custom list of stocks.
* **User Management:**
  JWT-auth, protected routes, update profile (username/email), and logout.
* **Audit Trail:**
  Every portfolio/watchlist event is logged and viewable.

---

## 🏗️ Deployment

* **Backend:**

  * Use [Uvicorn](https://www.uvicorn.org/) for FastAPI.
  * Optionally deploy to [Render](https://render.com/), [Fly.io](https://fly.io/), [Azure App Service](https://azure.microsoft.com/en-us/products/app-service/), or [Heroku](https://heroku.com/).
* **Frontend:**

  * Static Next.js export or deploy to [Vercel](https://vercel.com/), [Netlify](https://netlify.com/), or any Node.js-compatible host.
* **Environment Variables:**

  * Always set secrets using environment configuration on your host.
* **Database:**

  * SQLite is for prototyping. For production, consider Postgres/MySQL.

---

## ⚠️ Troubleshooting

* **CORS Issues?**

  * Ensure both frontend and backend use the correct `localhost` port (3000 and 8000 by default).
* **API Keys Not Working?**

  * Double-check `.env.local`, restart the backend after changes.
* **Blank Profile Page?**

  * Ensure valid JWT is present. Log out and log in again.
* **No Chart/News Data?**

  * Check for correct symbol. Some stocks may not have full historical/news data.

---

## ❓ FAQ

**Q:** Why does the chart/news not load for some stocks?
**A:** Not all stocks have complete Yahoo/NewsAPI data. Try S\&P 500 tickers.

**Q:** How secure is my data?
**A:** All user data is local to your SQLite DB; JWT tokens are required for all sensitive routes.

**Q:** Can I use this in production?
**A:** This is a reference project! For real users, migrate to a production DB, add HTTPS, and scale backend accordingly.

---

## 👨‍💻 Credits & License

Created by Meetkumar M. Gojiya.
Stock price data from [Yahoo Finance](https://finance.yahoo.com/), news via [NewsAPI.org](https://newsapi.org/), AI answers via [GROQ](https://groq.com/) / OpenAI.

---

**MIT License. Fork, remix, and have fun!**

---
