# Tharaa AI (ثراء) Application Audit Report

## 1. Executive Summary
Tharaa AI is an offline-first intelligent financial management application composed of a React frontend and an Express/SQLite backend. It features a local NLU engine for categorizing transactions and answering user queries, a secure PIN lockout mechanism, and interactive financial dashboard widgets.

During our comprehensive audit (comprising environment launching, interactive UI/UX testing, chatbot/NLU verification, and API/DB security analysis), we found that the core database security (full SQL parameterization) and the token-based Trie NLU engine are highly robust and performant. However, multiple critical-to-medium bugs on the frontend and minor sanitization gaps on the backend severely degrade the overall user experience and reliability. Notably, navigating to the Transactions tab triggers a complete React application crash, editing stock prices is frozen, and recurring income is incorrectly classified as subscription costs.

---

## 2. Overall Rating
**Score: 6.5 / 10**

### Justification:
* **The Good (+3.5)**: The local NLU engine (`nluEngine.js`) is highly optimized using a token prefix tree (Trie) allowing sub-millisecond query classification (~7 microseconds) and solid bilingual fallback. The SQLite integration uses fully parameterized queries preventing SQL Injection. The `LockScreen.jsx` employs a secure progressive brute-force lockout policy.
* **The Bad (-3.5)**: Navigating to the Transactions tab causes a fatal runtime `ReferenceError` because several required state variables and handlers are referenced but never declared. The Stock Price input is frozen due to a debouncing logic error. The desktop layout for Subscriptions and Savings Goals stacks vertically because of missing grid layout classes. The chatbot subscription advice classifies recurring salary/income as expense subscriptions, inflating calculations. No global React Error Boundaries are set up, leading to full-screen blanking on any runtime error.

---

## 3. Categorized Issues

### 3.1. Logic Issues (High/Critical Severity)

#### Issue 1: Fatal React Crash on Transactions Tab
* **Severity**: Critical (Breaks core user feature)
* **Symptom**: Switching to the Transactions tab immediately crashes the application with a `ReferenceError` ("showConsentModal is not defined").
* **Root Cause**: In `frontend/src/components/Transactions.jsx`, several state variables (`showConsentModal`, `consentStep`, `detectedBanks`, `mockerBank`, `mockerDate`, `mockerAmount`, `mockerMerchant`, `mockerBalance`), state setters (`setShowConsentModal`, `setConsentStep`, `setMockerBank`), and event handlers (`handleStartScanConsent`, `handleConfirmConsent`) are referenced in the JSX but never declared in the component.
* **Steps to Reproduce**:
  1. Launch the application and enter the PIN code on the lock screen.
  2. Click on the "Transactions" tab in the navigation menu.
  3. The page crashes and renders a blank screen.

#### Issue 2: Frozen Current Price Input in Stock Portfolio
* **Severity**: High (Renders feature unusable)
* **Symptom**: Attempting to edit a stock's price inside the Stock Portfolio tab is frozen; the input box does not accept keyboard inputs or is extremely laggy.
* **Root Cause**: In `frontend/src/components/StockPortfolio.jsx` (lines 429-430), the current price input field is bound to `s.current_price` from the state. The `onChange` handler calls `handleUpdatePrice`, which executes a debounced (500ms) API call and database refetch rather than updating the local React state synchronously. React immediately forces the input value back to the unmodified `s.current_price` on subsequent frames.
* **Steps to Reproduce**:
  1. Navigate to the "Stock Portfolio" tab.
  2. Click the edit button for a stock.
  3. Try typing a new current price in the input field. The text is immediately reverted or locked.

#### Issue 3: Chatbot Subscription Calculation counts Income as Expenses
* **Severity**: High (Calculates incorrect financial advice)
* **Symptom**: The Chatbot's advice tells the user they are spending excessive amounts on monthly subscriptions (e.g. $9,756/month) when their actual subscriptions are a fraction of that.
* **Root Cause**: In `frontend/src/components/LocalAI.jsx` (lines 663-665), `activeSubs` is filtered using:
  `const activeSubs = (transactions || []).filter(t => t.is_recurring === 1 || t.category === 'Utilities');`
  This logic does not check transaction types or signs, causing recurring salary/income direct deposits (which have `is_recurring: 1` and positive amounts) to be added to subscription expenses.
* **Steps to Reproduce**:
  1. Seed a transaction that is recurring and has a positive amount (e.g. `Company Payroll Direct Deposit` of $2,500).
  2. Ask the chatbot "how to reduce my expenses".
  3. Observe that the bot advises deactivating subscriptions to save money based on a total that includes your salary deposits.

---

### 3.2. Security & API Issues (Medium Severity)

#### Issue 4: Input Validation & Sanitization Gaps in Backend API
* **Severity**: Medium (Accepts and persists unvalidated payloads)
* **Symptom**: Backend API endpoints accept and store arbitrary strings containing SQL syntax, script tags, or special characters.
* **Root Cause**: 
  * `POST /api/open-banking/connect` in `server.js` processes `bankName` and `accountNum` from the request body without applying the `isValidMerchant` or alphanumeric filters before saving to the `bank_accounts` database table.
  * `POST /api/transactions/sms-webhook` stores values parsed by `mlEngine.parseSMSNotification` directly into the database without checking if they match `isValidMerchant` or `isValidNumber` formats.
  * *Note*: Direct SQL injection execution is prevented due to full parameterization (`db.run(sql, params)`), but the system is vulnerable to HTML/XSS injection or data corruption.
