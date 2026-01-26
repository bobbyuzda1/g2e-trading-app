# G2E Onboarding Design

## Design Principles

1. **Get to value fast** - Show portfolio within 3 steps
2. **Progressive disclosure** - Advanced features revealed over time
3. **Minimalist help** - Subtle indicators, not intrusive tutorials
4. **Mobile-first** - Touch-friendly, works on all devices
5. **Trust-building** - Security signals without overwhelming

---

## Onboarding Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ONBOARDING FLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CORE PATH (Required - 3 steps)                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                        │
│  │ Welcome  │ -> │ Connect  │ -> │ Portfolio│                        │
│  │ + Login  │    │ E*TRADE  │    │  View    │                        │
│  └──────────┘    └──────────┘    └──────────┘                        │
│       │                               │                              │
│       │                               ▼                              │
│       │              ┌────────────────────────────────┐              │
│       │              │  OPTIONAL PATH (Prompted later) │              │
│       │              ├────────────────────────────────┤              │
│       │              │  • Strategy Setup              │              │
│       │              │  • Create First Plan           │              │
│       │              │  • Enable Notifications        │              │
│       │              │  • Explore AI Chat             │              │
│       │              └────────────────────────────────┘              │
│       │                                                              │
│       ▼                                                              │
│  NEW USER?                                                           │
│  ┌──────────┐                                                        │
│  │ Create   │ (WordPress account creation)                           │
│  │ Account  │                                                        │
│  └──────────┘                                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Welcome Screen

**Goal:** Establish trust, explain value proposition, start authentication.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [G2E Logo]                           │
│                                                         │
│           AI-Powered Trading Assistant                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  "Get personalized trade insights aligned with    │  │
│  │   your strategy. Connect your E*TRADE account    │  │
│  │   to get started."                                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│         ┌─────────────────────────────┐                 │
│         │      Continue with          │                 │
│         │   [WordPress Logo] Login    │                 │
│         └─────────────────────────────┘                 │
│                                                         │
│         ┌─────────────────────────────┐                 │
│         │     Create Account          │                 │
│         └─────────────────────────────┘                 │
│                                                         │
│  ────────────────────────────────────────────────────   │
│                                                         │
│  🔒 Bank-level security  •  🔐 Your data stays yours    │
│                                                         │
│  [Learn about our security] ⓘ                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Trust Signals (Minimalist)

| Signal | Implementation |
|--------|----------------|
| Lock icon | Next to "Bank-level security" text |
| Shield icon | Next to "Your data stays yours" |
| Info link | Opens modal with security details (not a new page) |

### Help Indicator

Small `ⓘ` icon next to security claims. On tap/hover, shows a brief tooltip:

> "We use 256-bit encryption and never store your E*TRADE password. [Learn more]"

---

## Step 2: Connect E*TRADE

**Goal:** Link brokerage account via OAuth. Build confidence during external redirect.

### Pre-Redirect Screen

```
┌─────────────────────────────────────────────────────────┐
│  ← Back                                    Step 2 of 3  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Connect Your E*TRADE Account               │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │         [E*TRADE Logo]                            │  │
│  │                                                   │  │
│  │  You'll be redirected to E*TRADE to              │  │
│  │  securely authorize access.                       │  │
│  │                                                   │  │
│  │  G2E will be able to:                            │  │
│  │    ✓ View your portfolio                         │  │
│  │    ✓ See your transaction history                │  │
│  │    ✓ Submit trades (with your approval)          │  │
│  │                                                   │  │
│  │  G2E will NOT:                                   │  │
│  │    ✗ See your E*TRADE password                   │  │
│  │    ✗ Transfer funds                              │  │
│  │    ✗ Trade without your confirmation             │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│         ┌─────────────────────────────┐                 │
│         │   Connect to E*TRADE  →     │                 │
│         └─────────────────────────────┘                 │
│                                                         │
│  Why do I need to connect? ⓘ                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Help Indicator

`ⓘ` tooltip on "Why do I need to connect?":

> "Connecting allows G2E to analyze your portfolio and provide personalized insights. You control all trading decisions."

### E*TRADE Redirect

User is redirected to E*TRADE's login page. After authorization, they return with an OAuth verifier.

### Post-Redirect: Loading State

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│              [Spinning indicator]                       │
│                                                         │
│           Connecting to E*TRADE...                      │
│                                                         │
│           This usually takes a few seconds.             │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Error Handling

| Error | User Message | Action |
|-------|--------------|--------|
| User cancelled | "Connection cancelled. You can connect later from Settings." | Show portfolio (empty state) |
| OAuth failed | "Something went wrong. Let's try again." | Retry button |
| E*TRADE down | "E*TRADE is temporarily unavailable. Try again in a few minutes." | Retry button + Skip option |

---

## Step 3: Portfolio View (First Arrival)

**Goal:** Show immediate value. Introduce key features with subtle hints.

### Layout with First-Time Hints

```
┌─────────────────────────────────────────────────────────┐
│  [☰]  G2E                              [👤] Profile     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Welcome, Alex! 👋                                       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PORTFOLIO VALUE           TODAY'S CHANGE         │  │
│  │  $47,832.15                +$312.40 (+0.66%)      │  │
│  │                            ▲                      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  [Hint Card - dismissable]                 [✕]    │  │
│  │  ─────────────────────────────────────────────    │  │
│  │  💡 Tip: Set up your trading strategy to get      │  │
│  │     personalized AI insights.                     │  │
│  │                                                   │  │
│  │     [Set Up Strategy]  [Maybe Later]             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  YOUR HOLDINGS                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  AAPL        52 shares     $9,256    +1.2% ⓘ    │   │
│  │  Apple Inc.                                      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  NVDA        15 shares     $17,385   +2.1%      │   │
│  │  NVIDIA Corp                                     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  MSFT        28 shares     $11,732   +0.8%      │   │
│  │  Microsoft Corp                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [💬]  Ask AI about your portfolio              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### First-Time Help Indicators

