# Original User Request

## Initial Request — 2026-06-26T21:45:00+03:00

Make Tharaa AI (ثراء) a premium, fully production-ready, local-first financial application with robust offline NLU classification, premium aesthetic UI design, and fully integrated backend database functions.

Working directory: c:/Users/AHMAD/Desktop/Karam
Integrity mode: benchmark

## Requirements

### R1. Premium Modern UI Design
- Complete visual makeover of the client layout: implement a high-fidelity, premium look using dark-mode gradients, glassmorphism backdrop-filters, custom glowing borders, and elegant typography (e.g. Outfit/Inter font).
- Optimize spacing, margins, paddings, and responsiveness so it looks like a professional, top-tier banking app.

### R2. High-Precision NLU Engine & Chatbot
- Tighten math calculation regex constraints to prevent letters/sentences (like "what time is it" or "كم الساعة") from matching arithmetic signatures.
- Out-of-scope queries must return a clean, clear message indicating it is out of scope, rather than a false-positive calculation or a mock action prompt.
- Retain full bilingual (Arabic/English) support and dynamic smart replies.

### R3. Seamless SQLite/Express Backend Integration
- Ensure all frontend widgets (Dashboard, Subscriptions, Savings Goals, Stock Portfolio, Transactions) are fully connected to live APIs reading and writing to the SQLite database (karam.db).
- Replace any remaining mockup frontend state with real backend persistence.

## Acceptance Criteria

### Chatbot Accuracy
- Asking "what time is it" or "كم الساعة" or "weather" returns an "Out of Scope" warning.
- Asking "calculate 1500 * 12" or "15% of 3000" returns the correct math calculation result.
- Asking "what is my balance" or "كم رصيدي" queries the live ledger database and displays the correct balance.

### UI Styling & Usability
- Frontend client has zero console errors or resources failures on load.
- UI is fully responsive and displays custom glowing scrollbars, cohesive dark card borders, and premium typography.
- Interactive buttons have clear hover states and micro-animations.

### Database Integrity & API
- Operations like adding a transaction, updating a subscription status, or purchasing stock are saved to the backend database.
- Backend verification tests (node verification_test.js) pass successfully.

## Follow-up — 2026-06-27T09:53:28Z

Super-train the Tharaa AI (ثراء) application by expanding the offline NLU engine to recognize 500+ distinct conversational and everyday language intents correctly (chit-chat, greetings, general knowledge, life questions) alongside the financial engine, building a personalized 50/30/20 budget recommendation adviser, securing all backend endpoints, implementing high-fidelity animated SVG charts/transitions, and adding a mock transaction batch auto-generator.

Working directory: c:/Users/AHMAD/Desktop/Karam
Integrity mode: development

## Requirements

### R1. Advanced On-Device NLU Engine (500+ Conversational Intents & Personalized Advice)
- Expand the NLU model to support and correctly classify 500+ distinct intents (Arabic and English) covering normal everyday conversational language (such as greetings, social chitchat, basic general knowledge questions, jokes, time/weather chatter) in addition to core financial features.
- **Dynamic 50/30/20 Budget Advisor**: When the user queries "how to budget" or "كيف اخطط ميزانيتي", the bot must query active transaction logs from the database, group actual spending into Needs, Wants, and Savings, compare it against the 50/30/20 rule, and return a localized textual summary showing custom advice.
- **Shariah Stock Compliance Checker**: Allow querying active stock compliance databases (e.g. Rajhi, Aramco, STC, SNB) to return detailed compliance breakdown metrics (debt ratio, impure income percentage).
- **Math & Out-of-Scope Guards**: Verify that calculations and out-of-scope phrases never overlap or trigger false positive actions.

### R2. High-Fidelity UI, Micro-Animations & Interactive SVG Charts
- **Interactive SVG Dashboard Charts**: Implement responsive charts (e.g. Asset Allocation Ring, Weekly Spending Bar Chart, Wealth Growth Line Chart) with hover tooltips, legend toggles, and CSS-animated stroke draw-ins.
- **Micro-Transitions**:
  - Add zoom/fade transitions from the LockScreen PIN completion to the Dashboard.
  - Implement smooth sliding transitions for side drawers, bottom sheet drawers, and main tab changes.
- **Lottie or CSS Micro-interactions**: Add reactive success checkmark animations, alert pulses, and list sorting transitions.

