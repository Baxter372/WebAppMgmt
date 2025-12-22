# WAMS SaaS Platform - Technical Requirements Document

**Version:** 1.0  
**Date:** December 2, 2024  
**Project:** Web Application Management System (WAMS) - Multi-Tenant SaaS Platform

---

## Executive Summary

Transform the current single-user WAMS application into a multi-tenant SaaS platform supporting 6,000+ paying users with role-based access control, secure data isolation, and Stripe payment integration.

**Key Objectives:**
- Support 6,000+ concurrent users
- Implement secure authentication and authorization
- Enable data sharing between Standard Users and Accountants
- Integrate Stripe for subscription payments
- Maintain data privacy and security
- Provide Super Admin capabilities
- AWS infrastructure with <$500/month budget

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CloudFront (CDN)                    │
│              Static Assets + Frontend (React)           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Application Load Balancer             │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│   API Server (EC2)    │   │   API Server (EC2)    │
│   Node.js + Express   │   │   Node.js + Express   │
└───────────────────────┘   └───────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
            ┌───────────────────────────────┐
            │   AWS RDS PostgreSQL          │
            │   (Multi-AZ for redundancy)   │
            └───────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │   S3 Bucket      │    │   Redis Cache    │
    │   File Storage   │    │   Sessions       │
    └──────────────────┘    └──────────────────┘
```

### Multi-Tenant Data Isolation

**Tenant Isolation Strategy:** Row-Level Security (RLS)
- Each table has `user_id` or `organization_id` column
- All queries automatically filtered by authenticated user
- Database enforces data separation

---

## Technical Stack

### Frontend (Current + Enhancements)
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **State Management:** React Context API (or Zustand for complex state)
- **HTTP Client:** Axios
- **Auth Library:** JWT handling
- **Styling:** Current CSS + Tailwind CSS (optional)

### Backend (New)
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Language:** TypeScript
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Zod or Joi
- **ORM:** Prisma or TypeORM

### Database (New)
- **Primary Database:** PostgreSQL 15+ (AWS RDS)
- **Caching Layer:** Redis (ElastiCache)
- **Session Store:** Redis

### Infrastructure (AWS)
- **Compute:** EC2 (t3.medium) or ECS Fargate
- **Database:** RDS PostgreSQL (db.t3.small, Multi-AZ)
- **Cache:** ElastiCache Redis (cache.t3.micro)
- **Storage:** S3 for backups and file storage
- **CDN:** CloudFront
- **Load Balancer:** Application Load Balancer
- **Domain/SSL:** Route 53 + ACM (AWS Certificate Manager)
- **Monitoring:** CloudWatch

### Third-Party Services
- **Payments:** Stripe (subscription management)
- **Email:** AWS SES or SendGrid
- **Monitoring:** Sentry (error tracking)

---

## Database Schema

### Core Tables

#### 1. **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) NOT NULL, -- 'super_admin', 'standard_user', 'accountant'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  stripe_customer_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(50), -- 'active', 'canceled', 'past_due', 'trialing'
  subscription_plan VARCHAR(50), -- 'monthly', 'annual'
  trial_ends_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
```

#### 2. **tiles** (Web Application Cards)
```sql
CREATE TABLE tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  link VARCHAR(500),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  logo VARCHAR(500),
  app_type VARCHAR(20) DEFAULT 'web', -- 'web', 'protocol', 'local'
  local_path VARCHAR(500),
  paid_subscription BOOLEAN DEFAULT false,
  payment_frequency VARCHAR(20), -- 'Monthly', 'Annually'
  annual_type VARCHAR(20), -- 'Subscriber', 'Fiscal', 'Calendar'
  payment_amount DECIMAL(10,2),
  signup_date DATE,
  last_payment_date DATE,
  credit_card_id UUID REFERENCES credit_cards(id),
  payment_type_last4 VARCHAR(4),
  credit_card_name VARCHAR(100),
  account_link VARCHAR(500),
  notes TEXT,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tiles_user_id ON tiles(user_id);
CREATE INDEX idx_tiles_category ON tiles(user_id, category);
```

#### 3. **tabs** (Categories)
```sql
CREATE TABLE tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  has_stock_ticker BOOLEAN DEFAULT false,
  home_page_tab_id VARCHAR(100),
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_tabs_user_id ON tabs(user_id);
```

