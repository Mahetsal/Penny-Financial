# Project: Tharaa AI Fixes & Optimizations

## Architecture
Tharaa AI is a financial application composed of:
1. **Frontend**: React-based dashboard application (in `frontend/src`) with components for Dashboard, Subscriptions, Savings Goals, Stock Portfolio, Transactions, and a chatbot helper component (`LocalAI.jsx`).
2. **Backend**: Express server (`server.js`) serving REST APIs and managing a local SQLite database (`karam.db`) via custom database module (`database.js`).
3. **NLU Engine / Classifier**: Naive Bayes and rules-based logic in `mlEngine.js` for transaction categorization, SMS parsing, spending forecasting, anomaly detection, and stock signals.

## Code Layout
- `server.js`: Express server and REST routes.
- `database.js`: SQLite connection, initialization, and helper methods.
- `mlEngine.js`: Offline classification, forecasting, SMS parsing, and stock helper functions.
- `verification_test.js`: Server verification test suite.
- `frontend/src/`: React source code.
  - `frontend/src/App.jsx`: Main UI layout, containing the global container and rendering the main components.
  - `frontend/src/components/LocalAI.jsx`: Chatbot component with rules, regex, and expense reduction suggestions.
  - `frontend/src/components/Dashboard.jsx`: Dashboard visualizations and asset allocation.
  - `frontend/src/components/StockPortfolio.jsx`: Live pricing input and portfolios.
  - `frontend/src/components/Transactions.jsx`: Transactions history list, filters, and SMS mocker panel.
  - `frontend/src/index.css`: Tailwind CSS config and global layout adjustments.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Exploration & Code Audit | Analyze codebase files and verify requirements. Report current state of Transactions, StockPortfolio, LocalAI, server.js, index.css, Dashboard, and App.jsx. | None | PLANNED |
| 2 | M2: Transactions & Subscription Logic Fixes | Declare missing state/handlers in `Transactions.jsx`. Implement SMS presets dropdown. Modify `LocalAI.jsx` `activeSubs` filter to ignore income deposits. | M1 | PLANNED |
| 3 | M3: Stock Price Controlled Input | Refactor `StockPortfolio.jsx` current price input to update local React state synchronously and debounce PUT API calls. | M1 | PLANNED |
| 4 | M4: Backend Parameter Sanitization | Add validation checks in `server.js` for connect banking (`bankName`, `accountNum`) and SMS webhook (`description`, `amount`). | M1 | PLANNED |
| 5 | M5: Layout Grid & Tooltip RTL Positioning | Correct typo `[style*="gridTemplateColumns"]` in `index.css`. Add `dir="ltr"` to relative chart wrappers and correct alignment styles in `Dashboard.jsx`. | M1 | PLANNED |
| 6 | M6: Global Error Boundary | Create and integrate fallback UI `ErrorBoundary` class component wrapping `AppContent` in `App.jsx`. | M1 | PLANNED |
| 7 | M7: Acceptance & E2E Stress Testing | Run `node seed_data.js && node verification_test.js`. Verify Capacitor android/ios sync runs cleanly. | M2, M3, M4, M5, M6 | PLANNED |

## Interface Contracts
- **Connect Banking API**: GET/POST `/api/open-banking/connect` must validate `bankName` and `accountNum`.
- **SMS Webhook API**: POST `/api/transactions/sms-webhook` must validate and sanitize `description` and `amount`.
- **Stock Price PUT API**: PUT `/api/stocks/:id` is debounced from the client while local state updates instantly.
- **LocalAI Subscriptions**: Filters only negative/debit transactions for active subscriptions logic.