### R3. Batch Transaction Generator & SMS Presets Mocker
- Expand the SMS Mocker panel in the Transactions tab to include presets for major banks (AlRajhiBank, SNB-Ahli, STC-Pay, AlinmaBank, RiyadhBank).
- **Mock Batch Generator**: Add a button to populate the database with a custom batch of 50+ randomized historical transactions (e.g. grocery, salaries, restaurants) spread over the last 30 days to build a rich dashboard simulation.

### R4. Route Security, Input Sanitization & React Fail-Safes
- **Sanitised Routes**: Secure all SQLite endpoints against SQL injection and force strict types (e.g. numeric validations for amounts, alphanumeric filters for merchants).
- **Secure PIN Lockout Policies**: Implement an increasing lockout delay (30 seconds, 5 minutes, 1 hour) on successive failed PIN attempts, backed by secure hashed storage comparison.
- **Error Boundaries**: Wrap major visual components in React Error Boundaries to prevent a blank screen if database connection drops, rendering a friendly offline recovery view.

### R5. Complete Hackathon Verification & Native Sync
- Verify compile compatibility with "npm run build" and sync mobile build folders using "npx cap sync".
- Run comprehensive backend and frontend validations to ensure zero console warnings or failed resource requests.

## Acceptance Criteria

### NLU & Conversational Intelligence
- [ ] Bot recognizes 500+ distinct conversational and everyday language intents correctly.
- [ ] Training dataset contains 500+ distinct training intent targets inside "mlEngine.js".
- [ ] Chit-chat queries (e.g. greetings, jokes, time checks, general chatter) resolve to conversational replies instead of triggering database errors or false-positive calculations.
- [ ] Asking "how to budget" / "كيف اخطط ميزانيتي" returns a custom percentage split of the user's actual database spending against the 50/30/20 rule.
- [ ] Stock queries (e.g., "is Aramco compliant" / "هل ارامكو حلال") display debt ratios and shariah-compliant tags.

### UI, Animations & Mocker
- [ ] Lock screen vanishes with a smooth CSS transition to the main interface.
- [ ] SVG charts animate during data load and support interactive legend toggles.
- [ ] The "Generate 50 Transactions" button successfully injects historical mock records into the SQLite ledger.
- [ ] SMS import panel supports AlRajhi, SNB, STC Pay, Alinma, and Riyadh Bank presets.

### Backend Security & Fail-Safes
- [ ] Submitting negative, null, or string values to payment APIs returns a "400 Bad Request" code with validation feedback.
- [ ] PIN brute-force attempts trigger cumulative lockout penalties.
- [ ] React Error Boundaries catch simulated rendering failures and display an inline warning without crashing the app.

### Build & Verification
- [ ] Production build succeeds without errors.
- [ ] Capacitor android sync completes successfully.
- [ ] Core test verification script validates both SQLite database integrity and NLU classification boundaries.

## Follow-up — 2026-06-27T14:34:15Z

Implement a user profile signup page in Tharaa AI, configure a clean production database reset script, and prepare the mobile project settings for native iOS and Android synchronization.

Working directory: c:/Users/AHMAD/Desktop/Karam
Integrity mode: development

## Requirements

### R1. Local Profile Signup Page & DB Schema
- **Database Table**: Create a `profile` table in the SQLite database (`karam.db`) to store the user's name, preferred base currency (SAR or USD), and creation timestamp.
- **Bypass Logic**: On first-ever app launch, if no profile exists in the database, present a premium registration page prompting the user for their Name and Base Currency. Save these settings via a new backend API endpoint.
- **PIN Transition**: Once registered, immediately transition the user to the Set PIN screen. If a profile already exists, bypass the registration page and display the standard LockScreen directly.

### R2. Database Reset & Clean Slate Setup
- **Clean Slate Endpoint**: Create a `/api/admin/clean-slate` endpoint (and a matching script `scratch/clear_mock_data.js`) to wipe all user-specific transaction histories, stocks, savings targets, and subscriptions.
- **Configuration Persistence**: Ensure static system data (such as bank accounts templates and gamification badges) are preserved so the app starts as a clean slate for a new user registration.

### R3. Capacitor Android & iOS Sync
- **Vite compilation**: Compile production web assets using `npm run build`.
- **iOS Platform**: If the Capacitor iOS configuration folder is missing, initialize it via native Capacitor commands.
- **Synchronization**: Sync web assets to both platform folders using `npx cap sync`.

