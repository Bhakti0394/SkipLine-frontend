# SkipLine — Pre-Order. Pick Up. Skip the Line.

> A scalable, full-stack food pre-ordering platform built for any high-volume food service operation — corporate canteens, college mess halls, hospital pantries, food courts, co-working spaces, and event venues. Customers order ahead and choose a pickup slot. Kitchen staff manage a live queue with real-time status transitions, inventory tracking, and analytics.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![SCSS](https://img.shields.io/badge/SCSS-Modules-CC6699?logo=sass&logoColor=white)](https://sass-lang.com)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Bug Fixes & Engineering Decisions](#bug-fixes--engineering-decisions)
- [Roadmap](#roadmap)
- [Related Repositories](#related-repositories)

---

## Overview

SkipLine solves a problem that exists in every high-footfall food service venue: the queue. At peak hours, customers wait 15–30 minutes — not because food takes long to prepare, but because demand arrives all at once with no coordination.

SkipLine fixes this at a systems level. Orders are placed ahead of time with a chosen pickup slot. The kitchen receives a live, prioritised queue. Customers get status updates the moment their order moves. The result is a predictable, smooth flow for both sides — no waiting, no guessing.

Two user roles:

- **Customer** — browse menu, place normal / express / scheduled orders, track status live, manage profile
- **Kitchen Staff** — manage the live order queue, update statuses, monitor capacity, track inventory

---

## Features

### Customer

**Authentication**
- JWT-based login and registration
- Session restored on page refresh without a loading flicker (auth race condition fixed — `setUser` runs before `setLoading(false)`)
- Role-based routing — CUSTOMER and KITCHEN roles route to separate dashboards

**Menu & Ordering**
- Live menu fetched from backend (21 dishes across 8 categories)
- Three order modes available from the same Browse screen:
  - **Normal** — pick any available slot for today
  - **Express** — kitchen starts cooking immediately; customer picks an arrival window (5 / 10 / 15 min), filtered by meal prep time so only achievable windows appear
  - **Scheduled** — pre-order for tomorrow; slots grouped by period (Breakfast / Lunch / Afternoon / Dinner)
- Today's and tomorrow's pickup slots fetched from backend in real time, with remaining capacity shown per slot
- Add-ons fetched from backend (Extra Cheese, Extra Spicy, Extra Butter, Onion Rings, Raita, Papad) — falls back to static list if endpoint unavailable
- Spice level selector (Mild / Medium / Spicy / Extra Hot) — hidden for desserts and beverages
- Special instructions free-text field
- Quantity selector (1–10 per item)
- Cart with live item count badge, per-item quantity controls, and remove actions
- Platform-wide stats (total orders delivered, total customers, dishes available) fetched from backend and shown on Browse hero

**Checkout**
- Cart review with per-item prep time and estimated time saved
- Payment methods: UPI (instant confirmation) and Cash (pay at pickup)
- Order reference auto-generated per order (`ORD-<name><ts>-<uuid>-EXPRESS/NORMAL/SCHEDULED`)
- UUID guard — items missing a valid backend UUID surface a clear error instead of sending a broken order
- Per-order and per-item parallel API calls with `Promise.allSettled` — partial failures reported without losing successful orders
- Pre-order discount applied at checkout (platform fee waived)

**Post-Order Management (10-minute edit window)**
- Swap Dish — replace any item with a different menu item fetched live from backend; price difference charged or refunded automatically
- Running Late — extend pickup time by +10 / +15 / +20 minutes; food moves to warming zone
- Cancel Order — full refund for UPI payments, with 5–7 business day timeline shown
- Edit window countdown visible with progress bar; all actions disabled after expiry

**Order Tracking**
- Real-time status updates via SSE (`EventSource`) — no polling during active connection
- Fallback polling every 15 seconds for orders not covered by the SSE stream
- Status stepper (Confirmed → Preparing → Ready) synced to backend `OrderStatus` enum exactly
- Cooking progress bar per order
- "Mark Collected" button when order reaches Ready status
- Pickup counter shown dynamically from order data (no hardcoded counter number)
- Per-order metrics: time saved, food waste reduced (0.15 kg per order), loyalty points earned

**Order History**
- Full history of completed orders fetched from backend
- All 21 dish images mapped correctly — expanded from a 5-dish map to the full set
- Reorder button per past order
- Sustainability stats: total time saved, total food waste reduced, total spent

**Profile**
- Stats sourced from backend metrics: total orders, time saved, loyalty points, streak
- Member tier computed from real order count — Bronze (0–9) / Silver (10–24) / Gold (25–49) / Platinum (50–99) / Legendary (100+)
- Achievements unlocked by real milestones (First Order, 10 Orders, Speed Demon at streak ≥ 3, Eco Warrior at 5 orders, Platinum at 25, 100 Orders)
- Editable profile fields (name, email, phone, pickup location) with localStorage persistence
- Dynamic streak label ("3 day streak" or "No active streak")

**Streak & Rewards System**
- Daily order streak tracked — server value always wins over localStorage on login
- Streak milestones at 3 / 7 / 14 / 21 / 30 days trigger achievement popups with confetti
- Rewards: badge at 3 days → free topping at 7 → priority queue at 14 → 10% off at 21 → VIP access at 30
- Benefits panel explaining each reward tier, collapsible
- Celebration modal with animated confetti on milestone unlock

**Notifications**
- SSE-powered real-time notification bell with unread count badge
- Toast popups for order events: Confirmed, Preparing, Ready for Pickup
- Sound feedback per notification type (Web Audio API — silent fallback if unsupported)
- Notification preferences: Order Updates, Ready Alerts, Promotional Offers, Weekly Summary, Sound on/off
- Per-preference gating fixed — Ready Alerts toggle only gates ready notifications, not all notifications
- Persistent notification history (up to 50) with mark-as-read and clear-all

**Settings**
- Smart Slot Suggestions, Location Services, Dark Mode toggles
- Payment Methods, Security, Language, Connected Devices navigation items (static badges removed — no longer shows hardcoded "2 cards" / "English" / "3 devices")
- Sign out via AuthContext — clears all localStorage keys and resets context to demo state

### Kitchen Staff

**Live Order Queue**
- Kanban board: `PENDING → COOKING → READY → COMPLETED`
- Flat queue list with per-order countdown timers
- Chef assignment per order with auto-assign support
- Order details modal with full item breakdown
- Completed orders log for current shift (last 50 shown)

**Kitchen Operations**
- Real-time capacity meter (active orders / total chef capacity)
- Queue alert shown on customer dashboard when 3+ orders are queued
- Bottleneck detection: flags when cooking orders exceed 1.5× their prep time budget
- Chef station view with workload per chef
- Timeline slots view showing occupancy across the full operating day

**Inventory**
- Live stock levels with low-stock and critical thresholds
- Restock actions from the dashboard
- Inventory automatically deducted when an order moves to COOKING (via recipe table)

**Analytics**
- Order volume, fulfilment rate, peak slot analysis
- Efficiency: percentage of orders completed before their pickup slot deadline
- Capacity utilisation: current load vs total chef capacity

**Kitchen Simulation (Dev)**
- Simulation controls for generating test orders
- `/simulate-advance` promotes pending orders to COOKING in priority order (express-first, then earliest slot, then FIFO)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite 5 |
| Styling | SCSS Modules (per-component) |
| UI Components | shadcn/ui (40+ components) |
| Animation | Framer Motion |
| State | React Context API (Auth, SkipLine, Notifications) |
| Real-time | SSE via `EventSource` with polling fallback |
| Auth | JWT in localStorage, restored via session check on load |
| Routing | React Router v6 with role-based protected routes |
| API Layer | Custom typed fetch wrapper (`kitchenApi.ts`) |
| Data Fetching | TanStack Query (QueryClient) |

---

## Project Structure

```
src/
│
├── App.tsx                            # Root router — CUSTOMER and KITCHEN role routing
│
├── context/
│   └── AuthContext.jsx                # JWT auth state — login, register, logout, session restore
│
├── routes/
│   └── ProtectedRoute.tsx            # Role guard — redirects unauthenticated users
│
├── pages/
│   ├── Auth.tsx                      # Login / registration page
│   ├── Index.tsx                     # Public landing page
│   │
│   ├── CustomerDashboard/
│   │   ├── Index.tsx                 # Home — KPIs, kitchen summary, streak, order flow
│   │   ├── BrowseMenu.tsx            # Full menu with Normal / Express / Schedule modes
│   │   ├── Checkout.tsx              # Cart review → payment → order placement
│   │   ├── OrderSuccess.tsx          # Post-order: swap dish, extend pickup, cancel, feedback
│   │   ├── MyOrders.tsx              # Live order tracking via SSE + fallback polling
│   │   ├── OrderHistory.tsx          # Completed order history from backend
│   │   ├── Profile.tsx               # Stats, tier, achievements — all from real metrics
│   │   ├── Favorites.tsx             # Saved meals with quick-order
│   │   └── Settings.tsx              # Notification prefs, account, sign out
│   │
│   └── KitchenDashboard/
│       └── Index.tsx                 # Full kitchen control panel
│
├── components/
│   ├── CustomerDashboard/
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx   # Shell — computes member tier, passes to Header
│   │   │
│   │   └── dashboard/
│   │       ├── Header.tsx            # Top bar — dynamic tier badge (not hardcoded "Premium")
│   │       ├── HeaderSearch.tsx      # Live menu search from backend
│   │       ├── KitchenGlance.tsx     # Top dish, busiest hour, avg prep time, bottleneck
│   │       ├── MealCard.tsx          # Dish card — lazy loading, fetchpriority
│   │       ├── OrderModal.tsx        # Slot picker + add-ons — both from backend
│   │       ├── OrderFlowMini.tsx     # Status stepper — matches backend OrderStatus enum
│   │       ├── NotificationBell.tsx  # SSE-powered bell with unread count
│   │       ├── NotificationPopup.tsx # Toast-style order event popups
│   │       ├── StreakCard.tsx        # Streak counter, rewards, milestone popups
│   │       ├── FeedbackCard.tsx      # Post-order per-meal rating
│   │       ├── CommentsModal.tsx     # Meal-level public comments
│   │       ├── AnimatedKPI.tsx       # Animated stat counters on dashboard home
│   │       ├── CartButton.tsx        # Floating cart with item count badge
│   │       ├── LiveClock.tsx         # Real-time clock
│   │       └── Navigation.tsx        # Sidebar / bottom nav
│   │
│   └── KitchenDashboard/
│       └── dashboard/
│           ├── KanbanBoard.tsx       # PENDING → COOKING → READY → COMPLETED columns
│           ├── OrderQueue.tsx        # Flat list view of active orders
│           ├── OrderCard.tsx         # Card with timer, chef assignment, item breakdown
│           ├── OrderTimer.tsx        # Per-order countdown
│           ├── OrderDetailsModal.tsx # Full order detail view
│           ├── CapacityMeter.tsx     # Real-time kitchen load bar
│           ├── InventoryPanel.tsx    # Stock levels and restock
│           ├── StaffController.tsx   # Staff workload and assignment
│           ├── AnalyticsPanel.tsx    # Metrics: volume, efficiency, peak slots
│           ├── CompletedOrders.tsx   # Shift completion log
│           ├── ChefStations.tsx      # Station-level chef assignments
│           ├── TimelineSlots.tsx     # Slot occupancy across the day
│           ├── SimulationControls.tsx# Dev-only order simulation tools
│           └── Header.tsx            # Kitchen top bar
│
├── customer-context/
│   ├── SkipLineContext.tsx           # Cart, orders, metrics, streak, SSE connections
│   └── NotificationContext.tsx      # Notification queue with sound and preference gating
│
├── kitchen-api/
│   └── kitchenApi.ts                # All API calls — typed fetch wrappers, SSE subscription
│
├── customer-types/
│   └── dashboard.ts                 # CartItem (menuItemId), slot DTOs, stats DTOs
│
├── customer-hooks/
│   ├── useFavorites.ts              # Add, remove, list favorites
│   └── useFeedback.ts               # Per-meal feedback using backend UUID
│
├── kitchen-hooks/
│   ├── useKitchenBoard.ts           # Kanban state and status transition handlers
│   ├── useInventory.ts              # Inventory fetch and restock
│   ├── useOrderTimer.ts             # Per-order timer logic
│   ├── useNotifications.ts          # Kitchen notification state
│   ├── useKeyboardShortcuts.ts      # Keyboard shortcuts for kitchen ops
│   ├── useSettings.ts               # Kitchen preferences
│   └── Capacityengine.ts            # Kitchen load calculation
│
├── kitchen-types/
│   ├── order.ts                     # Order, OrderItem, OrderStatus
│   ├── inventory.ts                 # InventoryItem, InventoryCategory
│   └── settings.ts                  # Kitchen settings shape
│
└── customer-assets/                 # 21 dish images (all mapped in SkipLineContext)
    ├── butter-chicken.jpg
    ├── butter-garlic-naan.jpg
    ├── chicken-korma.jpg
    ├── chole-bhature.jpg
    ├── chocolate-donuts.jpg
    ├── dal-makhani.jpg
    ├── gulab-jamun.jpg
    ├── hydrebadi-biryani.jpg
    ├── idli-sambhar.jpg
    ├── kadai-paneer.jpg
    ├── lucknowi-biryani.jpg
    ├── masala-dosa.jpg
    ├── mutton-rogan-josh.jpg
    ├── palak-paneer.jpg
    ├── paneer-tikka.jpg
    ├── pizza.jpg
    ├── poha.jpg
    ├── prawn-masala.jpg
    ├── rajasthani-thali.jpg
    ├── samosa.jpg
    └── vada-pav.jpg
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Backend running (see [skipline-backend](https://github.com/Bhakti0394/QLess-backend))

### Installation

```bash
git clone https://github.com/Bhakti0394/QLess-frontend.git
cd QLess-frontend

npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8080
```

---

## Architecture

### Authentication & Session Restore

```
App loads
  └── AuthContext reads localStorage synchronously
        ├── token + role + email found
        │     └── setUser({ email, fullName, role })
        │           └── setLoading(false)          ← user is set FIRST (race condition fix)
        │                 └── ProtectedRoute renders dashboard
        └── no token
              └── setLoading(false) → redirect to /auth
```

### Three Order Modes

```
BrowseMenu
  ├── Normal mode    → OrderModal fetches today's slots from /api/customer/slots
  │                    Slot picker shows remaining capacity per slot
  │                    Order tagged -NORMAL in orderRef
  │
  ├── Express mode   → No slot picker
  │                    Arrival window options filtered by meal.prepTime
  │                    (only windows ≥ prep time shown)
  │                    Kitchen starts cooking immediately on order receipt
  │                    Order tagged -EXPRESS in orderRef
  │
  └── Schedule mode  → OrderModal fetches tomorrow's slots from /api/customer/slots/tomorrow
                       Slots grouped by period: Breakfast / Lunch / Afternoon / Dinner
                       Order tagged -SCHEDULED in orderRef
```

### Real-time Order Updates

```
Customer places order
  └── SkipLineContext.addOrder() calls subscribeToOrderStatus(orderId)
        └── EventSource opens /api/customer/sse/orders/{id}/stream?token=<jwt>
              └── Backend pushes SSE event on each status transition
                    └── SkipLineContext.updateOrderStatusFromSse() updates order state
                          └── window.dispatchEvent('order-status-changed')
                                ├── MyOrders.tsx re-renders order card with new status
                                └── NotificationContext shows toast + plays sound
```

On SSE error, `SkipLineContext` automatically falls back to polling every 15 seconds for that order.

### SSE Deduplication

Each order has exactly one `EventSource` connection tracked in a `useRef` Map. Re-renders do not create new connections. Connections are closed when an order reaches `COMPLETED` or `CANCELLED`.

### Member Tier Calculation

Computed client-side from backend `metrics.totalOrders`:

| Orders | Tier |
|---|---|
| 0–9 | Bronze |
| 10–24 | Silver |
| 25–49 | Gold |
| 50–99 | Platinum |
| 100+ | Legendary |

---

## API Reference

All calls go through `src/kitchen-api/kitchenApi.ts`.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new customer |
| `POST` | `/api/auth/login` | Public | Login, returns JWT |
| `POST` | `/api/auth/logout` | Bearer | Invalidate session |

### Customer

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/customer/menu-items` | Public | Full live menu |
| `POST` | `/api/customer/orders` | Customer | Place order (Normal / Express / Scheduled) |
| `GET` | `/api/customer/orders` | Customer | Customer's order history |
| `GET` | `/api/customer/orders/:id` | Customer | Single order by ID |
| `GET` | `/api/customer/metrics` | Customer | Personal stats: orders, time saved, points |
| `GET` | `/api/customer/streak` | Customer | Current order streak count |
| `GET` | `/api/customer/kitchen-summary` | Customer | Top dish, busiest hour, avg prep, bottleneck |
| `GET` | `/api/customer/slots` | Customer | Available pickup slots for today |
| `GET` | `/api/customer/slots/tomorrow` | Customer | Available slots for tomorrow |
| `GET` | `/api/customer/addons` | Customer | Add-on options for order modal |
| `GET` | `/api/customer/stats` | Public | Platform counts: orders, customers, dishes |
| `GET` | `/api/customer/sse/orders/:id/stream` | Public (JWT via `?token=`) | SSE stream for order status |

### Kitchen

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/kitchen/board` | Kitchen | Kanban board: orders, metrics, staff, slots |
| `POST` | `/api/kitchen/orders` | Kitchen | Create order (simulation) |
| `PATCH` | `/api/kitchen/orders/:id/status` | Kitchen | Transition order status |
| `PATCH` | `/api/kitchen/orders/:id/assign-chef` | Kitchen | Assign chef |
| `PATCH` | `/api/kitchen/orders/:id/reserve-slot` | Kitchen | Reserve pickup slot |
| `POST` | `/api/kitchen/simulate-advance` | Kitchen | Promote pending orders to COOKING |
| `GET` | `/api/kitchen/metrics` | Kitchen | Kitchen analytics for date |
| `GET` | `/api/kitchen/menu-items` | Kitchen | Full menu list |
| `GET` | `/api/kitchen/server-time` | Kitchen | Server timestamp for clock sync |
| `GET` | `/api/kitchen/staff` | Kitchen | Staff list with workload |
| `POST` | `/api/kitchen/staff` | Kitchen | Add staff member |
| `PATCH` | `/api/kitchen/staff/:id/activate` | Kitchen | Activate chef |
| `PATCH` | `/api/kitchen/staff/:id/remove-from-shift` | Kitchen | Move chef to backup |
| `GET` | `/api/kitchen/staff/:id/validate-removal` | Kitchen | Check if safe to remove chef |
| `GET` | `/api/kitchen/inventory` | Kitchen | Inventory levels |
| `PATCH` | `/api/kitchen/inventory/:id/stock` | Kitchen | Set absolute stock level |
| `PATCH` | `/api/kitchen/inventory/:id/restock` | Kitchen | Add quantity to stock |

---

## Bug Fixes & Engineering Decisions

| Area | Problem | Fix |
|---|---|---|
| Auth race condition | `setLoading(false)` ran before `setUser` — caused a flash where `(loading=false, user=null)` was briefly true, triggering a redirect to `/auth` even with a valid token | Fixed order: `setUser` → then `setLoading(false)` |
| 403 on every dashboard load | Customer dashboard called `fetchBoard()` which hits `GET /api/kitchen/board` — a KITCHEN-role endpoint. Customer JWT doesn't have KITCHEN role → 403 on every page load | Replaced with `fetchCustomerKitchenSummary()` hitting `GET /api/customer/kitchen-summary` |
| Order creation broken | Checkout sent `meal.id` (a frontend string) as `menuItemId`. If the meal came from anywhere other than a fresh backend fetch, this string would not be a valid UUID → 404 on the backend | Fixed to use `item.menuItemId` (explicitly set to backend UUID at `addToCart` time). Added UUID format guard — surfaces a clear error if a non-UUID slips through instead of sending a malformed order |
| SSE events arriving twice | `SkipLineContext` created a new `EventSource` on every context re-render. Two connections meant every status update fired the handler twice → duplicate toasts, double state updates | Fixed with a `useRef` Map — one connection per order ID, cleaned up on terminal status |
| Notification gate logic broken | `readyAlerts: false` was blocking all notification types, not just ready alerts | Fixed: each preference gates only its own type. Ready Alerts only gates `order_ready`. Order Updates gates `order_confirmed`, `order_preparing`, `order_cooking` |
| Member tier always "Premium" | Tier was a hardcoded string constant in Header — every user always saw "Premium" | Computed from `metrics.totalOrders` in `DashboardLayout` and passed to `Header` as a prop |
| Slot picker was static | `OrderModal` had hardcoded time strings that never reflected real availability | Replaced with `fetchCustomerSlots()` and `fetchCustomerSlotsTomorrow()` — real slots with remaining capacity |
| Menu search was static | `HeaderSearch` used a 12-item hardcoded array | Replaced with `fetchCustomerMenuItems()` — live menu on every search open |
| Platform stats were fake | Browse hero showed hardcoded numbers (e.g. "12847 orders") | Replaced with `fetchCustomerPlatformStats()` — real counts from `GET /api/customer/stats` |
| Feedback mealId wrong | Post-order feedback submitted with the frontend meal name string as the ID → feedback could never be retrieved against a real order | Fixed to use `order.id` (backend UUID) as the `mealId` so feedback is stored and retrieved by the same key |
| Order history missing images | `MEAL_IMAGE_MAP` only had 5 entries — 16 dishes fell back to the Butter Chicken image | Expanded to all 21 dishes in `OrderHistory`, `SkipLineContext`, and `OrderSuccess` |
| OrderFlowMini had wrong steps | Included `'preparing'` step which does not exist in backend `OrderStatus` enum → step never matched any real status | Removed — stepper now shows only `confirmed → cooking → ready → completed` |
| Hardcoded pickup counter | "Counter #3" was hardcoded in `MyOrders` and `OrderSuccess` — every order at every venue showed the same wrong counter | Replaced with a dynamic `getPickupPointLabel()` function that reads from order data, falls back to "Pickup Counter" |
| Settings had fake badges | "2 cards", "English", "3 devices" were static strings that never matched reality | Badges removed — only shown when real data backs them up |
| Scheduled order slot dropped | `CreateOrderRequest` had no `pickupSlotId` field, so scheduled orders lost their slot at the API boundary | Added `pickupSlotId` to `CreateOrderRequest` and `PlaceOrderRequest` — slot is now passed end-to-end |

---

## Roadmap

- [ ] Multi-venue support (multiple counters / kitchens per venue)
- [ ] Admin dashboard (venue-level analytics and menu management)
- [ ] Web Push notifications (background alerts when browser is closed)
- [ ] QR code pickup verification at counter
- [ ] Loyalty points redemption at checkout
- [ ] Menu scheduling (items available only during defined time windows)
- [ ] Mobile app (React Native)
- [ ] Real add-on management from kitchen side (DB-backed add-on entity)
- [ ] Real payment gateway integration (currently UPI is simulated)

---

## Related Repositories

| Repository | Description |
|---|---|
| [skipline-backend](https://github.com/Bhakti0394/QLess-backend) | Spring Boot backend — auth, orders, inventory, SSE, slots |

---

*Built by Bhakti.*