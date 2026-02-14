# CLI-Comp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix multiple frontend bugs, add Research page, rework Strategies page, fix dark mode, add profile editing, fix mobile nav.

**Architecture:** All changes are frontend-only (React/TypeScript). No backend changes needed — the backend APIs already support everything, but the frontend API client has incorrect endpoint paths causing several features to silently fail.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Tremor, Heroicons, React Router v6, Axios

---

## Root Cause Analysis

### Chat Not Working
- Frontend `chatApi.sendMessage()` hits `POST /chat/conversations/{id}/messages` — **this endpoint doesn't exist**
- Backend expects `POST /chat/send` with body `{message, conversation_id}`
- Frontend `chatApi.getMessages()` hits `GET /chat/conversations/{id}/messages` — **doesn't exist**
- Backend returns messages embedded in `GET /chat/conversations/{id}` (conversation detail)
- Also: chat requires an active conversation but doesn't auto-create one, so input stays disabled

### Strategies Not Working
- Frontend `strategyApi.getStrategies()` hits `GET /strategy` (singular) — **wrong path**
- Backend templates are at `GET /strategies/templates`
- Frontend `strategyApi.analyzeSymbol()` hits `GET /strategy/analyze/{symbol}` — **wrong path and method**
- Backend is `POST /strategies/analyze` with body `{strategy_id}`

### Portfolio "No Broker Connected"
- Portfolio.tsx line 60: `if (!summary || Number(summary.total_value) === 0)` shows "No Brokers Connected" even when brokers ARE connected but sandbox has $0 value

### Mobile Hamburger Menu
- Header.tsx: The `Bars3Icon` button has no `onClick` handler — it's just a dead button

### Dark Mode Issues
- ThemeContext defaults to `'light'`, should be `'dark'`
- Multiple components have hardcoded light-only colors (gray-100, gray-900, etc.) without dark mode alternatives
- Tremor `Card`, `Text`, `Metric` components don't auto-adapt to dark mode

---

## Task 1: Fix API Client (Chat + Strategies)

**Files:**
- Modify: `frontend/src/lib/api.ts`

Fix the chat API to match backend endpoints:
```typescript
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  createConversation: (title?: string) =>
    api.post('/chat/conversations', { title }),
  getMessages: (conversationId: string) =>
    api.get(`/chat/conversations/${conversationId}`),
  sendMessage: (message: string, conversationId?: string) =>
    api.post('/chat/send', { message, conversation_id: conversationId }),
};
```

Fix strategy API to match backend endpoints:
```typescript
export const strategyApi = {
  getTemplates: () => api.get('/strategies/templates'),
  getStrategies: () => api.get('/strategies'),
  analyzeSymbol: (symbol: string, strategy?: string) =>
    api.get(`/strategy/analyze/${symbol}`, { params: { strategy } }),
};
```

Add user update API:
```typescript
export const userApi = {
  updateProfile: (data: { full_name?: string; email?: string }) =>
    api.put('/users/me', data),
};
```

---

## Task 2: Fix Chat Page

**Files:**
- Modify: `frontend/src/pages/Chat.tsx`
- Modify: `frontend/src/components/ChatInput.tsx`
- Modify: `frontend/src/components/ChatMessage.tsx`
- Modify: `frontend/src/components/ConversationList.tsx`

Key changes:
- Update `sendMessage()` to use new API signature: `chatApi.sendMessage(content, activeConversation)`
- Handle the new response shape: `response.data.message` (user msg) and `response.data.response` (assistant msg)
- Update `loadMessages()` to extract messages from conversation detail response: `response.data.messages`
- Auto-create a conversation when user sends first message without one
- Add dark mode styles to all chat components

---

## Task 3: Fix Portfolio Page

**Files:**
- Modify: `frontend/src/pages/Portfolio.tsx`

Change the empty state check from value-based to connection-based:
- Fetch broker connections alongside portfolio data
- Show "No Brokers Connected" only when there are genuinely no active connections
- When brokers are connected but value is $0, show the normal portfolio view with $0 values
- Add dark mode styles

---

## Task 4: Fix Strategies Page + New Research Page

**Files:**
- Modify: `frontend/src/pages/Strategies.tsx` — Remove stock search, show templates
- Create: `frontend/src/pages/Research.tsx` — Stock search with metrics + "Start AI Chat"
- Modify: `frontend/src/App.tsx` — Add /research route
- Modify: `frontend/src/components/Sidebar.tsx` — Update navigation
- Modify: `frontend/src/components/StrategyCard.tsx` — Dark mode

Strategies page:
- Call `strategyApi.getTemplates()` instead of `getStrategies()`
- Remove the symbol search form
- Show strategy template cards with name, description, risk level, time horizon

Research page:
- Symbol search bar at top
- On search, call `portfolioApi.getQuotes(symbol)` for quote data
- Display: current price, change/%, volume, bid/ask, high/low, open, prev close
- "Start AI Chat" button navigates to `/chat?symbol={SYMBOL}` which auto-starts a conversation

---

## Task 5: Fix Mobile Hamburger Menu

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/layouts/DashboardLayout.tsx`

Add mobile sidebar drawer:
- Add `isMobileMenuOpen` state to DashboardLayout, pass down via props or context
- Header hamburger button toggles the state
- Sidebar renders a slide-out overlay drawer on mobile when open
- Clicking outside or on a nav link closes the drawer

---

## Task 6: Fix Settings Page (Profile + Danger Zone)

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`

- Remove "Danger Zone" title and "These actions are irreversible" text
- Keep the Sign Out button but in a simpler card without the scary styling
- Make profile fields editable: Name input + Email input with save button
- Show subtle note under email: "This is also your login email"
- Wire save to `PUT /users/me` via new `userApi.updateProfile()`
- Update AuthContext user state after successful save

---

## Task 7: Dark Mode Fixes

**Files:**
- Modify: `frontend/src/contexts/ThemeContext.tsx` — Default to 'dark'
- Modify: Multiple components for dark mode styling

Changes:
- ThemeContext: Change default from `'light'` to `'dark'`
- Audit and fix all hardcoded light-only colors across components
- Key components needing dark mode fixes:
  - ChatMessage: `bg-gray-100 text-gray-900` for assistant messages
  - ChatInput: `border-gray-300`, `disabled:bg-gray-100`
  - ConversationList: `bg-primary-50`, `hover:bg-gray-50`, `text-gray-700`
  - Portfolio/Dashboard cards: Tremor Card backgrounds
  - Settings page: form inputs, labels
  - Strategies page: card backgrounds, text colors
  - Research page: build with dark mode from start
- Use pattern: `theme === 'dark' ? 'dark-class' : 'light-class'` consistent with existing codebase
- Sidebar connected brokers count: currently hardcoded "0 accounts" — should be dynamic

---

## Task 8: Update Sidebar Broker Count

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

The sidebar bottom section hardcodes "0 accounts". Should fetch actual broker connection count and display it.

---

## Deployment Note

Per CLAUDE.md: Push to feature branch `cli-comp`, create PR. When merged to `main`:
- Frontend auto-deploys via GitHub Actions to Firebase
- Backend auto-deploys via Render (no backend changes in this PR though)
