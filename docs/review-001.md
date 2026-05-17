# Kibondo Green Farm — Technical Review 001

**Project:** Kibondo (Laravel 13 + React 19 dual-SPA)  
**Review date:** 16 May 2026  
**Scope:** Database schema, business logic, system security  
**Reviewer:** Codebase inspection (static analysis)

---

## Executive summary

Kibondo is a well-structured monolith for farm operations (staff dashboard + customer storefront) with a clear service layer, PostgreSQL-native schema, and sensible defaults for a small business (UUID keys, integer TZS amounts, Sanctum auth, audit logging).

The system is **fit for controlled/internal use** after addressing a few operational basics (default credentials, HTTPS). It is **not yet production-hardened** for open internet exposure without fixes to authorization, inventory/financial consistency, and token/session handling.

| Area | Rating | Summary |
|------|--------|---------|
| Database schema | **Good, with gaps** | Sound normalization and FKs; weak DB-level business rules |
| Business logic | **Adequate, with risks** | Core flows work; cancellations and RBAC are incomplete |
| System security | **Needs hardening** | Baseline auth/validation OK; IDOR, RBAC, and token risks |

---

## 1. Database review

### 1.1 Strengths

- **UUID primary keys** on core entities with `gen_random_uuid()` on older tables.
- **Money as integers (TZS)** — avoids floating-point errors.
- **Foreign keys** on critical paths: `sale_items`, `payments`, `product_recipes`, `campaign_recipients`, `delivery_zone_id` on `sales`.
- **Soft deletes** on `users`, `customers`, `products`, `sales`, `campaigns`.
- **Order lifecycle** evolved via PostgreSQL `CHECK` on `sales.status` (easier to extend than rigid enums).
- **Indexing** on hot paths: `sales(status, created_at, customer_id)`, `sale_items`, `stock_movements`, `payments`.
- **Audit logs** use `jsonb`, denormalized user fields, and no hard FK on `user_id` (appropriate for immutable audit trails).

### 1.2 Schema concerns

#### High severity

| Issue | Detail |
|-------|--------|
| **No stock non-negative constraint** | `products.stock_qty` and `materials.stock_qty` can go negative via race conditions or direct SQL. |
| **Cancelled sales leave inventory wrong** | Stock is deducted on create; cancel/delete does not post compensating `stock_movements`. |
| **Cancelled sales leave balances wrong** | `customers.outstanding_balance` and `total_spend` are incremented on sale create but not reversed on cancel. |
| **Loose movement references** | `stock_movements.reference_id` and `material_movements.reference_id` have no FK to `sales` or `packaging_runs`. |

#### Medium severity

| Issue | Detail |
|-------|--------|
| **`product_recipes` vs app model** | DB allows multiple materials per product (`UNIQUE product_id, material_id`); app uses `HasOne` and single-material upsert. |
| **`offline_queue` unused** | Table and model exist; sync API does not persist rows. |
| **Customer uniqueness** | No DB unique index on `email` / `phone`; duplicates possible from staff CRM. |
| **`sales.status` value `partial`** | Overlaps conceptually with `payment_status`; confusing for order vs payment state. |
| **Inconsistent UUID defaults** | Older tables use DB default; newer (`materials`, `delivery_zones`, `campaigns`) rely on Eloquent only. |

#### Low severity

| Issue | Detail |
|-------|--------|
| **`products.unit` CHECK removed** | Validation is application-only. |
| **Missing indexes** | e.g. `sales.assigned_to`, `sales.delivery_zone_id`, `customers.email`. |
| **`sale_items` only has `created_at`** | Intentional but inconsistent. |
| **Settings migration** | Social links migration `down()` does not restore legacy keys. |

### 1.3 Database recommendations

1. Add `CHECK (stock_qty >= 0)` on `products` and `materials`.
2. On sale cancel (and consider soft-delete): compensating stock movements + reverse customer balances when applicable.
3. Add partial unique indexes: `customers(email) WHERE deleted_at IS NULL` (and phone if required).
4. Simplify `product_recipes` to `UNIQUE (product_id)` **or** change app to `HasMany` recipes.
5. Remove or wire up `offline_queue` table.
6. Add indexes for delivery assignment and customer lookup columns.
7. Document and trim `sales.status` values; keep payment state in `payment_status` only.

---

## 2. Business logic review

### 2.1 Strengths

- **Service layer** (`SaleService`, `StockService`, `MaterialService`, `PaymentService`, `CampaignService`, `AuditService`) keeps controllers thin.
- **Transactions + row locks** on sale creation (`lockForUpdate`) reduce overselling under concurrency.
- **Storefront pricing** computed server-side from `Product.price` and optional promo setting — clients cannot set arbitrary prices on web orders.
- **Payment recording** caps amount at outstanding balance and updates `payment_status` atomically.
- **Warehouse flow** (materials → recipe → packaging run → finished stock) is coherent for single-material products.
- **Audit logging** on auth, users, products, and order lifecycle events.
- **Delivery role** restricted on `deliver` action to assigned orders.

