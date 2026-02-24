# Pavitram — React Native (Expo) + Supabase Migration Guide

> Step-by-step instructions for converting the Pavitram wireframe web app into a production React Native mobile app using Expo and Supabase.

---

## Table of Contents

0. [Folder Structure & Screenshots](#0-folder-structure--screenshots)
1. [Tech Stack](#1-tech-stack)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1 — Expo Project Setup](#3-phase-1--expo-project-setup)
4. [Phase 2 — Supabase Setup](#4-phase-2--supabase-setup)
5. [Phase 3 — Supabase Integration in App](#5-phase-3--supabase-integration-in-app)
6. [Phase 4 — Authentication](#6-phase-4--authentication)
7. [Phase 5 — Screens (one by one)](#7-phase-5--screens-one-by-one)
8. [Phase 6 — Role-Based Access & Business Logic](#8-phase-6--role-based-access--business-logic)
9. [Phase 7 — Polish & Production Build](#9-phase-7--polish--production-build)
10. [Supabase SQL Scripts](#10-supabase-sql-scripts)
11. [Claude Code Prompts](#11-claude-code-prompts)
12. [Reference — Current Web App Structure](#12-reference--current-web-app-structure)

---

## 0. Folder Structure & Screenshots

### Project location — sibling folders (NOT nested)

The mobile app is a completely separate codebase. Create it **alongside** the web app, not inside it:

```
_Shaan App/
├── source-code/
│   ├── pavitram-web-app/        ← existing wireframe (keep as-is for reference)
│   └── pavitram-mobile/         ← NEW Expo project goes here
└── screenshots/                 ← page screenshots for Claude Code prompts
    ├── 01-login.png
    ├── 02-project-list.png
    ├── 03-vendor-list.png
    ├── 04-vendor-statement-expanded.png
    ├── 05-vendor-statement-compact.png
    ├── 06-pending-approval.png
    ├── 07-pending-approval-compact.png
    ├── 08-bill-add.png
    ├── 09-bill-edit-readonly.png
    ├── 10-payment-add.png
    ├── 11-payment-edit.png
    └── 12-settings.png
```

> **Why sibling?** They have completely different toolchains (Vite vs Expo), separate `node_modules`, and separate git repos. Nesting would cause `node_modules` conflicts and git confusion.

### Taking screenshots (do this before starting the mobile build)

1. Run the web app: `cd pavitram-web-app && npm run dev`
2. Open Chrome → DevTools → toggle device toolbar (Ctrl+Shift+M) → pick iPhone 14 (390px)
3. Log in as **admin** (to see all features)
4. Capture each screen listed above
5. For statement/pending pages, capture **both** expanded and compact views
6. For bill edit, capture both the "add new" form and a "read-only" view (approved bill as regular user)
7. Save to `_Shaan App/screenshots/` folder

These screenshots will be attached to Claude Code prompts when building each screen — Claude Code can read images and match the layout precisely.

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native with **Expo SDK 52+** (Managed workflow) |
| Language | TypeScript |
| Navigation | **Expo Router** (file-based routing) |
| Styling | **NativeWind v4** (TailwindCSS for React Native) |
| State | React Context + hooks (same pattern as web app) |
| Backend | **Supabase** (PostgreSQL + Auth + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase (future: bill photo uploads) |
| Build | **EAS Build** (Expo Application Services) |

---

## 2. Prerequisites

Install these before starting:

```bash
# Node.js 18+ (LTS recommended)
node --version

# Expo CLI (comes with npx, no global install needed)
npx expo --version

# EAS CLI (for building APK/IPA)
npm install -g eas-cli

# Supabase CLI (for local development & migrations)
brew install supabase/tap/supabase
# OR: npm install -g supabase

# Verify
eas --version
supabase --version
```

Create accounts:
- **Expo**: https://expo.dev (free)
- **Supabase**: https://supabase.com (free tier — 2 projects, 500 MB DB)

---

## 3. Phase 1 — Expo Project Setup

### Step 1.1 — Create the Expo project

Create as a **sibling** to the web app (not inside it):

```bash
cd "/Users/selvarajan/Documents/_ST/_Projects/_Shaan App/source-code"
npx create-expo-app@latest pavitram-mobile --template tabs
cd pavitram-mobile
```

After creation, your folder layout will be:
```
source-code/
├── pavitram-web-app/    ← existing (reference only, don't modify)
└── pavitram-mobile/     ← you are here
```

### Step 1.2 — Install core dependencies

```bash
# Navigation (Expo Router is pre-installed with tabs template)
npx expo install expo-router expo-linking expo-constants

# NativeWind (TailwindCSS for React Native)
npx expo install nativewind tailwindcss@^3.4 react-native-reanimated

# Supabase
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage

# UI essentials
npx expo install expo-secure-store expo-status-bar
npx expo install react-native-safe-area-context react-native-screens

# Date picker
npx expo install @react-native-community/datetimepicker

# Icons (Expo includes @expo/vector-icons by default)
```

### Step 1.3 — Configure NativeWind

Create `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff2ee',
          100: '#ffe0d5',
          200: '#ffbfaa',
          300: '#ff9470',
          400: '#ff6035',
          500: '#ff4500',  // OrangeRed base
          600: '#e03b00',
          700: '#bb2f00',
          800: '#992800',
          900: '#7a2000',
        },
      },
    },
  },
  plugins: [],
};
```

Create `global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Update `babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

Add to `metro.config.js`:
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

### Step 1.4 — Project folder structure

```
pavitram-mobile/
├── app/                          # Expo Router (file-based routes)
│   ├── _layout.tsx               # Root layout (providers, auth guard)
│   ├── index.tsx                 # Redirect → login or projects
│   ├── login.tsx                 # Login screen
│   ├── (auth)/                   # Protected group layout
│   │   ├── _layout.tsx           # Auth check wrapper
│   │   ├── projects/
│   │   │   └── index.tsx         # Project list
│   │   ├── projects/
│   │   │   └── [projectId]/
│   │   │       ├── vendors/
│   │   │       │   └── index.tsx             # Vendor list
│   │   │       └── vendors/
│   │   │           └── [vendorId]/
│   │   │               ├── statement.tsx     # Vendor statement
│   │   │               ├── pending.tsx       # Pending approval
│   │   │               ├── bills/
│   │   │               │   └── [billId].tsx  # Bill add/edit
│   │   │               └── payments/
│   │   │                   └── [paymentId].tsx # Payment add/edit
│   │   └── settings.tsx          # Settings screen
├── components/                   # Shared components
│   ├── AppHeader.tsx
│   ├── BillCard.tsx
│   ├── PaymentCard.tsx
│   └── CompactRow.tsx
├── context/
│   ├── AuthContext.tsx
│   └── SettingsContext.tsx
├── lib/
│   ├── supabase.ts               # Supabase client init
│   └── helpers.ts                # Formatters, calculators
├── types/
│   └── index.ts                  # TypeScript interfaces
├── constants/
│   └── Colors.ts                 # Color constants
├── global.css                    # TailwindCSS entry
├── tailwind.config.js
├── metro.config.js
├── babel.config.js
├── app.json
└── package.json
```

---

## 4. Phase 2 — Supabase Setup

### Step 2.1 — Create Supabase project

1. Go to https://supabase.com → Dashboard → **New Project**
2. Name: `pavitram`
3. Database password: (save this securely)
4. Region: Choose nearest (e.g., Mumbai `ap-south-1`)
5. Wait for project to provision (~2 minutes)
6. Note down:
   - **Project URL**: `https://xxxx.supabase.co`
   - **Anon Key**: `eyJhbG...` (from Settings → API)

### Step 2.2 — Run database schema SQL

Go to **SQL Editor** in Supabase Dashboard and run the scripts in [Section 10](#10-supabase-sql-scripts) in order.

### Step 2.3 — Configure Supabase Auth

1. Go to **Authentication → Providers**
2. Ensure **Email** provider is enabled
3. Disable "Confirm email" for dev (Authentication → Settings → toggle off "Enable email confirmations")
4. Go to **Authentication → Users** and create the 3 users:

| Email | Password | Note |
|-------|----------|------|
| admin@pavitram.app | admin123 | Will be assigned admin role |
| ravi@pavitram.app | ravi123 | Regular user |
| meena@pavitram.app | meena123 | Regular user |

> After creating each user in Auth, run the seed SQL (Section 10.3) to populate the `users` table with profile data linking auth.users to your app users.

---

## 5. Phase 3 — Supabase Integration in App

### Step 3.1 — Create Supabase client

File: `lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://YOUR_PROJECT_URL.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // Important for React Native
  },
});
```

### Step 3.2 — Environment variables

Create `.env` (add to `.gitignore`):
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_URL.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

Update `lib/supabase.ts` to use:
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

---

## 6. Phase 4 — Authentication

### Auth flow

```
App Launch → Check session (supabase.auth.getSession())
  ├── Has session → Fetch user profile → Navigate to /projects
  └── No session → Navigate to /login

Login → supabase.auth.signInWithPassword({ email, password })
  ├── Success → Fetch user profile from `users` table → Store in AuthContext
  └── Failure → Show error

Logout → supabase.auth.signOut() → Clear context → Navigate to /login
```

### AuthContext pattern

```typescript
// context/AuthContext.tsx
import { supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

// On login success, fetch the user profile:
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', authUser.id)
  .single();
```

---

## 7. Phase 5 — Screens (one by one)

Build each screen sequentially. Below is the order, mapping web page → native screen.

### Screen 1: Login

| Web | Native |
|-----|--------|
| `src/pages/LoginPage.tsx` | `app/login.tsx` |

**Components**: TextInput, TouchableOpacity, ActivityIndicator
**Key changes**:
- `<input>` → `<TextInput>`
- `<button>` → `<TouchableOpacity>` or `<Pressable>`
- HTML form → manual state + submit handler
- Use `router.replace('/projects')` instead of `navigate`
- Demo credential buttons same logic

---

### Screen 2: Project List

| Web | Native |
|-----|--------|
| `src/pages/ProjectListPage.tsx` | `app/(auth)/projects/index.tsx` |

**Components**: FlatList, TouchableOpacity
**Key changes**:
- `<div>` list → `<FlatList>` with `renderItem`
- Click handler → `router.push(\`/projects/${projectId}/vendors\`)`
- Currency formatting same (`toLocaleString('en-IN')`)
- Summary banner → sticky header or top card

---

### Screen 3: Vendor List

| Web | Native |
|-----|--------|
| `src/pages/VendorListPage.tsx` | `app/(auth)/projects/[projectId]/vendors/index.tsx` |

**Components**: FlatList, summary card
**Key changes**:
- Vendor cards with Paid/Outstanding/Pending
- Action buttons (Statement / Pending) → icon buttons with `router.push()`

---

### Screen 4: Vendor Statement

| Web | Native |
|-----|--------|
| `src/pages/VendorStatementPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/statement.tsx` |

**Components**: FlatList, SegmentedControl, BillCard, PaymentCard
**Key changes**:
- Filter tabs (All/Bills/Payments) → custom segmented control or `react-native-segmented-control`
- Sort toggle → TouchableOpacity with icon
- Compact/expanded toggle → same pattern
- BillCard / PaymentCard as separate components

---

### Screen 5: Vendor Pending Approval

| Web | Native |
|-----|--------|
| `src/pages/VendorPendingApprovalPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/pending.tsx` |

**Components**: FlatList, sticky bottom bar
**Key changes**:
- Bottom total bar → absolute positioned View at bottom
- "Add Bill" button in header

---

### Screen 6: Bill Add/Edit

| Web | Native |
|-----|--------|
| `src/pages/BillEditPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/bills/[billId].tsx` |

**Components**: ScrollView, TextInput, Picker/dropdown, DateTimePicker
**Key changes**:
- `<select>` → `@react-native-picker/picker` or custom modal dropdown
- `<input type="date">` → `@react-native-community/datetimepicker`
- `<textarea>` → `<TextInput multiline>`
- Category/subcategory cascading dropdowns → same logic
- Bottom action buttons (Cancel / Submit / Approve / Payment Processed)

---

### Screen 7: Payment Add/Edit

| Web | Native |
|-----|--------|
| `src/pages/PaymentEditPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/payments/[paymentId].tsx` |

**Components**: ScrollView, TextInput, Picker, DateTimePicker
**Key changes**: Same patterns as Bill Edit but simpler (fewer fields)

---

### Screen 8: Settings

| Web | Native |
|-----|--------|
| `src/pages/SettingsPage.tsx` | `app/(auth)/settings.tsx` |

**Components**: Slider or segmented control
**Key changes**:
- Font scale → store in AsyncStorage
- Apply via React context that wraps text styles

---

## 8. Phase 6 — Role-Based Access & Business Logic

### Role-based UI rules (same as web app)

```typescript
// Utility hook
function useIsAdmin(): boolean {
  const { currentUser } = useAuth();
  return currentUser?.role === 'admin';
}

// Usage in components
const isAdmin = useIsAdmin();

// Conditionally show buttons
{isAdmin && <TouchableOpacity>...</TouchableOpacity>}
```

### Business logic

Bills and payments are **independent tables**. Payments are not linked to specific bills — they are recorded against a vendor in a project.

```typescript
// Vendor summary calculation
const paid = payments
  .filter(p => p.vendor_id === vendorId)
  .reduce((sum, p) => sum + p.amount, 0);

const approvedBills = bills
  .filter(b => b.status === 'approved' && b.vendor_id === vendorId)
  .reduce((sum, b) => sum + (b.amount - b.discount), 0);

const outstanding = approvedBills - paid;

const pendingApproval = bills
  .filter(b => ['submitted', 'payment_done', 'payment_completed'].includes(b.status) && b.vendor_id === vendorId)
  .reduce((sum, b) => sum + (b.amount - b.discount), 0);
```

### Supabase queries

```typescript
// Fetch projects (respects RLS — users only see assigned projects)
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .order('project_name');

// Fetch vendors for a project
const { data: vendors } = await supabase
  .from('project_vendors')
  .select('vendor_id, vendors(id, vendor_name)')
  .eq('project_id', projectId);

// Fetch bills for a project + vendor
const { data: bills } = await supabase
  .from('bills')
  .select('*')
  .eq('project_id', projectId)
  .eq('vendor_id', vendorId)
  .order('date', { ascending: false });

// Fetch payments for a project + vendor
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .eq('project_id', projectId)
  .eq('vendor_id', vendorId)
  .order('date', { ascending: false });

// Create a bill
const { data, error } = await supabase
  .from('bills')
  .insert({
    project_id: projectId,
    vendor_id: vendorId,
    bill_number: billNumber,
    date: selectedDate,
    amount: billAmount,
    discount: discount,
    category: category,
    subcategory: subcategory,
    gst: gstPercent,
    description: description,
    status: 'submitted',
    created_by: currentUser.id,
    modified_by: currentUser.id,
  })
  .select()
  .single();

// Update bill status (approve)
const { error } = await supabase
  .from('bills')
  .update({ status: 'approved', modified_by: currentUser.id, modified_date: new Date().toISOString() })
  .eq('id', billId);

// Fetch categories (for bill form dropdowns)
// Each row has: { category: "Materials", subcategories: "Cement,M.Sand,..." }
// Split subcategories string in the app: row.subcategories.split(',')
const { data: categories } = await supabase
  .from('purchase_categories')
  .select('*')
  .order('category');

// Fetch payment methods (bank accounts for payment form dropdown)
const { data: paymentMethods } = await supabase
  .from('payment_methods')
  .select('*')
  .order('name');

// Create a payment
const { data, error } = await supabase
  .from('payments')
  .insert({
    project_id: projectId,
    vendor_id: vendorId,
    date: selectedDate,
    amount: paymentAmount,
    payment_method_id: selectedPaymentMethodId,
    description: description,
    created_by: currentUser.id,
    modified_by: currentUser.id,
  })
  .select()
  .single();

// Delete a bill
const { error } = await supabase
  .from('bills')
  .delete()
  .eq('id', billId);

// Delete a payment
const { error } = await supabase
  .from('payments')
  .delete()
  .eq('id', paymentId);
```

---

## 9. Phase 7 — Polish & Production Build

### Step 7.1 — App icon & splash screen

Place assets in `assets/` folder and configure in `app.json`:
```json
{
  "expo": {
    "name": "Pavitram",
    "slug": "pavitram",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#ff4500"
    }
  }
}
```

### Step 7.2 — Build for Android (APK)

```bash
# Configure EAS
eas build:configure

# Build APK (for testing)
eas build --platform android --profile preview

# Build AAB (for Play Store)
eas build --platform android --profile production
```

### Step 7.3 — Build for iOS

```bash
# Requires Apple Developer account ($99/year)
eas build --platform ios --profile production
```

### Step 7.4 — OTA Updates

```bash
# Push JS-only updates without rebuilding
eas update --branch production --message "Bug fix"
```

---

## 10. Supabase SQL Scripts

### 10.1 — Enable extensions & create tables

```sql
-- ============================================
-- PAVITRAM DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (linked to Supabase Auth)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  "group" TEXT,
  company_name TEXT,
  company_address TEXT,
  company_gst TEXT,
  order_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. USER_PROJECTS (many-to-many)
-- ============================================
CREATE TABLE user_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(user_id, project_id)
);

-- ============================================
-- 4. VENDORS TABLE
-- ============================================
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. PROJECT_VENDORS (many-to-many)
-- ============================================
CREATE TABLE project_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  UNIQUE(project_id, vendor_id)
);

-- ============================================
-- 6. PURCHASE_CATEGORIES (reference table)
-- One row per category, subcategories as comma-separated string
-- ============================================
CREATE TABLE purchase_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL UNIQUE,
  subcategories TEXT NOT NULL  -- comma-separated values
);

-- ============================================
-- 7. PAYMENT_METHODS (bank accounts)
-- ============================================
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. BILLS TABLE
-- ============================================
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  bill_number TEXT,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT CHECK (category IN (
    'Machineries', 'Materials', 'Labours', 'EB', 'Borewell', 'Plan Approval'
  )),
  subcategory TEXT,
  gst INTEGER DEFAULT 0 CHECK (gst IN (0, 5, 18)),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'payment_processed')),
  created_by UUID REFERENCES users(id),
  created_date TIMESTAMPTZ DEFAULT now(),
  modified_by UUID REFERENCES users(id),
  modified_date TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. PAYMENTS TABLE (independent of bills)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_date TIMESTAMPTZ DEFAULT now(),
  modified_by UUID REFERENCES users(id),
  modified_date TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. INDEXES for performance
-- ============================================
CREATE INDEX idx_bills_project ON bills(project_id);
CREATE INDEX idx_bills_vendor ON bills(vendor_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_date ON bills(date);
CREATE INDEX idx_payments_project ON payments(project_id);
CREATE INDEX idx_payments_vendor ON payments(vendor_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_method ON payments(payment_method_id);
CREATE INDEX idx_user_projects_user ON user_projects(user_id);
CREATE INDEX idx_user_projects_project ON user_projects(project_id);
CREATE INDEX idx_project_vendors_project ON project_vendors(project_id);
CREATE INDEX idx_project_vendors_vendor ON project_vendors(vendor_id);
```

### 10.2 — Row Level Security (RLS) policies

```sql
-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- Helper function: Get current user's role
-- ----------------------------------------
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Get current user's ID
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------
-- USERS: Users can read their own profile, admins can read all
-- ----------------------------------------
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth_id = auth.uid() OR get_user_role() = 'admin');

-- ----------------------------------------
-- PROJECTS: Admin sees all, users see assigned only
-- ----------------------------------------
CREATE POLICY "Admin can view all projects"
  ON projects FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can view assigned projects"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM user_projects
      WHERE user_id = get_user_id()
    )
  );

-- ----------------------------------------
-- USER_PROJECTS: Viewable by admins and the assigned user
-- ----------------------------------------
CREATE POLICY "View user_projects"
  ON user_projects FOR SELECT
  USING (
    get_user_role() = 'admin' OR user_id = get_user_id()
  );

-- ----------------------------------------
-- VENDORS: All authenticated users can view vendors
-- ----------------------------------------
CREATE POLICY "Authenticated users can view vendors"
  ON vendors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ----------------------------------------
-- PROJECT_VENDORS: Viewable by authenticated users
-- ----------------------------------------
CREATE POLICY "Authenticated users can view project_vendors"
  ON project_vendors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ----------------------------------------
-- PURCHASE_CATEGORIES: Read-only for all authenticated users
-- ----------------------------------------
CREATE POLICY "Authenticated users can view categories"
  ON purchase_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ----------------------------------------
-- PAYMENT_METHODS: Read-only for all authenticated users
-- ----------------------------------------
CREATE POLICY "Authenticated users can view payment methods"
  ON payment_methods FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ----------------------------------------
-- BILLS: Policies
-- ----------------------------------------

-- SELECT: Users see bills for their assigned projects, admins see all
CREATE POLICY "View bills"
  ON bills FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id = get_user_id()
    )
  );

-- INSERT: All authenticated users can create bills
CREATE POLICY "Users can create bills"
  ON bills FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Admin can update any bill; users can only update their own submitted bills
CREATE POLICY "Admin can update all bills"
  ON bills FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can update own submitted bills"
  ON bills FOR UPDATE
  USING (
    get_user_role() = 'user'
    AND status = 'submitted'
    AND created_by = get_user_id()
  );

-- DELETE: Admin only
CREATE POLICY "Admin can delete bills"
  ON bills FOR DELETE
  USING (get_user_role() = 'admin');

-- ----------------------------------------
-- PAYMENTS: Policies (admin only for write)
-- ----------------------------------------

-- SELECT: Users see payments for their assigned projects, admins see all
CREATE POLICY "View payments"
  ON payments FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR project_id IN (
      SELECT project_id FROM user_projects
      WHERE user_id = get_user_id()
    )
  );

-- INSERT: Admin only
CREATE POLICY "Admin can create payments"
  ON payments FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

-- UPDATE: Admin only
CREATE POLICY "Admin can update payments"
  ON payments FOR UPDATE
  USING (get_user_role() = 'admin');

-- DELETE: Admin only
CREATE POLICY "Admin can delete payments"
  ON payments FOR DELETE
  USING (get_user_role() = 'admin');
```

### 10.3 — Seed data

```sql
-- ============================================
-- SEED DATA
-- Run AFTER creating auth users in Supabase dashboard
-- Replace the auth_id values with actual UUIDs from auth.users
-- ============================================

-- ----------------------------------------
-- Step 1: Find your auth user IDs
-- Run this first and note the IDs:
-- ----------------------------------------
-- SELECT id, email FROM auth.users;

-- ----------------------------------------
-- Step 2: Insert user profiles
-- Replace 'AUTH_ID_xxx' with actual auth.users UUIDs
-- ----------------------------------------
INSERT INTO users (auth_id, name, username, role) VALUES
  ('218a997f-2f1b-4447-b0a3-3668e7dbe249', 'Admin', 'admin', 'admin'),
  ('0aceaa50-1be2-45ae-813c-6ceb677e5966', 'Ravi Kumar', 'ravi', 'user'),
  ('9049108a-6e8a-4e45-9d5d-0dc615e60c69', 'Meena S', 'meena', 'user');

-- ----------------------------------------
-- Step 3: Insert projects
-- ----------------------------------------
INSERT INTO projects (id, project_name, status, "group", company_name, company_address, company_gst, order_number) VALUES
  (uuid_generate_v4(), 'NVT 9 Acres', 'active', 'Dexor',
    'SAMEERA FOUNDATIONS PVT LTD',
    'No. 44, Mecohouse, Anna Salai, Chennai - 600002',
    '33AMXXXXXXXP1ZS', 1),
  (uuid_generate_v4(), 'Singadivakkam Ph1', 'active', 'Dexor',
    'SAMEERA FOUNDATIONS PVT LTD',
    'No. 44, Mecohouse, Anna Salai, Chennai - 600002',
    NULL, 3),
  (uuid_generate_v4(), 'Vannivedu 12.5 Acres', 'active', 'Dhanvantari',
    'SAMEERA FOUNDATIONS PVT LTD',
    'No. 44, Mecohouse, Anna Salai, Chennai - 600002',
    NULL, 4),
  (uuid_generate_v4(), 'Bagalur Ph2', 'active', 'Dexor',
    'SABARINATHAN PROPERTIES LLP',
    'New No.11, Old No.6, Mahalingam Street, Mahalingapuram, Nungambakkam, Chennai - 60003',
    NULL, 2),
  (uuid_generate_v4(), 'Maduranthakam Main Arch', 'active', 'Dhanvantari',
    'SAMEERA INFRA PVT LTD',
    'New No.11, Old No.6, Mahalingam Street, Mahalingapuram, Nungambakkam, Chennai - 60003',
    NULL, 5),
  (uuid_generate_v4(), 'Nenmeli Ph2', 'inactive', 'Dhanvantari',
    'SUBHAKRIPA HOMES PVT LTD',
    'New No.11, Old No.6, Mahalingam Street, Mahalingapuram, Nungambakkam, Chennai - 600034',
    NULL, 6);

-- ----------------------------------------
-- Step 4: Assign users to projects
-- Run after projects are inserted. Get project IDs first:
-- SELECT id, project_name FROM projects;
-- ----------------------------------------
-- Admin gets all projects:
INSERT INTO user_projects (user_id, project_id)
SELECT u.id, p.id
FROM users u, projects p
WHERE u.username = 'admin';

-- Ravi gets specific projects (adjust names as needed):
INSERT INTO user_projects (user_id, project_id)
SELECT u.id, p.id
FROM users u, projects p
WHERE u.username = 'ravi'
AND p.project_name IN ('NVT 9 Acres', 'Singadivakkam Ph1', 'Bagalur Ph2');

-- Meena gets specific projects (adjust names as needed):
INSERT INTO user_projects (user_id, project_id)
SELECT u.id, p.id
FROM users u, projects p
WHERE u.username = 'meena'
AND p.project_name IN ('Vannivedu 12.5 Acres', 'Maduranthakam Main Arch');

-- ----------------------------------------
-- Step 5: Insert vendors (from preference_data VENDOR_LIST)
-- ----------------------------------------
INSERT INTO vendors (id, vendor_name) VALUES
  (uuid_generate_v4(), 'Chandran@Painter (Vengai)'),
  (uuid_generate_v4(), 'JJJ ReadyMix'),
  (uuid_generate_v4(), 'Perumal Hardwares'),
  (uuid_generate_v4(), 'Neru Auditor@KPM'),
  (uuid_generate_v4(), 'PKS Power Tools Rental@Padapai'),
  (uuid_generate_v4(), 'ParthaSarathy Electrician'),
  (uuid_generate_v4(), 'Local Shop'),
  (uuid_generate_v4(), 'Sri Kanniyamman Earth Movers'),
  (uuid_generate_v4(), 'Vinoth JCB@Walajapet'),
  (uuid_generate_v4(), 'Jaul Islam'),
  (uuid_generate_v4(), 'Company Labour'),
  (uuid_generate_v4(), 'Company Labour 2024-25'),
  (uuid_generate_v4(), 'Walaja Labour'),
  (uuid_generate_v4(), 'Muthu Carpenter (Aachari/Vengai)'),
  (uuid_generate_v4(), 'AGD Rajalakshmi Traders@Chengai'),
  (uuid_generate_v4(), 'Nethaji (Chengai/Window Grill)'),
  (uuid_generate_v4(), 'Murugan@Chengai (M.Sand/Jelly Supplier)'),
  (uuid_generate_v4(), 'Additional Labour'),
  (uuid_generate_v4(), 'Dinesh Mali@Electricals'),
  (uuid_generate_v4(), 'Prasanna Agencies'),
  (uuid_generate_v4(), 'SriRam Traders (KPM)'),
  (uuid_generate_v4(), 'Muthammal Agency'),
  (uuid_generate_v4(), 'Fuel Station'),
  (uuid_generate_v4(), 'Sujatha Pandurangan (RR Bricks Supplier/Vengai)'),
  (uuid_generate_v4(), 'Venkateswara Hardwares'),
  (uuid_generate_v4(), 'KPM Tiles'),
  (uuid_generate_v4(), 'AGS'),
  (uuid_generate_v4(), 'S Traders'),
  (uuid_generate_v4(), 'H. Thameem Steels'),
  (uuid_generate_v4(), 'Bills'),
  (uuid_generate_v4(), 'Beverages'),
  (uuid_generate_v4(), 'Tips'),
  (uuid_generate_v4(), 'Murali@PBI Bricks(Red Bricks/Vengai)'),
  (uuid_generate_v4(), 'Naveen Hardwares'),
  (uuid_generate_v4(), 'Duraiyappa Hardwares'),
  (uuid_generate_v4(), 'EB Usage Bill'),
  (uuid_generate_v4(), 'Sampath Electricals'),
  (uuid_generate_v4(), 'MTB Red Bricks@Vengai'),
  (uuid_generate_v4(), 'Kothari Electricals'),
  (uuid_generate_v4(), 'Ever Green Solid Blocks'),
  (uuid_generate_v4(), 'HariHaran (Vengai/HaloBlock Stones)'),
  (uuid_generate_v4(), 'Siva@Tile Worker (Vengai)'),
  (uuid_generate_v4(), 'Surya Precast'),
  (uuid_generate_v4(), 'Vignesh Aravind'),
  (uuid_generate_v4(), 'SNMK Earth Movers'),
  (uuid_generate_v4(), 'Shankar@Precast Wall Work'),
  (uuid_generate_v4(), 'RVB Blue Metal Supplier@Karai/Vedal'),
  (uuid_generate_v4(), 'Akshaya Enterprises/Manogar@Karai'),
  (uuid_generate_v4(), 'VRG Cement Marketing'),
  (uuid_generate_v4(), 'Rasul Steel Traders'),
  (uuid_generate_v4(), 'Islam - Drain Work Labour'),
  (uuid_generate_v4(), 'Shanmuga Earth Movers'),
  (uuid_generate_v4(), 'Hindusthan Enterprises'),
  (uuid_generate_v4(), 'Kings Sand Supply'),
  (uuid_generate_v4(), 'Om Shakthi Solid Blocks(Vengai)'),
  (uuid_generate_v4(), 'ArulSelvan Earth Movers'),
  (uuid_generate_v4(), 'KSN Earth Movers'),
  (uuid_generate_v4(), 'JS ReadyMix'),
  (uuid_generate_v4(), 'SLG Hollow Bricks'),
  (uuid_generate_v4(), 'Yuvajothi Earth Movers'),
  (uuid_generate_v4(), 'Sadha Suppliers'),
  (uuid_generate_v4(), 'Guru Enterprises'),
  (uuid_generate_v4(), 'Local Civil Labour'),
  (uuid_generate_v4(), 'Centring Labour'),
  (uuid_generate_v4(), 'CVH Earth Works'),
  (uuid_generate_v4(), 'Chandran@Precast Wall Work'),
  (uuid_generate_v4(), 'Jaswanth Hardwares');

-- ----------------------------------------
-- Step 6: Assign vendors to projects
-- Assign all vendors to all projects (adjust as needed)
-- ----------------------------------------
INSERT INTO project_vendors (project_id, vendor_id)
SELECT p.id, v.id
FROM projects p, vendors v;

-- ----------------------------------------
-- Step 7: Insert payment methods (bank accounts)
-- ----------------------------------------
INSERT INTO payment_methods (id, name, opening_balance) VALUES
  (uuid_generate_v4(), 'Pavitram ICICI', 0),
  (uuid_generate_v4(), 'Shashvata ICICI', 0),
  (uuid_generate_v4(), 'Divya Equitas', 0),
  (uuid_generate_v4(), 'Amudha ESAF', 0),
  (uuid_generate_v4(), 'MD ESAF', 0),
  (uuid_generate_v4(), 'Shaan HDFC', 0);

-- ----------------------------------------
-- Step 8: Insert purchase categories (one row per category, subcategories as CSV)
-- ----------------------------------------
INSERT INTO purchase_categories (category, subcategories) VALUES
  ('Machineries', 'JCB,Tractor,Tipper,Roller,Grader,Dozzer,Tractor Dozzer,Diesel,Mixer Machine,Pile Drilling,Transport,Operator Bata,Crane,Others,Excavator'),
  ('Materials', 'Cement,M.Sand,P.Sand,20mm Jelly,6mm Jelly,8 inch Solid Block,6 inch Solid Block,4 inch Solid Block,Hill Earth,Scalp,GSB,WMM,Filling Soil,Debris,Hume Pipe,Plot Stone,Drinage Manual,Fencing,RMC M10 Grade,RMC M15 Grade,RMC M20 Grade,RMC M25 Grade,Steel/Rod,Steel/Ring,Kerb Stones,Plumbing Materials,Electrical Materials,Painting Materials,Wood Materials,Doors and Locks,Water Tanker,Rentals,Red Bricks,Petty Cash,Sheet Making,Plywood Sheet,Trees and Plants,Material Transport,Misc Expenses,Scaffolding Material,SS Hand Grill,Other Materials,Street Boards,BT,Paver Blocks,Tiles Materials,UPVC Windows,Bio Septic Tank,Bills,Mold,3mm Kambi,Granite Stone,Road Marking Stone,DWC Pipe 150mm (Orange),DWC Pipe 250mm,EB Service Materials,50mm Slab,6 inch PVC Pipes,CCTV Camera & Materials'),
  ('Labours', 'NMR Labour,Plumbing Labour,Electrical Labour,Kerb Labour,Painting Labour,Fencing Labour,Barbender Labour,Concrete Labour,Centring Labour,Landscape Labour,Wood works Labour,Precast CWall Labour,Plot Stone Fixing,Block Work Labour,Logo Writings,NVT Tree Cutting,Gate Making & Fixing,Fitter Labour,Light Poll Concrete Labour,Chamber Block Work,Rountana Block Work,Painting Rate Work,Plastering Rate Work,Paver Laying Labour,Other Labours,Carpenter Labour,Tile Laying Labour,Fabricator Labour,LockFix Work,Plot Stone Numbering'),
  ('EB', 'New Connection,Service Line Items and Work,Usage Bill'),
  ('Borewell', 'Drilling work,Labour,Motor and accessories,Other,Accessories'),
  ('Plan Approval', 'Drawing Expenses,Fees,Office expenses,Other Expenses,Working Drawing,Bank Estimation');
```

### 10.4 — Useful Supabase views (optional, for performance)

```sql
-- ============================================
-- OPTIONAL: Database views for summary queries
-- ============================================

-- Vendor summary view (pre-calculates Paid, Outstanding, Pending)
CREATE OR REPLACE VIEW vendor_summary AS
SELECT
  pv.project_id,
  pv.vendor_id,
  v.vendor_name,
  COALESCE(pay.total_paid, 0) AS paid,
  COALESCE(b_approved.total_approved, 0) - COALESCE(pay.total_paid, 0) AS outstanding,
  COALESCE(b_pending.total_pending, 0) AS pending_approval
FROM project_vendors pv
JOIN vendors v ON v.id = pv.vendor_id
LEFT JOIN (
  SELECT project_id, vendor_id, SUM(amount) AS total_paid
  FROM payments
  GROUP BY project_id, vendor_id
) pay ON pay.project_id = pv.project_id AND pay.vendor_id = pv.vendor_id
LEFT JOIN (
  SELECT project_id, vendor_id, SUM(amount - discount) AS total_approved
  FROM bills WHERE status = 'approved'
  GROUP BY project_id, vendor_id
) b_approved ON b_approved.project_id = pv.project_id AND b_approved.vendor_id = pv.vendor_id
LEFT JOIN (
  SELECT project_id, vendor_id, SUM(amount - discount) AS total_pending
  FROM bills WHERE status IN ('submitted', 'payment_done', 'payment_completed')
  GROUP BY project_id, vendor_id
) b_pending ON b_pending.project_id = pv.project_id AND b_pending.vendor_id = pv.vendor_id;

-- Project summary view
CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id AS project_id,
  p.project_name,
  p.status AS project_status,
  p."group" AS project_group,
  p.order_number,
  COALESCE(b.total_approved, 0) - COALESCE(pay.total_paid, 0) AS outstanding
FROM projects p
LEFT JOIN (
  SELECT project_id, SUM(amount - discount) AS total_approved
  FROM bills WHERE status IN ('approved', 'payment_processed')
  GROUP BY project_id
) b ON b.project_id = p.id
LEFT JOIN (
  SELECT project_id, SUM(amount) AS total_paid
  FROM payments
  GROUP BY project_id
) pay ON pay.project_id = p.id;
```

---

## 11. Claude Code Prompts

Use these prompts sequentially with Claude Code. Each prompt builds on the previous step.

> **How to use**: Open Claude Code inside the `pavitram-mobile/` folder. For screen prompts (3-11), **attach the corresponding screenshot** from the `screenshots/` folder — Claude Code can read images and will match the layout.

---

### Prompt 1: Project Initialization

```
Create a new Expo React Native project for "Pavitram" - a construction expense management app.

Use Expo SDK 52+ with TypeScript, Expo Router (file-based routing), and NativeWind v4 for styling.

Install these dependencies:
- @supabase/supabase-js, @react-native-async-storage/async-storage
- nativewind, tailwindcss
- @react-native-community/datetimepicker
- expo-secure-store

Configure NativeWind with a custom primary color scale (OrangeRed #ff4500):
- primary-50: #fff2ee through primary-900: #7a2000

Set up the folder structure:
- app/ (Expo Router routes)
- components/ (shared UI)
- context/ (AuthContext, SettingsContext)
- lib/ (supabase client, helpers)
- types/ (TypeScript interfaces)
- constants/ (colors)

Create the Supabase client in lib/supabase.ts using env vars EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY with AsyncStorage for session persistence.

The web app source is at ../pavitram-web-app/ for reference.
```

---

### Prompt 2: TypeScript Types & Constants

```
Set up the TypeScript types and constants for Pavitram mobile app.

Create types/index.ts with these interfaces:
- User: id (UUID), auth_id, name, username, role ('admin' | 'user')
- Project: id (UUID), project_name, status ('active' | 'inactive'), group, company_name, company_address, company_gst, order_number
- Vendor: id (UUID), vendor_name
- Bill: id (UUID), project_id, vendor_id, bill_number, date, amount, discount, category, subcategory, gst (0|5|18), description, status ('submitted'|'approved'|'payment_processed'), created_by, created_date, modified_by, modified_date
- Payment: id (UUID), project_id, vendor_id, date, amount, payment_method_id (FK to payment_methods), description, created_by, created_date, modified_by, modified_date
- PurchaseCategory: id (UUID), category, subcategories (comma-separated string — split in app with `.split(',')` for dropdown options)
- PaymentMethod: id (UUID), name, opening_balance — bank accounts like "Pavitram ICICI", "Shaan HDFC"

Note: Bills and payments are separate tables — payments are independent of bills (not linked to specific bills).
Note: Categories/subcategories and payment methods are fetched from DB reference tables, NOT hardcoded in the app.

No need for constants/categories.ts — categories come from the `purchase_categories` table in Supabase. Payment methods come from the `payment_methods` table.

Create lib/helpers.ts with:
- formatCurrency(amount): Indian rupee format with ₹ symbol
- formatDate(date): DD-Mmm-YY format (e.g., 05-Nov-24)
- getVendorSummary(bills, payments, vendorId): returns { paid, outstanding, pendingApproval }

Reference the web app at ../pavitram-web-app/src/ for formatting patterns.
```

---

### Prompt 3: Authentication

> Attach screenshot: `screenshots/01-login.png`

```
Implement authentication for the Pavitram mobile app using Supabase Auth.

[ATTACH: screenshots/01-login.png]

Create context/AuthContext.tsx:
- Uses Supabase auth (signInWithPassword, signOut, getSession, onAuthStateChange)
- On login success, fetches user profile from 'users' table (joined with auth_id)
- Provides: currentUser (User | null), loading (boolean), login(email, password), logout()
- Persists session via AsyncStorage (handled by Supabase client config)

Create app/_layout.tsx:
- Root layout wrapping everything with AuthProvider and SettingsProvider
- Handles auth state check on app start

Create app/login.tsx (Login Screen):
- Logo section at top
- Email & password TextInput fields
- Login button with loading state
- Error message display
- 3 demo credential quick-fill buttons: Admin (admin@pavitram.app), Ravi (ravi@pavitram.app), Meena (meena@pavitram.app)
- On success: router.replace('/(auth)/projects')
- Styled with NativeWind using primary color scheme (OrangeRed)

Create app/(auth)/_layout.tsx:
- Protected layout that checks currentUser
- Redirects to /login if not authenticated
- Shows loading spinner while checking session

Match the layout from the attached screenshot. Reference ../pavitram-web-app/src/pages/LoginPage.tsx for logic.
```

---

### Prompt 4: App Header Component

```
Create the AppHeader component for Pavitram mobile app.

Create components/AppHeader.tsx:
- Sticky/fixed header at top with primary-500 background (#ff4500), white text
- Props: title (string), showBack? (boolean), onBack? (function), rightContent? (ReactNode)
- Left side: Back arrow button (if showBack), Title text
- Right side: Settings icon (navigates to /settings), Logout icon (calls logout)
- Optional rightContent slot (for report button, add button, etc.)
- Uses SafeAreaView for notch handling
- Uses @expo/vector-icons (Ionicons or MaterialIcons) for icons

Style with NativeWind matching the web app's AppHeader.
Reference: ../pavitram-web-app/src/components/AppHeader.tsx
```

---

### Prompt 5: Project List Screen

> Attach screenshot: `screenshots/02-project-list.png`

```
Build the Project List screen for Pavitram mobile app.

[ATTACH: screenshots/02-project-list.png]

Create app/(auth)/projects/index.tsx:
- Fetches projects from Supabase (RLS handles admin vs user filtering)
- Fetches bills and payments to calculate outstanding per project
- Outstanding = sum(approved bills) - sum(payments)
- Sort projects by outstanding (descending)

UI:
- AppHeader with title "Projects", optional Report button for admin
- Summary banner at top: "Total Outstanding: ₹XX,XX,XXX"
- FlatList of project cards, each showing:
  - Index badge (1, 2, 3...)
  - Project name
  - Outstanding amount in Indian rupee format
- Tap project → router.push(`/(auth)/projects/${project.id}/vendors`)
- Pull-to-refresh support
- Loading state with ActivityIndicator

Match the layout from the attached screenshot. Reference ../pavitram-web-app/src/pages/ProjectListPage.tsx for logic.
```

---

### Prompt 6: Vendor List Screen

> Attach screenshot: `screenshots/03-vendor-list.png`

```
Build the Vendor List screen for Pavitram mobile app.

[ATTACH: screenshots/03-vendor-list.png]

Create app/(auth)/projects/[projectId]/vendors/index.tsx:
- Gets projectId from route params
- Fetches vendors for this project (via project_vendors join table)
- Fetches bills and payments for this project to calculate per-vendor summaries:
  - Paid = sum(payments for the vendor/project)
  - Outstanding = sum(approved bills) - Paid
  - Pending = sum(bills where status in submitted, payment_done, payment_completed)
- Sort vendors by outstanding (descending)

UI:
- AppHeader with back button, project name as title
- Summary banner: Paid | Outstanding | Pending Approval (project totals)
- FlatList of vendor cards, each showing:
  - Vendor name
  - Paid, Outstanding, Pending amounts
  - Two action icon buttons:
    - Statement icon (blue) → navigates to statement page
    - Pending icon (amber) → navigates to pending page
- Pull-to-refresh
- Empty state for no vendors

Match the layout from the attached screenshot. Reference ../pavitram-web-app/src/pages/VendorListPage.tsx for logic.
```

---

### Prompt 7: Vendor Statement Screen

> Attach screenshots: `screenshots/04-vendor-statement-expanded.png` and `screenshots/05-vendor-statement-compact.png`

```
Build the Vendor Statement screen for Pavitram mobile app.

[ATTACH: screenshots/04-vendor-statement-expanded.png]
[ATTACH: screenshots/05-vendor-statement-compact.png]

Create app/(auth)/projects/[projectId]/vendors/[vendorId]/statement.tsx:
- Gets projectId and vendorId from route params
- Fetches approved bills + payments for this vendor
- Calculates summary: Paid, Outstanding, Pending

UI:
- AppHeader with back button, vendor name, right content: "Add Payment" button (admin only) and "Download" button (admin only)
- Summary card: Paid | Outstanding | Pending
- Toolbar row:
  - Sort toggle: Newest/Oldest
  - Filter segmented control: All | Bills | Payments
  - Compact/Expanded toggle
- Two view modes:
  - Expanded: BillCard component (shows bill#, date, status badge, category, subcategory, amount) and PaymentCard component (shows payment method, date, amount)
  - Compact: single-line rows with colored accent bar
- FlatList with proper rendering
- Status badges: Approved (blue), Payment Processed (violet)
- Tap bill → navigate to bill edit page
- Tap payment → navigate to payment edit page (admin only)

Create components/BillCard.tsx, components/PaymentCard.tsx, components/CompactRow.tsx

Match the layout from the attached screenshots (expanded + compact views). Reference ../pavitram-web-app/src/pages/VendorStatementPage.tsx for logic.
```

---

### Prompt 8: Vendor Pending Approval Screen

> Attach screenshots: `screenshots/06-pending-approval.png` and `screenshots/07-pending-approval-compact.png`

```
Build the Vendor Pending Approval screen for Pavitram mobile app.

[ATTACH: screenshots/06-pending-approval.png]
[ATTACH: screenshots/07-pending-approval-compact.png]

Create app/(auth)/projects/[projectId]/vendors/[vendorId]/pending.tsx:
- Gets projectId and vendorId from route params
- Fetches bills with status='submitted' for this vendor in this project

UI:
- AppHeader with back button, vendor name
- Banner: vendor name, "Pending Approval" label, total pending amount
- "Add Bill" button → navigates to bill edit with billId='new'
- Toolbar: Sort toggle (Newest/Oldest), Compact toggle
- FlatList of pending bills (BillCard or CompactRow based on view mode)
- Sticky bottom bar: total pending amount (only visible when bills exist)
- Empty state: "No pending bills" message
- Tap bill → navigate to bill edit page

Match the layout from the attached screenshots (expanded + compact views). Reference ../pavitram-web-app/src/pages/VendorPendingApprovalPage.tsx for logic.
```

---

### Prompt 9: Bill Add/Edit Screen

> Attach screenshots: `screenshots/08-bill-add.png` and `screenshots/09-bill-edit-readonly.png`

```
Build the Bill Add/Edit screen for Pavitram mobile app.

[ATTACH: screenshots/08-bill-add.png]
[ATTACH: screenshots/09-bill-edit-readonly.png]

Create app/(auth)/projects/[projectId]/vendors/[vendorId]/bills/[billId].tsx:
- billId='new' for create, otherwise edit existing
- Fetches existing bill data if editing
- Read-only mode for non-admin users on non-open bills

UI (ScrollView form):
- AppHeader with back button, title "Add Bill" or "Edit Bill", delete button for admin (with confirmation Alert)
- Success banner on save
- Fields:
  - Project (read-only text)
  - Vendor (read-only text)
  - Date (DateTimePicker)
  - Bill Number (TextInput)
  - Bill Amount (TextInput, numeric keyboard)
  - Discount (TextInput, numeric, auto-calculates net amount display)
  - Category (Picker/dropdown — fetch from `purchase_categories` table, each row is one category: Machineries, Materials, Labours, EB, Borewell, Plan Approval)
  - Sub Category (Picker — when category is selected, get its `subcategories` field and split by comma to populate dropdown options)
  - GST % (Picker: 0%, 5%, 18%)
  - Description (TextInput multiline)
- Bottom action buttons:
  - Cancel (goes back)
  - Submit (saves as 'submitted')
  - Approve (admin only, saves as 'approved')
  - Payment Processed (admin only, saves as 'payment_processed')
- Supabase insert/update operations
- Form validation (required fields: date, bill number, amount, category)

Match the layout from the attached screenshots (add form + read-only view). Reference ../pavitram-web-app/src/pages/BillEditPage.tsx for full category/subcategory lists and business logic.
```

---

### Prompt 10: Payment Add/Edit Screen

> Attach screenshots: `screenshots/10-payment-add.png` and `screenshots/11-payment-edit.png`

```
Build the Payment Add/Edit screen for Pavitram mobile app.

[ATTACH: screenshots/10-payment-add.png]
[ATTACH: screenshots/11-payment-edit.png]

Create app/(auth)/projects/[projectId]/vendors/[vendorId]/payments/[paymentId].tsx:
- Admin-only screen (show access denied message for non-admin)
- paymentId='new' for create, otherwise edit existing

UI (ScrollView form):
- AppHeader with back button, title "Add Payment" or "Edit Payment", delete button for admin
- Fields:
  - Project (read-only)
  - Vendor (read-only)
  - Date (DateTimePicker)
  - Amount (TextInput, numeric)
  - Payment Method (Picker — fetch from `payment_methods` table: Pavitram ICICI, Shashvata ICICI, Divya Equitas, Amudha ESAF, MD ESAF, Shaan HDFC)
  - Description (TextInput multiline)
- Bottom buttons: Cancel | Submit
- Supabase insert / update operations (payments have no status — they are always recorded as-is)

Match the layout from the attached screenshots. Reference ../pavitram-web-app/src/pages/PaymentEditPage.tsx for logic.
```

---

### Prompt 11: Settings Screen

> Attach screenshot: `screenshots/12-settings.png`

```
Build the Settings screen for Pavitram mobile app.

[ATTACH: screenshots/12-settings.png]

Create app/(auth)/settings.tsx:
- AppHeader with back button, title "Settings"

Create context/SettingsContext.tsx:
- fontScale state (0.85 | 1.0 | 1.15 | 1.3)
- Persists to AsyncStorage under key 'pavitram_font_scale'
- Loads saved value on mount

Settings UI:
- Font Scale section with 4 preset buttons:
  - Small (0.85)
  - Default (1.0)
  - Large (1.15)
  - Extra Large (1.3)
- Current scale % display
- Preview section showing sample text at current scale
- Active preset highlighted with primary color

Match the layout from the attached screenshot. Reference ../pavitram-web-app/src/pages/SettingsPage.tsx for logic.
```

---

### Prompt 12: Polish & Final Integration

```
Polish the Pavitram mobile app for production readiness.

1. Review all screens for consistent styling (NativeWind, primary color scheme)
2. Add pull-to-refresh on all list screens
3. Add loading states (ActivityIndicator) for all Supabase queries
4. Add error handling with user-friendly Alert messages for Supabase failures
5. Ensure keyboard avoidance on all form screens (KeyboardAvoidingView)
6. Add proper TypeScript types — no 'any' types
7. Test the complete flow:
   - Login as admin → see all projects → vendor list → statement → pending → add bill → approve → add payment
   - Login as user → see assigned projects only → add bill → cannot approve
   - Logout and re-login (session persistence)
8. Configure app.json with proper app name, slug, icons, splash screen
9. Verify the app works on both iOS and Android (if possible, test with Expo Go)
```

---

## 12. Reference — Current Web App Structure

This is the complete mapping from web app files to the mobile equivalents:

| Web App File | Mobile App File | Purpose |
|-------------|----------------|---------|
| `src/types/index.ts` | `types/index.ts` | TypeScript interfaces |
| `src/data/mockData.ts` | *(replaced by Supabase `bills` + `payments` tables)* | Data source |
| `src/context/AuthContext.tsx` | `context/AuthContext.tsx` | Auth state |
| `src/context/SettingsContext.tsx` | `context/SettingsContext.tsx` | Settings state |
| `src/components/AppHeader.tsx` | `components/AppHeader.tsx` | Header component |
| `src/components/ProtectedRoute.tsx` | `app/(auth)/_layout.tsx` | Auth guard |
| `src/pages/LoginPage.tsx` | `app/login.tsx` | Login screen |
| `src/pages/ProjectListPage.tsx` | `app/(auth)/projects/index.tsx` | Project list |
| `src/pages/VendorListPage.tsx` | `app/(auth)/projects/[projectId]/vendors/index.tsx` | Vendor list |
| `src/pages/VendorStatementPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/statement.tsx` | Vendor statement |
| `src/pages/VendorPendingApprovalPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/pending.tsx` | Pending bills |
| `src/pages/BillEditPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/bills/[billId].tsx` | Bill form |
| `src/pages/PaymentEditPage.tsx` | `app/(auth)/projects/[projectId]/vendors/[vendorId]/payments/[paymentId].tsx` | Payment form |
| `src/pages/SettingsPage.tsx` | `app/(auth)/settings.tsx` | Settings |
| `src/App.tsx` (routes) | `app/` directory structure | Routing |
| `src/index.css` (theme) | `tailwind.config.js` + `global.css` | Styling |

### Key React Web → React Native translations

| Web (React) | Mobile (React Native) |
|-------------|----------------------|
| `<div>` | `<View>` |
| `<span>`, `<p>`, `<h1>` | `<Text>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<TouchableOpacity>` or `<Pressable>` |
| `<select>` | `<Picker>` from `@react-native-picker/picker` |
| `<input type="date">` | `<DateTimePicker>` |
| `<textarea>` | `<TextInput multiline>` |
| `<img>` | `<Image>` |
| `<a>` / `<Link>` | `<Link>` from expo-router or `router.push()` |
| `<ul>` / map() | `<FlatList>` |
| `onClick` | `onPress` |
| `className="..."` | `className="..."` (via NativeWind) |
| `window.confirm()` | `Alert.alert()` |
| `localStorage` | `AsyncStorage` |
| `useNavigate()` | `useRouter()` from expo-router |
| `useParams()` | `useLocalSearchParams()` from expo-router |
| CSS `position: sticky` | Custom implementation or header config |
| CSS `overflow: scroll` | `<ScrollView>` or `<FlatList>` |
| `navigate(-1)` | `router.back()` |

---

## Quick Start Checklist

- [ ] Install Node.js 18+, EAS CLI, Supabase CLI
- [ ] Create Expo account and Supabase account
- [ ] **Take screenshots** of all web app pages (run web app → Chrome DevTools → mobile view → capture each screen)
- [ ] Save screenshots to `_Shaan App/screenshots/` folder (01-login.png through 12-settings.png)
- [ ] Create Supabase project, run SQL scripts (10.1, 10.2)
- [ ] Create 3 auth users in Supabase dashboard
- [ ] Run seed SQL (10.3) with correct auth_id values
- [ ] Create Expo project at `source-code/pavitram-mobile/` (sibling to web app, NOT inside it)
- [ ] Configure NativeWind + Supabase client
- [ ] Build screens 1-8 sequentially using Claude Code prompts (attach screenshot for each)
- [ ] Test complete flow with all 3 user roles
- [ ] Configure app.json, icons, splash screen
- [ ] Build APK with EAS for testing
- [ ] (Optional) Submit to Play Store / App Store

---

**Total estimated prompts to Claude Code: 12**
**Each prompt builds on the previous one — run them in order.**