| Element | Indicator | Behavior |
|---------|-----------|----------|
| First holding row | `ⓘ` icon | Tooltip: "Tap any holding for detailed analysis" |
| AI chat button | Subtle pulse animation (once) | Draws attention without being intrusive |
| Hint card | Dismissable with ✕ | Stores dismissal in user preferences |

### Help Indicator Implementation

```typescript
// components/HelpIndicator.tsx
interface HelpIndicatorProps {
  id: string;           // Unique ID for tracking dismissal
  content: string;      // Tooltip content
  position?: 'top' | 'bottom' | 'left' | 'right';
  showOnce?: boolean;   // Only show on first view
}

function HelpIndicator({ id, content, position = 'top', showOnce = true }: HelpIndicatorProps) {
  const [dismissed, setDismissed] = useLocalStorage(`help_${id}`, false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (showOnce && dismissed) return null;

  return (
    <span
      className="inline-flex items-center ml-1 cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => {
        setShowTooltip(!showTooltip);
        if (showOnce) setDismissed(true);
      }}
    >
      <InfoIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />

      {showTooltip && (
        <Tooltip position={position}>
          {content}
        </Tooltip>
      )}
    </span>
  );
}
```

---

## Optional Setup (Prompted After First Use)

After the user has viewed their portfolio, gently prompt for deeper setup.

### Trigger Conditions

| Trigger | Prompt |
|---------|--------|
| Second visit without strategy | Show strategy setup hint card |
| First AI chat | Suggest setting strategy for better responses |
| 7 days without plan | Prompt to create a trading plan |
| Never enabled notifications | Offer notification setup |

### Strategy Setup Prompt (Non-Blocking)

```
┌───────────────────────────────────────────────────────┐
│  [Expandable Card]                             [✕]    │
├───────────────────────────────────────────────────────┤
│  🎯 Get Better AI Insights                            │
│                                                       │
│  Set up your trading strategy so the AI can give     │
│  you personalized recommendations.                    │
│                                                       │
│  Choose how to set up:                                │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  [🔍] Discover from my trades                   │  │
│  │  AI analyzes your history to suggest a strategy │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │  [✏️] Define manually                           │  │
│  │  Answer a few questions about your approach     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  [Skip for now]                                       │
└───────────────────────────────────────────────────────┘
```

---

## Mobile Considerations

### Touch Targets

All interactive elements have minimum 44x44px touch targets.

```css
/* Minimum touch target sizing */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}

/* Buttons */
.btn {
  min-height: 48px;
  padding: 12px 24px;
}

/* List items */
.list-item {
  min-height: 56px;
  padding: 16px;
}
```

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, bottom nav |
| Tablet | 640-1024px | Two columns where appropriate |
| Desktop | > 1024px | Sidebar navigation, multi-column |

### Mobile-Specific Patterns

```
┌──────────────────────┐
│  Mobile Portfolio    │
├──────────────────────┤
│  $47,832.15         │
│  +$312.40 (+0.66%)  │
├──────────────────────┤
│  AAPL    $9,256  ▲  │
│  NVDA    $17,385 ▲  │
│  MSFT    $11,732 ▲  │
│  ...                 │
├──────────────────────┤
│ [Home][Chat][Trade] │  <- Bottom navigation
└──────────────────────┘
```

---

## Empty States