#### 4. **credit_cards**
```sql
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  last4 VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
```

#### 5. **finance_tiles** (Budget Tracking)
```sql
CREATE TABLE finance_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  budget DECIMAL(10,2),
  children JSONB, -- Store array of {amount, date}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_finance_tiles_user_id ON finance_tiles(user_id);
```

#### 6. **home_page_tabs**
```sql
CREATE TABLE home_page_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tab_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tab_id)
);

CREATE INDEX idx_home_page_tabs_user_id ON home_page_tabs(user_id);
```

#### 7. **stock_symbols**
```sql
CREATE TABLE stock_symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX idx_stock_symbols_user_id ON stock_symbols(user_id);
```

#### 8. **shared_access** (For Accountant Access)
```sql
CREATE TABLE shared_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accountant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_category VARCHAR(100), -- NULL = all categories
  access_level VARCHAR(20) DEFAULT 'read', -- 'read', 'write'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(owner_user_id, accountant_user_id, shared_category)
);

CREATE INDEX idx_shared_access_accountant ON shared_access(accountant_user_id);
CREATE INDEX idx_shared_access_owner ON shared_access(owner_user_id);
```

#### 9. **super_admins**
```sql
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 10. **active_sessions** (Optional - if tracked server-side)
```sql
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  opened_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);
```

#### 11. **audit_log** (For Super Admin tracking)
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'login', 'create_tile', 'share_access', etc.
  resource_type VARCHAR(50), -- 'tile', 'tab', 'user', etc.
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

#### 12. **subscriptions** (Stripe sync)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', etc.
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
```

---

## Authentication & Authorization

### Authentication Flow

#### Registration Flow:
1. User fills registration form (email, password, name)
2. Backend validates email uniqueness
3. Hash password (bcrypt, 12 rounds)
4. Create user record (role: 'standard_user', status: 'trialing')
5. Send verification email
6. Redirect to Stripe checkout (7-day trial)
7. After payment: activate subscription
8. Return JWT token

#### Login Flow:
1. User submits email + password
2. Backend validates credentials
3. Check subscription status (active/trial)
4. Generate JWT (24hr expiry)
5. Generate refresh token (30 days)
6. Return tokens + user profile

#### JWT Payload:
```typescript
{
  userId: string;
  email: string;
  role: 'super_admin' | 'standard_user' | 'accountant';
  subscriptionStatus: string;
  iat: number;
  exp: number;
}
```

### Authorization Rules

#### Super Admin:
- ✅ Access Super Admin page
- ✅ View all users (list, search, filter)
- ✅ Add/remove Super Admin privileges
- ✅ View system analytics (total users, revenue, active sessions)
- ✅ Suspend/activate user accounts
- ✅ View audit logs
- ❌ Cannot see user's private tiles/data (privacy)

#### Standard User:
- ✅ Manage own tiles, tabs, cards, finance data
- ✅ Share categories with Accountants
- ✅ View/manage own subscription
- ✅ Export/import own data
- ✅ Track active sessions
- ❌ Cannot access Super Admin page
- ❌ Cannot see other users' data

#### Accountant:
- ✅ View tiles shared with them (read-only or edit based on permission)
- ✅ View shared categories
- ✅ Generate reports for shared data
- ❌ Cannot create/manage own tiles (unless also Standard User)
- ❌ Cannot access Super Admin page
- ❌ Cannot see non-shared data

---

## API Design

### Base URL
```
https://api.wams.app/v1
```

### Authentication Endpoints

#### POST `/auth/register`
Request:
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "firstName": "John",
  "lastName": "Doe"
}
```
Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "standard_user",
    "subscriptionStatus": "trialing"
  },
  "token": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### POST `/auth/login`
Request:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```
Response: Same as register

#### POST `/auth/refresh`
Request:
```json
{
  "refreshToken": "refresh_token"
}
```

#### POST `/auth/logout`
Headers: `Authorization: Bearer {token}`

---

### Tiles Endpoints