## Acceptance Criteria

### Profile Registration
- [ ] Profile table exists in SQLite database containing user name and currency.
- [ ] Registration page renders on clean launch with name and currency selections.
- [ ] Bypasses registration screen on subsequent launches if profile table is populated.

### Clean Slate Reset
- [ ] Reset endpoint / script wipes all transaction, stock, savings, and subscription records.
- [ ] Static system tables remain populated.

### Build & Mobile Sync
- [ ] `npm run build` executes without compilation warnings or errors.
- [ ] Capacitor iOS platform directory is initialized.
- [ ] `npx cap sync` successfully outputs asset synchronizations for both `android` and `ios` build targets.

## Follow-up — 2026-06-27T17:54:20+03:00

Expand the offline NLU classification engine of Tharaa AI (ثراء) to support millions of options and vocabulary variations covering conversational chit-chat, general knowledge, and financial guidance, utilizing optimized prefix trees for sub-millisecond execution.

Working directory: c:/Users/AHMAD/Desktop/Karam
Integrity mode: development

## Requirements

### R1. Structured Stemming and Synonym Vocabulary Expansion (Millions of Phrases)
- **Tokenization & Preprocessing**: Implement a structured stemming, synonym mapping, and tokenization layer inside `mlEngine.js`.
- **Vocabulary Coverage**: Define a compressed, structured dictionary mapping root stems, prefixes, suffixes, and synonym variations.
- **Intents Matrix**: Ensure the engine correctly resolves millions of possible phrase combinations to their exact target intents (e.g. greetings, Saudi/France capitals, King Salman, time checks, weather, financial advice, Shariah stock compliance, ledger statistics) in both Arabic and English.

### R2. Optimized Trie Parsing Engine
- **Search Tree Structure**: Implement a structured Trie (prefix tree) or optimized indexer to map tokens to intents.
- **Performance Constraints**: Ensure sub-millisecond classification response times and minimal memory footprints, preventing execution lag or mobile crashes.

### R3. Automated Stress Testing
- **Stress-Test Script**: Add a stress test suite inside `verification_test.js` that programmatically constructs and executes 5,000+ randomized conversational queries across various intent targets.
- **Assertions**: Verify that the NLU engine successfully classifies all stress-test queries with 100% accuracy and zero memory crashes.

## Acceptance Criteria

### NLU Vocabulary Expansion
- [ ] Preprocessing layer correctly maps word stems and synonyms in both Arabic and English.
- [ ] Classifier dynamically resolves queries combining varying prefixes, stems, and suffixes to correct intents.
- [ ] Support covers conversational chit-chat, general knowledge, and financial operations.

### Trie Performance
- [ ] Classification execution completes in sub-millisecond time.
- [ ] No significant RAM leaks or performance degradation.

### Stress Test Verification
- [ ] `verification_test.js` contains a test suite executing 5,000+ generated query combinations.
- [ ] `verification_test.js` contains a test suite executing 5,000+ generated query combinations.
- [ ] Test executes successfully and reports zero classification crashes.

## Follow-up — 2026-06-28T11:50:27Z

Audit the Tharaa AI application (React frontend and Express/SQLite backend) by launching it locally, manually testing all interactive features and components, auditing backend APIs for security and input safety, and outputting a comprehensive quality rating and issues report.

Working directory: c:\Users\AHMAD\Desktop\Karam
Integrity mode: benchmark

## Requirements

### R1. Local Environment Launch
Run the backend Express server and Vite frontend locally to verify baseline runtime stability and startup behavior.

### R2. Complete Interactive UI/UX Audit
Inspect and click through all widgets on the dashboard (Dashboard, Subscriptions, Savings Goals, Stock Portfolio, Transactions, and the LocalAI Chatbot). Test input fields, forms, and buttons, checking for:
- Console errors or React runtime crashes.
- Visual display bugs, broken layout alignments, or CSS styling flaws.
- Inconsistencies between frontend states and persistent database values.

### R3. Chatbot (LocalAI) & NLU Verification
Verify the accuracy of the NLU classifier and chatbot logic:
- Test math calculator parsing and arithmetic accuracy.
- Check out-of-scope query screening (e.g., handling inputs like "weather", "كم الساعة" correctly as out of scope).
- Verify bilingual support (English and Arabic) and appropriate responses.