### No E*TRADE Connected

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│              [Illustration: Link icon]                │
│                                                       │
│           Connect Your Brokerage                      │
│                                                       │
│  Link your E*TRADE account to see your portfolio     │
│  and get AI-powered insights.                         │
│                                                       │
│         ┌─────────────────────────────┐               │
│         │   Connect E*TRADE           │               │
│         └─────────────────────────────┘               │
│                                                       │
│  Or explore with demo data ⓘ                         │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### No Holdings (New Account)

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│         [Illustration: Empty portfolio]               │
│                                                       │
│           Your Portfolio is Empty                     │
│                                                       │
│  You don't have any positions yet. Start building    │
│  your portfolio or ask the AI for ideas.             │
│                                                       │
│         ┌─────────────────────────────┐               │
│         │   💬 Ask AI for Ideas       │               │
│         └─────────────────────────────┘               │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Progress Indicators

### Account Setup Progress

Show completion status without being pushy.

```
┌───────────────────────────────────────────────────────┐
│  Setup Progress                              75%      │
│  ████████████████████░░░░░░░                         │
│                                                       │
│  ✓ Account created                                   │
│  ✓ E*TRADE connected                                 │
│  ○ Trading strategy (recommended)                    │
│  ○ Enable notifications                              │
│                                                       │
│  [Complete Setup]                    [Dismiss]       │
└───────────────────────────────────────────────────────┘
```

Location: Settings page or expandable from profile menu. Not shown on main dashboard to avoid clutter.

---

## Error Recovery

### Connection Lost During OAuth

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│         [Illustration: Disconnected]                  │
│                                                       │
│           Connection Interrupted                      │
│                                                       │
│  We lost connection while linking your E*TRADE       │
│  account. Don't worry, nothing was changed.          │
│                                                       │
│         ┌─────────────────────────────┐               │
│         │   Try Again                 │               │
│         └─────────────────────────────┘               │
│                                                       │
│  [Skip for now - I'll connect later]                 │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### E*TRADE Temporarily Unavailable

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│         [Illustration: Maintenance]                   │
│                                                       │
│           E*TRADE is Temporarily Down                 │
│                                                       │
│  We can't reach E*TRADE right now. This is usually  │
│  resolved within a few minutes.                       │
│                                                       │
│         ┌─────────────────────────────┐               │
│         │   Retry                     │               │
│         └─────────────────────────────┘               │
│                                                       │
│  [View cached portfolio]  [Notify me when back]      │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Accessibility

### Requirements

| Feature | Implementation |
|---------|----------------|
| Screen reader | All images have alt text, ARIA labels on icons |
| Keyboard nav | Full keyboard navigation, visible focus states |
| Color contrast | WCAG AA minimum (4.5:1 for text) |
| Reduced motion | Respect `prefers-reduced-motion` |
| Text scaling | Layouts work up to 200% text size |

### ARIA Labels for Help Indicators

```html
<button
  aria-label="Help: Learn more about portfolio value"
  aria-describedby="help-portfolio-tooltip"
  class="help-indicator"
>
  <span class="sr-only">Help</span>
  <InfoIcon aria-hidden="true" />
</button>

<div
  id="help-portfolio-tooltip"
  role="tooltip"
  class="tooltip hidden"
>
  This is the total market value of all your holdings.
</div>
```

---

## Analytics Events

Track onboarding completion to identify drop-off points.

| Event | Properties | Purpose |
|-------|------------|---------|
| `onboarding_started` | `source`, `device_type` | Funnel start |
| `onboarding_step_viewed` | `step_number`, `step_name` | Track progress |
| `onboarding_step_completed` | `step_number`, `duration_seconds` | Identify slow steps |
| `onboarding_oauth_started` | | Track OAuth initiation |
| `onboarding_oauth_completed` | `success`, `error_type` | OAuth success rate |
| `onboarding_completed` | `total_duration`, `steps_skipped` | Full completion |
| `onboarding_abandoned` | `last_step`, `reason` | Drop-off analysis |
| `help_indicator_viewed` | `indicator_id`, `page` | Help usage |
| `hint_dismissed` | `hint_id` | Feature awareness |

---

## Implementation Checklist

### Phase 1: Core Flow
- [ ] Welcome screen with WordPress auth
- [ ] E*TRADE OAuth integration
- [ ] Portfolio view (first arrival)
- [ ] Basic error states

### Phase 2: Help System
- [ ] Help indicator component
- [ ] Tooltip system
- [ ] First-time hint cards
- [ ] Dismissal persistence

### Phase 3: Progressive Disclosure
- [ ] Strategy setup prompt (non-blocking)
- [ ] Plan creation prompt
- [ ] Notification prompt
- [ ] Setup progress indicator (Settings)

### Phase 4: Polish
- [ ] Empty states
- [ ] Error recovery screens
- [ ] Loading states
- [ ] Accessibility audit
- [ ] Analytics integration

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-24 | Initial onboarding design |