#### GET `/tiles`
Headers: `Authorization: Bearer {token}`  
Query params: `?category=Finance&subcategory=Banking`  
Response:
```json
{
  "tiles": [
    {
      "id": "uuid",
      "name": "QuickBooks",
      "description": "Accounting software",
      "link": "https://quickbooks.intuit.com",
      "category": "Finance",
      "subcategory": "Accounting",
      "logo": "https://...",
      "appType": "web",
      "paidSubscription": true,
      "paymentAmount": 50.00,
      "paymentFrequency": "Monthly",
      ...
    }
  ],
  "total": 72
}
```

#### POST `/tiles`
Create new tile

#### PUT `/tiles/:id`
Update tile

#### DELETE `/tiles/:id`
Delete tile

#### GET `/tiles/:id`
Get single tile

---

### Tabs Endpoints

#### GET `/tabs`
Get user's tabs/categories

#### POST `/tabs`
Create new tab

#### PUT `/tabs/:id`
Update tab

#### DELETE `/tabs/:id`
Delete tab

#### PUT `/tabs/reorder`
Reorder tabs

---

### Credit Cards Endpoints

#### GET `/credit-cards`
#### POST `/credit-cards`
#### PUT `/credit-cards/:id`
#### DELETE `/credit-cards/:id`

---

### Finance Endpoints

#### GET `/finance-tiles`
#### POST `/finance-tiles`
#### PUT `/finance-tiles/:id`
#### DELETE `/finance-tiles/:id`

---

### Sharing Endpoints (Accountant Access)

#### POST `/shares`
Share category with accountant
```json
{
  "accountantEmail": "accountant@example.com",
  "category": "Finance", // or null for all
  "accessLevel": "read" // or 'write'
}
```

#### GET `/shares`
Get all active shares (as owner)

#### GET `/shares/with-me`
Get all shares where current user is the accountant

#### DELETE `/shares/:id`
Revoke access

#### GET `/shared-tiles`
Accountant endpoint - get all tiles shared with them

---

### Super Admin Endpoints

#### GET `/admin/users`
Query params: `?page=1&limit=50&search=john&role=standard_user&status=active`