### 2.2 Business logic concerns

#### High severity

| Issue | Detail |
|-------|--------|
| **Staff POS accepts client `unit_price`** | `SaleController::store` validates `items.*.unit_price` from the request. Unlike the storefront, staff can record sales at arbitrary prices (fraud / error). |
| **Sale cancellation does not restore stock** | `updateStatus` → `cancelled` only updates status; inventory and customer totals remain wrong. |
| **`credit_limit` never enforced** | Field exists on `customers` but is not checked in `SaleService` or POS. |
| **Guest orders deduct stock immediately** | Pending web orders reduce stock with no payment guarantee or reservation TTL. |

#### Medium severity

| Issue | Detail |
|-------|--------|
| **Promo applied at order time only** | Price snapshot in `sale_items`; later promo changes do not affect pending orders (acceptable if documented). |
| **Campaign send: any staff can create** | Only `send` is admin-gated; create/delete/preview available to all authenticated staff. |
| **Offline sync** | Only `sale` payload type implemented; others return `skipped`. |
| **Reports accessible to all staff roles** | API does not match README role matrix (e.g. delivery seeing financial reports). |
| **Confirm order can add `delivery_cost`** | Recalculates totals and increments customer balance — correct if intentional; needs clear workflow docs. |

#### Low severity

| Issue | Detail |
|-------|--------|
| **Sale number generation** | Parses last `sale_number` string; fragile if format changes. |
| **`payment_method: selcom` on storefront** | Accepted in validation; ensure payment integration or remove until implemented. |
| **Register vs CRM customer duplicates** | Store requires unique email/phone; staff CRM does not. |

### 2.3 Business logic recommendations

1. **Staff sales:** Always load `unit_price` from `products.price` (admin-only override with audit if needed).
2. **Cancellation service:** Single `cancelSale()` that reverses stock, customer balances, and sets status (within a DB transaction).
3. **Enforce `credit_limit`** before creating credit/unpaid sales for account customers.
4. **Guest checkout:** Consider stock reservation, order confirmation step, or deduct stock only when status → `confirmed`.
5. **Align API authorization** with README roles (see security section).
6. **Document order state machine:** `pending` → `confirmed` → `out_for_delivery` → `completed` / `cancelled`, and who can trigger each transition.

---

## 3. System security review

### 3.1 Strengths

- Laravel Sanctum bearer tokens; passwords hashed.
- Inactive staff accounts blocked at login.
- Rate limits: auth (10/min/IP), store API (120/min/IP), orders (10/min per customer or IP).
- API returns JSON errors; generic 500 for unexpected failures; Sentry integration.
- Store order authorization: customers can only view/confirm own orders.
- File upload validation (MIME, size) for avatars and product images.
- `.env` and `firebase-credentials.json` gitignored.
- Campaign email body escaped in Blade (`{{ }}`).
- Failed login attempts written to audit log.

### 3.2 Security risks

#### Critical

| Risk | Detail | Recommendation |
|------|--------|----------------|
| **Default admin seed** | `admin@kibondo.co.tz` / `admin123` in `AdminUserSeeder` | Never seed production; force password reset on first login |

#### High

| Risk | Detail | Recommendation |
|------|--------|----------------|
| **Tokens never expire** | `sanctum.expiration` is `null` | Set expiration (e.g. 7–30 days); revoke all tokens on password change |
| **Tokens in `localStorage`** | XSS → full account takeover | Prefer HttpOnly cookies + Sanctum SPA mode; add strict CSP |
| **IDOR: customer notes/tasks** | Shallow routes; any staff can update/delete by UUID | Verify parent `customer_id` on every mutation |
| **IDOR: sale `show` for delivery** | List filtered; `show` is not | Enforce `assigned_to` for delivery role on `show` |
| **Weak API RBAC** | Most routes only require `auth:sanctum` | Apply `role:` middleware per module per README matrix |
| **Staff POS price manipulation** | Client-supplied `unit_price` | Server-side pricing (see business logic) |
| **Guest order abuse** | Unauthenticated `POST /store/orders` | CAPTCHA, stricter limits, optional auth, confirm-before-stock-deduct |

#### Medium

| Risk | Detail | Recommendation |
|------|--------|----------------|
| **Open customer registration** | Anyone can register and get API token | Email verification or admin approval |
| **No staff API rate limit** | Authenticated scraping/abuse possible | Global throttle per user/IP |
| **HTTP in deployment guide** | Tokens in cleartext on network | TLS (Let’s Encrypt), HSTS, secure cookies |
| **No security headers** | Missing CSP, X-Frame-Options, etc. | Add middleware package or custom headers |
| **Campaign abuse by non-admin** | Create/delete/preview without admin role | Restrict campaign mutations to admin/marketing role |
| **Logout single token only** | Other devices stay logged in | “Log out everywhere” endpoint |