* **Steps to Reproduce**:
  1. Send a POST request to `/api/open-banking/connect` with payload:
     `{ "bankName": "Al Rajhi Bank; DROP TABLE bank_accounts; --", "accountNum": "SA12345" }`
  2. The server responds with `200 OK` and saves the malicious string in the database.

---

### 3.3. Visual & Layout Issues (Low/Medium Severity)

#### Issue 5: Broken Desktop Columns in Subscriptions & Savings Goals
* **Severity**: Medium (Visual/Layout break)
* **Symptom**: In both the Subscriptions and Savings Goals views on desktop, the left input form and the right listing card stack vertically, wasting screen real estate.
* **Root Cause**: In `frontend/src/components/Subscriptions.jsx` (line 111) and `frontend/src/components/SavingsGoals.jsx` (line 148), containers use Tailwind's `grid-cols-3` and a custom style structure (`gridTemplateColumns: '1fr 2fr'`) but miss the `grid` class or `display: 'grid'` style.
* **Steps to Reproduce**:
  1. Navigate to the "Subscriptions" or "Savings Goals" tab on a desktop viewport.
  2. Observe that the layout does not split into 1/3 and 2/3 columns but stacks vertically.

#### Issue 6: Hardcoded Alignments and Text Coordinates in RTL Mode
* **Severity**: Low
* **Symptom**: Visual text overlaps or alignment misfits on Arabic mode.
* **Root Cause**: Dashboard.jsx contains hardcoded `text-left` classes and hardcoded absolute positioning coordinates on chart tooltips which fail when the page layout changes to `dir="rtl"`.
* **Steps to Reproduce**:
  1. Change application language to Arabic.
  2. Inspect the Dashboard charts and textual statistics. Some components maintain left alignment instead of right, and tooltip hover values appear shifted.

---

### 3.4. Architecture & Safeguards (Low/Medium Severity)

#### Issue 7: Absence of React Error Boundaries
* **Severity**: Medium
* **Symptom**: If any React component encounters a rendering or lifecycle exception, the entire screen goes blank.
* **Root Cause**: There are no React Error Boundaries configured in `App.jsx` or root components.
* **Steps to Reproduce**: Trigger any runtime exception (e.g. click the Transactions tab) and observe that the screen blanks completely rather than displaying a fallback offline or error UI.

---

## 4. Recommendations for Fixing Identified Issues

### 1. Fix Transactions Tab Crash
Declare the missing state variables, setters, and handlers at the top of `Transactions.jsx`:
```javascript
const [showConsentModal, setShowConsentModal] = React.useState(false);
const [consentStep, setConsentStep] = React.useState('idle');
const [detectedBanks, setDetectedBanks] = React.useState([]);
const [mockerBank, setMockerBank] = React.useState('AlRajhi');
const [mockerDate, setMockerDate] = React.useState(new Date().toISOString().split('T')[0]);
const [mockerAmount, setMockerAmount] = React.useState('');
const [mockerMerchant, setMockerMerchant] = React.useState('');
const [mockerBalance, setMockerBalance] = React.useState('');

const handleStartScanConsent = () => {
  setConsentStep('requesting');
  setShowConsentModal(true);
};

const handleConfirmConsent = (banks) => {
  setConsentStep('success');
  setDetectedBanks(banks);
  setTimeout(() => setShowConsentModal(false), 1500);
};
```

### 2. Fix Stock Price Controlled Input Freeze
Update `StockPortfolio.jsx` to maintain a local temporary input state for editing prices so keystrokes register synchronously, updating the database debounced:
```javascript
const [editPriceVal, setEditPriceVal] = React.useState('');
// In edit click:
setEditPriceVal(s.current_price);
// In JSX input:
value={editPriceVal}
onChange={(e) => {
  setEditPriceVal(e.target.value);
  handleUpdatePrice(s.id, e.target.value);
}}
```

### 3. Fix Chatbot Subscription Advice Calculation
In `LocalAI.jsx` lines 663-665, filter out credit/income transactions:
```javascript
const activeSubs = (transactions || []).filter(t => 
  (t.is_recurring === 1 || t.category === 'Utilities') && 
  (t.amount < 0 || t.type === 'debit')
);
```

### 4. Implement Route Input Sanitization in Backend
Add validation checks in `server.js` for the Open Banking and SMS Webhook endpoints:
```javascript
// Inside POST /api/open-banking/connect
if (!isValidMerchant(bankName) || !/^[a-zA-Z0-9\-]+$/.test(accountNum)) {
  return res.status(400).json({ error: 'Invalid bankName or accountNum characters' });
}

// Inside POST /api/transactions/sms-webhook
if (parsed.description && !isValidMerchant(parsed.description)) {
  parsed.description = 'SMS Transaction';
}
if (parsed.amount && !isValidNumber(parsed.amount)) {
  parsed.amount = 0;
}
```

### 5. Fix Columns Grid Layout
Add the `grid` class or `display: 'grid'` inline styles in `Subscriptions.jsx` and `SavingsGoals.jsx`:
```html
<div className="grid grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr' }}>
```

### 6. Introduce React Error Boundary
Create a reusable Error Boundary component and wrap the tabs or the whole container in `App.jsx` to prevent blank screens:
```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("ErrorBoundary caught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) return <div className="p-6 text-center text-red-500">Something went wrong. Please reload the app.</div>;
    return this.props.children;
  }
}
```