Response:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "standard_user",
      "subscriptionStatus": "active",
      "createdAt": "2024-01-01",
      "lastLogin": "2024-12-01",
      "tileCount": 72,
      "monthlyRevenue": 19.99
    }
  ],
  "total": 6000,
  "page": 1,
  "totalPages": 120
}
```

#### GET `/admin/analytics`
System-wide analytics

#### POST `/admin/users/:id/suspend`
Suspend user account

#### POST `/admin/users/:id/activate`
Activate user account

#### POST `/admin/super-admins`
Grant Super Admin privileges

#### DELETE `/admin/super-admins/:userId`
Revoke Super Admin privileges

#### GET `/admin/audit-logs`
View audit trail

---

### Subscription Endpoints

#### GET `/subscription`
Get current user's subscription details

#### POST `/subscription/create-checkout-session`
Create Stripe checkout for new subscription

#### POST `/subscription/create-portal-session`
Create Stripe customer portal session (manage/cancel subscription)

#### POST `/subscription/webhook` (Stripe webhook)
Handle Stripe events (payment success/failure, subscription updates)

---

## Security Requirements

### Data Security

1. **Encryption at Rest:**
   - RDS encryption enabled
   - S3 bucket encryption (AES-256)
   - Sensitive fields encrypted (payment info)

2. **Encryption in Transit:**
   - HTTPS only (TLS 1.3)
   - API requires SSL

3. **Password Security:**
   - bcrypt hashing (cost factor: 12)
   - Minimum 8 characters
   - Complexity requirements

4. **Data Isolation:**
   - Row-level security
   - All queries filtered by `user_id`
   - Middleware enforces tenant isolation

5. **Input Validation:**
   - Sanitize all inputs
   - Parameterized queries (prevent SQL injection)
   - Rate limiting on all endpoints

### Authentication Security

1. **JWT Security:**
   - Short-lived access tokens (24 hours)
   - Refresh tokens (30 days, rotating)
   - Secure HTTP-only cookies for tokens
   - Token blacklist for logout

2. **Session Management:**
   - Redis-based sessions
   - Session timeout (24 hours inactive)
   - Force logout on password change

3. **Rate Limiting:**
   - Login attempts: 5 per 15 minutes
   - API calls: 1000/hour per user
   - Registration: 3 per hour per IP

4. **CORS:**
   - Whitelist specific origins
   - No wildcards in production

### Compliance

- **GDPR:** User data export, right to deletion
- **SOC 2:** Audit logging, access controls
- **PCI DSS:** Never store full credit card numbers (Stripe handles)

---

## Stripe Integration

### Subscription Plans

#### Plan 1: Monthly
- **Price:** $19.99/month
- **Stripe Price ID:** `price_monthly_xxx`

#### Plan 2: Annual (Save 20%)
- **Price:** $191.99/year ($15.99/month equivalent)
- **Stripe Price ID:** `price_annual_xxx`

#### Trial Period
- **7-day free trial** for all new users
- Full feature access during trial
- Auto-converts to paid after trial

### Stripe Webhooks to Handle

1. **`checkout.session.completed`**
   - User completed payment
   - Activate subscription
   - Update user status to 'active'

2. **`customer.subscription.updated`**
   - Subscription changed (upgrade/downgrade)
   - Update subscription record

3. **`customer.subscription.deleted`**
   - Subscription canceled
   - Update user status
   - Grace period: 30 days before data deletion

4. **`invoice.payment_succeeded`**
   - Successful payment
   - Extend subscription period

5. **`invoice.payment_failed`**
   - Payment failed
   - Update status to 'past_due'
   - Send notification email
   - Retry logic (Stripe handles)

### Payment Flow

1. User clicks "Subscribe"
2. Frontend calls: `POST /subscription/create-checkout-session`
3. Backend creates Stripe checkout session
4. Redirect to Stripe hosted checkout
5. User enters payment info
6. Stripe processes payment
7. Stripe webhook → Backend updates user status
8. Redirect back to app (authenticated)

---

## AWS Infrastructure Details

### Compute Layer

**Option A: EC2 (More Control)**
- **Instance Type:** t3.medium (2 vCPU, 4GB RAM)
- **Quantity:** 2 instances (for redundancy)
- **Auto-scaling:** Scale to 4 instances during peak
- **Cost:** ~$60/month (2 instances) + scaling

**Option B: ECS Fargate (Easier Management)**
- **Task Size:** 1 vCPU, 2GB RAM
- **Tasks:** 2-4 based on load
- **Cost:** ~$70-140/month

**Recommendation:** Start with EC2 for cost control, migrate to ECS later for easier scaling

### Database Layer

**RDS PostgreSQL:**
- **Instance:** db.t3.small (2 vCPU, 2GB RAM)
- **Storage:** 100GB General Purpose SSD
- **Multi-AZ:** Yes (for high availability)
- **Backups:** Automated daily, 7-day retention
- **Cost:** ~$70/month (single-AZ) or ~$140/month (Multi-AZ)

**Recommendation:** Start single-AZ, enable Multi-AZ after 1000 users

### Caching Layer

**ElastiCache Redis:**
- **Node Type:** cache.t3.micro
- **Purpose:** Session storage, API response caching
- **Cost:** ~$15/month

### Storage

**S3:**
- **Use Cases:** 
  - Data backups (automated daily)
  - User file uploads (if needed)
  - Static asset storage
- **Cost:** ~$5/month (minimal for this use case)

### CDN

**CloudFront:**
- **Purpose:** Serve React frontend globally
- **Cost:** ~$10-20/month

### Load Balancer

**Application Load Balancer:**
- **Cost:** ~$20/month + data transfer

### Total Estimated AWS Costs:
- **Minimum (single-AZ):** ~$250/month
- **Production (Multi-AZ):** ~$350/month
- **Well under your $500 budget! ✅**

---

## Frontend Changes Required

### 1. **Add Authentication UI**
- Login page
- Registration page
- Password reset flow
- Email verification page

### 2. **Add API Integration Layer**
```typescript
// services/api.ts
class APIClient {
  private baseURL = 'https://api.wams.app/v1';
  private token: string | null = null;