#### Low

| Risk | Detail | Recommendation |
|------|--------|----------------|
| **Password policy** | Min 8 characters only | Consider complexity or breached-password check |
| **No MFA** | Single factor only | MFA for admin accounts when feasible |
| **Profile phone not unique** | Update allows duplicate phones | `unique` rule ignoring soft deletes |
| **Arbitrary `image_url` on products** | Staff-set external URLs | Allowlist or uploads only |

### 3.3 Role matrix gap (API vs intended)

README describes role separation; API enforcement is partial:

| Capability | Intended (README) | API today |
|------------|-------------------|-----------|
| User management | Admin | Admin only ✓ |
| Audit logs | Admin | Admin only ✓ |
| Delivery zones / settings | Admin | Admin only ✓ |
| Stock movements / warehouse mutations | Admin, stock_manager | Partial ✓ |
| Order confirm / assign | Admin | Admin only ✓ |
| Reports / financial data | Admin, accountant | **All staff** ✗ |
| Payments create | Accountant | **All staff** ✗ |
| Products CRUD | Stock manager | **All staff** ✗ |
| Campaigns create/delete | Unclear | **All staff** (send = admin only) |
| POS / sales | Sales | All staff (price issue above) |

**Frontend `ProtectedRoute` is not a security boundary** — all checks must be enforced on the API.

---

## 4. Cross-cutting recommendations (priority)

### P0 — Before public production

1. Remove or change default admin seed; verify production has no default credentials.
2. Enforce HTTPS; set `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`.
3. Fix staff POS to use server-side prices.
4. Fix IDOR on notes, tasks, and sale `show` for delivery role.
5. Implement sale cancellation stock/balance reversal.

### P1 — Short term

6. Align route middleware with role matrix (reports, payments, products, campaigns).
7. Set Sanctum token expiration; add revoke-all-tokens on password change.
8. Add DB constraints: non-negative stock; partial unique on customer email/phone.
9. Harden guest checkout (CAPTCHA, rate limits, stock policy).
10. Add security headers middleware.

### P2 — Medium term

11. Move auth tokens off `localStorage` or implement strict CSP.
12. Email verification for customer registration.
13. Global authenticated API rate limiting.
14. Clean up schema (`offline_queue`, `product_recipes` uniqueness).
15. MFA for admin users.

---

## 5. Testing and operations notes

- Tests target PostgreSQL (`kibondo_test` in `phpunit.xml`); README still mentions SQLite — align documentation.
- README states PHP 8.2 / MySQL; project uses **PHP 8.3+** and **PostgreSQL** — update README to avoid misconfiguration.
- Ensure `firebase-credentials.json`, `.env`, and DB passwords are never committed.
- Run `php artisan test` in CI before deploy; add security-focused tests for IDOR and role denial (403).

---

## 6. Conclusion

Kibondo has a **solid foundation**: clear domain model, service-oriented backend, and appropriate technology choices for a Tanzanian fresh-produce business. The main gaps are **not architectural** but **operational and defensive**:

- **Database:** trustworthy structure, weak integrity on cancel and inventory.
- **Business logic:** storefront path is stronger than staff POS and cancellation paths.
- **Security:** authentication is fine; **authorization and token lifecycle** need the most work.

Addressing the **P0** items would materially improve safety for internet-facing deployment. **P1** items should follow before scaling users or order volume.

---

## Appendix A — Key files referenced

| Topic | Location |
|-------|----------|
| API routes | `routes/api.php` |
| Auth (staff) | `app/Http/Controllers/AuthController.php` |
| Auth (store) | `app/Http/Controllers/Store/CustomerAuthController.php` |
| Customer guard | `app/Http/Middleware/AuthenticateCustomer.php` |
| Sale logic | `app/Services/SaleService.php`, `app/Http/Controllers/SaleController.php` |
| Store orders | `app/Http/Controllers/Store/OrderController.php` |
| Role middleware | `app/Http/Middleware/RoleMiddleware.php` |
| Migrations | `database/migrations/` |
| Sanctum config | `config/sanctum.php` |
| CORS | `config/cors.php` |
| Deployment | `DEPLOYMENT.md` |

## Appendix B — Suggested acceptance criteria for re-review

- [ ] No default credentials in production database  
- [ ] Staff sale cannot set `unit_price` below catalog price without admin audit  
- [ ] Cancelling a pending/confirmed sale restores stock and customer balances  
- [ ] Delivery user receives 403 on `GET /sales/{id}` for unassigned orders  
- [ ] Non-admin receives 403 on `/reports/*` and `POST /campaigns`  
- [ ] Sanctum tokens expire; password change revokes existing tokens  
- [ ] Production served over HTTPS only  
- [ ] `CHECK (stock_qty >= 0)` on products and materials  

---

*End of review 001*
