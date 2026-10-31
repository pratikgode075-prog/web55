# FinSight — AI Personal Finance Management System

**College Project | Frontend-Only | Google Gemini AI Integration**

---

## Project Abstract

FinSight is a browser-based personal finance management system that demonstrates how Artificial Intelligence can help users understand their finances, manage expenses, create budgets, plan savings, and explore investment options. Built entirely with HTML5, CSS3, and Vanilla JavaScript, it integrates Google's Gemini AI API for intelligent financial analysis and conversational assistance. All data is stored locally in the browser using localStorage — no backend server or database is required.

---

## Problem Statement

Most people lack structured tools to track their income, expenses, and savings goals in one place. Financial literacy is low, especially for students and young professionals. This project demonstrates how AI can bridge this gap by providing personalized financial analysis, budgeting recommendations, and educational investment guidance — all accessible from a simple web browser.

---

## Objectives

1. Provide a complete income and expense tracking system.
2. Enable monthly budget planning with category-level control.
3. Support savings goal creation and progress tracking.
4. Generate AI-powered personalized financial analysis using Gemini.
5. Offer a financial roadmap generator with AI explanation.
6. Educate users on investment options (SIP, FD, RD, PPF, Gold).
7. Produce printable monthly financial reports.
8. Work entirely offline (no server) using browser localStorage.

---

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and semantics |
| CSS3 | Styling, 3D Neumorphism, responsive layout |
| Vanilla JavaScript | All logic, calculations, data management |
| Google Gemini API | AI financial analysis and chat |
| Chart.js (CDN) | Financial charts and visualizations |
| Browser localStorage | Data persistence |

---

## Main Features

- **Dashboard** — Financial overview with health score, charts, recent transactions, and savings goals
- **Income Management** — Add/edit/delete income entries with source categorization
- **Expense Tracker** — Track expenses with categories, search, and filters
- **Budget Planner** — Monthly budget with category-level tracking and alerts
- **Savings Goals** — Create and track multiple savings goals with progress bars
- **Financial Roadmap** — AI-assisted roadmap generation based on income and goals
- **Investment Calculator** — SIP calculator with educational content on investment options
- **AI Assistant** — Real conversational AI powered by Gemini for financial questions
- **AI Financial Analysis** — One-click complete analysis of your financial health
- **Monthly Reports** — Printable reports with charts and expense breakdowns
- **Settings** — API key management and data controls

---

## System Architecture

```
FinSight (Browser)
│
├── index.html         → Page structure, all sections, modals
├── style.css          → Design system, neumorphism, responsive layout  
├── script.js          → All application logic
│
├── Browser localStorage
│   ├── fs_income      → Income entries array
│   ├── fs_expenses    → Expense entries array
│   ├── fs_budgets     → Budget data by month
│   ├── fs_goals       → Savings goals array
│   └── fs_apiKey      → Gemini API key (user-provided)
│
├── Google Gemini API  → AI analysis, chat, roadmap explanations
│   └── fetch() calls to generativelanguage.googleapis.com
│
└── Chart.js (CDN)     → Bar charts, doughnut charts, SIP visualization
```

**No custom backend. No database server. No build tools required.**

---

## AI Integration Explanation

### How It Works

1. The user enters their Gemini API key in Settings (stored in localStorage only).
2. When AI features are triggered (chat, analysis, roadmap), JavaScript collects financial data from localStorage.
3. A structured prompt is built containing the user's financial context.
4. A `fetch()` POST request is sent to the Gemini API endpoint.
5. The real AI-generated response is displayed in the UI.

### What Gemini Analyzes

- Monthly income vs expenses
- Category-wise spending breakdown
- Budget utilization
- Savings rate and goals
- Investment options suitable for the user's situation

### System Prompt Behavior

The AI is instructed to:
- Use Indian Rupees (₹) at all times
- Explain concepts in simple language
- Distinguish estimates from guaranteed facts
- Never guarantee investment returns
- Acknowledge missing data rather than inventing values

---

## API Key Configuration

### Step 1: Get a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with a Google account
3. Click "Get API Key" → "Create API key"
4. Copy the key (starts with `AIza...`)

### Step 2: Add to FinSight
1. Open FinSight in your browser
2. Click **Settings** in the sidebar (or "More" on mobile)
3. Paste your API key in the **Gemini API Key** field
4. Click **Save API Key**

### Step 3: Test
- Navigate to **AI Assistant**
- Ask: "How can I save ₹50,000 in 6 months?"
- You should receive a real AI response

> **Security Note:** This is a college demo project. The API key is stored in your local browser only. It is sent directly from your browser to Google's API. Never share this project publicly with a real API key embedded. For production deployments, API keys must be managed server-side.

---

## How to Run (VS Code Live Server)

### Prerequisites
- [VS Code](https://code.visualstudio.com/) installed
- [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) installed

### Steps
1. Download or clone the project folder
2. Open the folder in VS Code: `File → Open Folder`
3. Right-click `index.html` in the Explorer panel
4. Select **"Open with Live Server"**
5. The app opens at `http://127.0.0.1:5500` (or similar)

**No npm, no build step, no server setup needed.**

Alternatively, just double-click `index.html` to open in a browser. Most features work without Live Server. The Gemini API requires an internet connection.

---

## Demo Workflow for Viva

1. **Open the app** — Sample demo data loads automatically, showing a populated dashboard.
2. **Dashboard** — Point out: health score, income vs expenses chart, spending by category, savings goals.
3. **Add Expense** — Click "+ Add Expense", add ₹500 for Food, show dashboard updates instantly.
4. **Budget** — Show the budget planner, explain how overspending triggers alerts.
5. **Savings Goal** — Show existing goals with progress bars, explain monthly calculation.
6. **AI Assistant** — Type "Create a monthly budget for me" and show real Gemini response.
7. **Analyze My Finances** — Click the button, show the structured AI analysis.
8. **Investment Calculator** — Enter ₹5000/month at 12% for 10 years, show SIP result.
9. **Reports** — Show the printable monthly report, demonstrate Print/PDF.
10. **Settings** — Show where the API key is configured and explain localStorage.
11. **Refresh page** — Show data persists because it's in localStorage.

---

## Limitations

- Data is browser-specific. Clearing browser data deletes all entries.
- No cloud sync or multi-device access.
- The API key is visible to anyone who can inspect the browser's localStorage. This is acceptable for a local demo but not for public deployment.
- AI analysis quality depends on the amount of data entered.
- SIP calculator provides estimates only — actual mutual fund returns vary.
- No tax calculation or professional financial advice.
- Gemini API has free-tier rate limits; heavy usage may trigger quota errors.

---

## Future Enhancements

- User authentication with cloud data sync
- Server-side API key proxy for secure production use
- Bank statement import (CSV/PDF)
- Recurring transaction automation
- Tax estimation and planning
- Multi-currency support
- Push notifications for budget alerts
- Export data as CSV or Excel
- Dark mode
- PWA (Progressive Web App) for offline mobile use

---

## File Structure

```
finsight/
├── index.html    → Complete application UI (all pages and modals)
├── style.css     → Design system, layout, components, responsive
├── script.js     → All JavaScript: state, calculations, charts, AI
└── README.md     → This file
```

---

*FinSight — Built for learning. Powered by AI. Runs in your browser.*