  async login(email: string, password: string) { }
  async register(userData: any) { }
  async getTiles(filters?: any) { }
  async createTile(tile: Tile) { }
  // ... all CRUD operations
}
```

### 3. **Replace localStorage with API Calls**
- Current: `const tiles = JSON.parse(localStorage.getItem('tiles'))`
- New: `const tiles = await api.getTiles()`

### 4. **Add Super Admin Dashboard**
New page with:
- User list table (searchable, filterable)
- Analytics charts (total users, revenue, growth)
- Suspend/activate user actions
- Grant Super Admin privileges UI
- Audit log viewer

### 5. **Add Sharing UI (for Accountant access)**
- Share modal
- "Share this category with..." selector
- List of active shares
- Revoke access button

### 6. **Add Subscription Management**
- "My Subscription" page
- Current plan display
- Upgrade/downgrade options
- Payment history
- Cancel subscription button
- Stripe customer portal integration

### 7. **Add Loading States**
- API calls are async (not instant like localStorage)
- Add spinners, skeleton screens
- Error handling for failed API calls

---

## Migration Strategy

### Phase 1: Keep Both Versions Running
- **Current version:** `https://baxter372.github.io/WebAppMgmt/` (free, single-user)
- **New SaaS version:** `https://app.wams.app/` (paid, multi-user)

### Phase 2: Data Migration Tool
For users wanting to migrate from free to paid:
1. Export data from free version (backup JSON)
2. Import on paid version during registration
3. One-click migration flow

---

## Development Phases (Recommended Approach)

### Phase 1: MVP (4-6 weeks)
**Goal:** Get paying customers ASAP

**Features:**
- ✅ User registration + login
- ✅ Stripe integration (monthly plan only)
- ✅ Basic tile CRUD via API
- ✅ Data isolation (multi-tenant)
- ✅ Deploy to AWS
- ✅ Basic security
- ❌ No Accountant sharing yet
- ❌ No Super Admin dashboard yet
- ❌ Limited features (tiles + tabs only)

**Deliverable:** Functional SaaS app users can pay for

### Phase 2: Core Features (4-6 weeks)
**Goal:** Feature parity with free version

**Features:**
- ✅ All current features (finance tiles, credit cards, stock ticker, etc.)
- ✅ Annual subscription plan
- ✅ Search functionality
- ✅ Active sessions tracking
- ✅ Export/import via UI
- ✅ Email notifications (payment reminders)

### Phase 3: Advanced Features (4-6 weeks)
**Goal:** Differentiate from free version

**Features:**
- ✅ Accountant sharing
- ✅ Super Admin dashboard
- ✅ Advanced analytics
- ✅ Audit logging
- ✅ Better performance/scaling

### Phase 4: Polish & Scale (Ongoing)
- Performance optimization
- Mobile app (React Native)
- Advanced reporting
- Integrations (QuickBooks API, etc.)
- White-label options

---

## Technology Decisions

### Backend Framework: Express.js
**Why:**
- Fast development
- Large ecosystem
- Easy to find developers
- Good for REST APIs

**Alternative:** NestJS (more structured, but steeper learning curve)

### ORM: Prisma
**Why:**
- Type-safe database access
- Auto-generated TypeScript types
- Excellent migration system
- Great developer experience

**Alternative:** TypeORM (more features, more complex)

### Database: PostgreSQL
**Why:**
- Proven reliability at scale
- JSONB support (flexible schema)
- Row-level security built-in
- Excellent RDS support

**Alternative:** MySQL (simpler but less features)

### Hosting: AWS
**Why:**
- Your preference
- Comprehensive services
- Good pricing for your scale
- Industry standard

**Alternative:** Google Cloud, Azure (similar capabilities)

---

## Security Best Practices

### Backend Security Checklist

- [ ] Helmet.js for HTTP headers
- [ ] CORS properly configured
- [ ] Rate limiting (express-rate-limit)
- [ ] Input validation (Zod)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize inputs)
- [ ] CSRF protection
- [ ] Secure session management
- [ ] Environment variables (never commit secrets)
- [ ] Dependency scanning (npm audit)
- [ ] API key rotation
- [ ] Database connection pooling
- [ ] Error messages don't leak info
- [ ] Logging (no sensitive data in logs)

### Frontend Security Checklist

- [ ] No API keys in frontend code
- [ ] XSS prevention (React handles most)
- [ ] Secure token storage (HTTP-only cookies)
- [ ] HTTPS only
- [ ] Content Security Policy (CSP)
- [ ] Subresource Integrity (SRI)
- [ ] Input sanitization
- [ ] No eval() or dangerous HTML