### R4. Backend API & DB Security Audit
Audit all REST endpoints (Transactions, Subscriptions, Savings Goals, Stock Portfolio, and admin endpoints) for input validation, SQL injection prevention, and database constraint compliance (like profile currency constraints).

### R5. Comprehensive Rating & Issues Report
Generate a detailed report detailing bugs, severity, steps to reproduce, and design critiques, plus a final quality score out of 10.

## Acceptance Criteria

### Execution & Testing
- [ ] Application starts up successfully with backend database initialized.
- [ ] Every interactive widget is audited, and interactions are checked for errors/success messages.
- [ ] Chatbot is tested with at least 5 different types of inputs (valid calculations, balance requests, Arabic commands, and out-of-scope queries).
- [ ] Backend API endpoints are queried (e.g. via fetch or curl) to test input security boundaries.

### Deliverables
- [ ] A final markdown report named `issues_report.md` saved in the workspace root, containing:
  - Summary of the application audit.
  - Categorized issues (Visual, Logic, API, Security) with severity levels.
  - Overall rating (1-10) with detailed justification.
  - Recommendations for fixing identified issues.

## Follow-up — 2026-06-28T19:37:56+03:00

Implement code fixes and UI/UX optimizations in the Tharaa AI application according to the approved implementation plan to resolve the 7 issues identified in the audit.

Working directory: c:\Users\AHMAD\Desktop\Karam
Integrity mode: benchmark

## Requirements

### R1. Fix Transactions Tab & SMS Preset Simulator
- In [Transactions.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Transactions.jsx), declare the missing state variables (`showConsentModal`, `consentStep`, `detectedBanks`, `mockerBank`, `mockerDate`, `mockerAmount`, `mockerMerchant`, `mockerBalance`), state setters, and handlers (`handleStartScanConsent`, `handleConfirmConsent`).
- Implement the simulated bank SMS preset selector dropdown in the Copy-Paste tab of [Transactions.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Transactions.jsx).

### R2. Fix Stock Price Controlled Input
- In [StockPortfolio.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/StockPortfolio.jsx), modify the live pricing `onChange` event to update the local React state synchronously while debouncing the backend PUT `/api/stocks/:id` API call.

### R3. Fix Chatbot Subscription Expense Logic
- In [LocalAI.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/LocalAI.jsx), modify the `activeSubs` filter to only include transactions with debit types/amounts (`t.amount < 0` or `t.type === 'debit'`), avoiding counting income as subscription costs.

### R4. Implement Backend API Parameter Sanitization
- In [server.js](file:///c:/Users/AHMAD/Desktop/Karam/server.js), add validation checks for `bankName` and `accountNum` in `/api/open-banking/connect`.
- Validate and sanitize description and amount values in the `/api/transactions/sms-webhook` endpoint before inserting them into the database.

### R5. Correct Layout Columns Grid & Tooltip RTL Positioning
- In [index.css](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/index.css), fix the attribute selector typo from `[style*="gridTemplateColumns"]` to `[style*="grid-template-columns"]`.
- In [Dashboard.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Dashboard.jsx), add `dir="ltr"` to the relative chart wrapper divs and correct the hardcoded `text-left` alignment class to dynamically align text depending on layout direction.

### R6. Add Global Error Boundary Safeguard
- Define a premium fallback UI `ErrorBoundary` class component and wrap the main `AppContent` container inside the `App` component in [App.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/App.jsx).

## Acceptance Criteria

### Functionality & Verification
- [ ] Swapping to the Transactions tab does not cause any crashes or console errors.
- [ ] Typing in the Stock Portfolio current price input works fluidly without input lock or cursor jumping.
- [ ] Asking the Chatbot "how to reduce my expenses" ignores salary deposits.
- [ ] Malicious character strings are blocked on Open Banking and SMS Webhook API endpoints.
- [ ] Subscriptions and Savings Goals forms align in grid columns on desktop viewports.
- [ ] Changing language to Arabic shows correct Dashboard alignments and centered tooltip coordinates.
- [ ] Core database NLU stress tests and verification tests pass: `node seed_data.js && node verification_test.js`

## Follow-up — 2026-06-30T14:12:13+03:00

Implement code fixes, UI/UX optimizations, and new features in the Tharaa AI application according to the approved implementation plan to resolve the 7 issues identified in the audit and add user requested enhancements.

Working directory: c:\Users\AHMAD\Desktop\Karam
Integrity mode: benchmark

## Requirements

### R1. Fix Transactions Tab & SMS Preset Simulator
- In [Transactions.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Transactions.jsx), declare the missing state variables (`showConsentModal`, `consentStep`, `detectedBanks`, `mockerBank`, `mockerDate`, `mockerAmount`, `mockerMerchant`, `mockerBalance`), state setters, and handlers (`handleStartScanConsent`, `handleConfirmConsent`).
- Implement the simulated bank SMS preset selector dropdown in the Copy-Paste tab of [Transactions.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Transactions.jsx).
- **Add Search Bar**: Implement a styled search bar input field in the Transactions ledger card to filter transactions by description, category, or amount.

### R2. Fix Stock Price Controlled Input
- In [StockPortfolio.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/StockPortfolio.jsx), modify the live pricing `onChange` event to update the local React state synchronously while debouncing the backend PUT `/api/stocks/:id` API call.

### R3. Fix Chatbot Subscription Expense Logic
- In [LocalAI.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/LocalAI.jsx), modify the `activeSubs` filter to only include transactions with debit types/amounts (`t.amount < 0` or `t.type === 'debit'`), avoiding counting income as subscription costs.

### R4. Implement Backend API Parameter Sanitization
- In [server.js](file:///c:/Users/AHMAD/Desktop/Karam/server.js), add validation checks for `bankName` and `accountNum` in `/api/open-banking/connect`.
- Validate and sanitize description and amount values in the `/api/transactions/sms-webhook` endpoint before inserting them into the database.

### R5. Correct Layout Columns Grid & Tooltip RTL Positioning
- In [index.css](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/index.css), fix the attribute selector typo from `[style*="gridTemplateColumns"]` to `[style*="grid-template-columns"]`.
- In [Dashboard.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Dashboard.jsx), add `dir="ltr"` to the relative chart wrapper divs and correct the hardcoded `text-left` alignment class to dynamically align text depending on layout direction.

### R6. Add Global Error Boundary Safeguard
- Define a premium fallback UI `ErrorBoundary` class component and wrap the main `AppContent` container inside the `App` component in [App.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/App.jsx).

### R7. Fixing Page Borders & Layout
- In [index.css](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/index.css), define standard border utility classes (`border-b`, `border-t`, `border-l`, `border-r`, `border`) mapping to `1px solid var(--border-glass)` so that all page borders render correctly.

### R8. Home Page Pulsing Animation
- In [index.css](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/index.css) and [Dashboard.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/Dashboard.jsx), replace the rotating wealth pulse circle with a gentle breathing scale and glow animation (`pulse-gentle` keyframe).

### R9. Saudi Alinma Bank Theme
- In [index.css](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/index.css), define Alinma Bank Theme corporate color variables (`.inma-theme` with rich dark chocolate, sand, and Alinma gold accents).
- In [App.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/App.jsx), add theme selection support for `'inma'` and add a third toggle option in the settings drawer.

### R10. Smarter Chatbot NLP/NLU
- In [LocalAI.jsx](file:///c:/Users/AHMAD/Desktop/Karam/frontend/src/components/LocalAI.jsx), enable specific category spending calculations (e.g., "how much spent on food") in `checkStatsQuery`.
- Dynamically trigger merchant search matching any stored database entry, and expand chitchat knowledge on budgeting rules (50/30/20, compound interest, emergency funds).

## Acceptance Criteria

### Functionality & Verification
- [ ] Swapping to the Transactions tab does not cause any crashes or console errors.
- [ ] Typing in the Stock Portfolio current price input works fluidly without input lock or cursor jumping.
- [ ] Asking the Chatbot "how to reduce my expenses" ignores salary deposits.
- [ ] Malicious character strings are blocked on Open Banking and SMS Webhook API endpoints.
- [ ] Subscriptions and Savings Goals forms align in grid columns on desktop viewports.
- [ ] Changing language to Arabic shows correct Dashboard alignments and centered tooltip coordinates.
- [ ] Core database NLU stress tests and verification tests pass: `node seed_data.js && node verification_test.js`
- [ ] Search input in Transactions list successfully filters items by merchant, category, or amount.
- [ ] The wealth visualizer circle on the Dashboard pulses gently (does not rotate) and the text is upright.
- [ ] Switching theme to Alinma Theme applies the premium chocolate-gold layout and styles.
- [ ] Chatbot answers dynamic category spending questions (e.g. "how much did I spend on Utilities?") and general budgeting questions.