---

## Deployment Strategy

### CI/CD Pipeline (GitHub Actions)

#### Backend Deployment:
```yaml
name: Deploy Backend to AWS

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    - Build Docker image
    - Push to ECR (Elastic Container Registry)
    - Deploy to EC2/ECS
    - Run database migrations
    - Health check
    - Rollback on failure
```

#### Frontend Deployment:
```yaml
name: Deploy Frontend to CloudFront

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    - Build React app
    - Upload to S3
    - Invalidate CloudFront cache
```

### Database Migrations

**Using Prisma Migrate:**
```bash
# Development
npx prisma migrate dev --name add_user_table

# Production
npx prisma migrate deploy
```

**Rollback Strategy:**
- Keep migration history
- Test on staging first
- Automated backups before migration
- Manual rollback scripts ready

---

## Monitoring & Observability

### Key Metrics to Track

#### Application Metrics:
- API response times (p50, p95, p99)
- Error rates
- Request volume
- Active users
- Database query performance

#### Business Metrics:
- Total paying users
- Monthly Recurring Revenue (MRR)
- Churn rate
- Trial → Paid conversion rate
- Active sessions per user

### Tools:

1. **CloudWatch:**
   - EC2/RDS metrics
   - Custom application logs
   - Alarms for critical issues

2. **Sentry:**
   - Error tracking
   - Performance monitoring
   - User feedback

3. **Application Logs:**
   - Winston (Node.js logging)
   - Structured JSON logs
   - CloudWatch Logs integration

---

## Cost Breakdown (Monthly)

### AWS Infrastructure:
| Service | Configuration | Cost |
|---------|--------------|------|
| EC2 (2x t3.medium) | API servers | $60 |
| RDS PostgreSQL | db.t3.small, Single-AZ | $70 |
| ElastiCache Redis | cache.t3.micro | $15 |
| Application Load Balancer | Standard | $20 |
| S3 | Storage + requests | $5 |
| CloudFront | CDN | $15 |
| Data Transfer | Outbound | $20 |
| CloudWatch | Logging + monitoring | $10 |
| Route 53 | DNS | $1 |
| **Subtotal** | | **$216/month** |

### Third-Party Services:
| Service | Cost |
|---------|------|
| Stripe | 2.9% + 30¢ per transaction |
| SendGrid (email) | Free tier (100 emails/day) |
| Sentry (errors) | Free tier or $26/month |
| Domain (.app) | $12/year |

### Revenue at Scale:
- 6,000 users × $19.99/month = **$119,940/month**
- Stripe fees (3%): -$3,598
- AWS costs: -$216
- **Net revenue:** ~$116,000/month 🎉

**Your infrastructure costs are <0.2% of revenue!**

---

## Risk & Challenges

### Technical Risks:

1. **Database Performance:**
   - 6,000 users = potentially millions of tiles
   - **Mitigation:** Proper indexing, query optimization, caching

2. **Concurrent Load:**
   - Many users accessing simultaneously
   - **Mitigation:** Load balancer, auto-scaling, Redis caching

3. **Data Migration:**
   - Moving from localStorage to database
   - **Mitigation:** Clear migration tool, testing, support docs

4. **Backwards Compatibility:**
   - Maintain free version while building paid
   - **Mitigation:** Separate repositories/deployments

### Business Risks:

1. **User Adoption:**
   - Will users pay $20/month?
   - **Mitigation:** Clear value prop, trial period, great UX

2. **Competition:**
   - Similar apps exist
   - **Mitigation:** Unique features, better UX, accountant sharing

3. **Subscription Churn:**
   - Users canceling
   - **Mitigation:** Engagement features, value delivery, support

---

## Data Migration Plan

### From Free Version to Paid SaaS

#### User Flow:
1. User has data in free version (localStorage)
2. User registers on paid SaaS version
3. During onboarding: "Import existing data?"
4. User downloads backup from free version
5. Uploads backup to paid version
6. Backend parses JSON and populates database
7. User sees all their data in SaaS version

#### Technical Implementation:
```typescript
// POST /data/import
async importFromBackup(userId: string, backupData: any) {
  // Validate backup structure
  if (!backupData.tiles || !backupData.tabs) {
    throw new Error('Invalid backup');
  }
  
  // Import within transaction
  await db.transaction(async (trx) => {
    // Import tabs first
    for (const tab of backupData.tabs) {
      await trx.insert(tabs).values({
        userId,
        name: tab.name,
        hasStockTicker: tab.hasStockTicker,
        // ... map all fields
      });
    }
    
    // Import tiles
    for (const tile of backupData.tiles) {
      await trx.insert(tiles).values({
        userId,
        name: tile.name,
        // ... map all fields
      });
    }
    
    // Import credit cards, finance tiles, etc.
  });
}
```

---

## Development Timeline

### Phase 1: MVP (Weeks 1-6)

**Week 1-2: Backend Setup**
- AWS account setup
- Database schema creation
- Basic Express server
- Authentication endpoints
- Stripe integration (basic)

**Week 3-4: API Development**
- Tiles CRUD endpoints
- Tabs CRUD endpoints
- Data validation
- Testing

**Week 5-6: Frontend Integration**
- Add login/register pages
- Replace localStorage with API calls
- Subscription flow
- Testing & deployment

**Deliverable:** Working SaaS MVP

### Phase 2: Feature Parity (Weeks 7-12)
- All current features migrated
- Performance optimization
- Bug fixes
- User feedback implementation

### Phase 3: Advanced Features (Weeks 13-18)
- Accountant sharing
- Super Admin dashboard
- Advanced analytics
- Scaling improvements

---

## Next Steps

### Immediate Actions (Before Development):

1. **Business Decisions:**
   - [ ] Finalize pricing ($19.99/month or different?)
   - [ ] Decide on trial length (7 days?)
   - [ ] Choose domain name (wams.app, billtracker.app, etc.)
   - [ ] Create terms of service & privacy policy

2. **Technical Setup:**
   - [ ] Create AWS account (if not already)
   - [ ] Register domain name
   - [ ] Set up Stripe account (you have this)
   - [ ] Create project repository structure (separate from current)

3. **Design Work:**
   - [ ] Design login/register pages
   - [ ] Design Super Admin dashboard mockups
   - [ ] Design subscription/billing pages

4. **Legal/Compliance:**
   - [ ] Privacy policy
   - [ ] Terms of service
   - [ ] GDPR compliance plan

### Questions for You:

1. **Domain name:** What domain do you want? (wams.app, webappmgmt.com, etc.)
2. **Pricing:** Confirm $19.99/month and $191.99/year?
3. **Development priority:** Should we start MVP immediately, or plan more first?
4. **Team:** Is it just us building this, or will you hire additional developers?

---

## Appendix: Technology Stack Summary

```yaml
Frontend:
  - React 19 + TypeScript
  - Vite (build tool)
  - Axios (HTTP client)
  - React Router (routing)
  - React Query (server state management)

Backend:
  - Node.js 20 LTS
  - Express.js + TypeScript
  - Prisma (ORM)
  - JWT authentication
  - Stripe SDK
  - Zod (validation)

Database:
  - PostgreSQL 15
  - Redis (caching/sessions)

Infrastructure:
  - AWS EC2 or ECS Fargate
  - AWS RDS PostgreSQL
  - AWS ElastiCache Redis
  - AWS S3
  - AWS CloudFront
  - Application Load Balancer
  - Route 53 (DNS)

DevOps:
  - GitHub Actions (CI/CD)
  - Docker (containerization)
  - PM2 (process management)
  - Nginx (reverse proxy)

Monitoring:
  - CloudWatch
  - Sentry
  - Custom dashboards

Payments:
  - Stripe (checkout + subscriptions)
```

---

## Conclusion

This is a **substantial project** that transforms your current app into a full SaaS business. The good news:
- ✅ Your current app is a solid foundation
- ✅ AWS costs are well within budget
- ✅ Revenue potential is significant
- ✅ Technical architecture is proven and scalable

**The technical requirements are now documented. What would you like to focus on next?**

1. Start building Phase 1 MVP?
2. Create more detailed design mockups?
3. Set up AWS infrastructure first?
4. Continue improving the current free version?

Let me know your priority!





