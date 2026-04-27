# PMS Automation — AI Context Document
> Single source of truth for all AI tools (Cursor, ChatGPT, Copilot, etc.)
> Paste this entire file as context before asking any code or architecture question.

---

## 1. Project Overview

**System:** Patient Movement Services (PMS) Automation
**Client:** Amrita Hospitals, Kochi
**Built by:** Intertoons

**What it does:**
Automates the coordination of patient transfers within the hospital. Staff (called delivery staff / porters) physically move patients between wards, floors, and towers using wheelchairs or trolleys. This system replaces manual phone-based coordination with a real-time digital workflow.

**Problem it solves:**
- Slow/manual patient transfer coordination
- No visibility into nearest available staff
- Break misuse and inaccurate attendance
- No performance reporting
- Uneven workload distribution

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Database | MySQL 8.0.45 |
| Backend API | Express.js (Node.js) |
| Web Admin | React.js |
| Mobile Admin | React Native |
| Mobile Staff App | React Native |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| External Integration | Meta Flow Ticketing System (inbound webhooks) |

---

## 3. Applications & Users

### 3.1 Web Admin (React.js)
- Full task management dashboard
- Staff assignment (manual + auto)
- Reports & analytics
- User, role, and hospital structure management

### 3.2 PMS Admin Mobile (React Native)
- Live task queue
- Assign / reassign staff to tasks
- View task timeline
- Receive alerts for rejections and SLA breaches

### 3.3 Delivery Staff Mobile (React Native)
- Receive push notification when assigned a task
- Accept or reject within 60 seconds
- Mark patient as picked up and delivered
- View own task history and attendance

### 3.4 Bay Device (QR / NFC)
- Physical devices mounted on each floor of each tower
- Staff taps to: start shift, start break, end break, end shift, update location
- Source of truth for attendance — cannot be done from app

### 3.5 Meta Flow (External)
- Existing hospital ticketing system
- Sends patient movement requests as webhooks to PMS
- PMS links back via `meta_flow_id` on both tasks and users

---

## 4. Core Workflow

```
1. Meta Flow sends webhook  →  OR  →  Admin creates task manually
2. Task created with status = new
3. System suggests nearest available delivery staff (same floor → same tower → nearby towers)
4. Admin assigns staff (manual pick or auto-assign)
5. Task status → delivery_assigned
6. Staff receives push notification — must respond within 60 seconds
7a. Accepted  → task status → in_progress; staff picks up patient
7b. Rejected  → task status → reassigning; system finds next staff
7c. No response (60s timeout) → task status → reassigning; system auto-reassigns
8. Staff marks patient picked up → then delivered
9. If multiple agents: task only completes when ALL agents deliver
10. Staff taps bay QR → marks themselves available again
11. Reports and dashboards update in real time
```

---

## 5. Database — MySQL 8.0.45

### 5.1 Table Index

| # | Table | Purpose |
|---|---|---|
| 1 | `towers` | Hospital blocks (A, B, C…) |
| 2 | `floors` | Each floor per tower |
| 3 | `locations` | Named wards/zones/entrances per floor |
| 4 | `staff_bays` | Physical QR/NFC devices per zone |
| 5 | `permissions` | Atomic permission keys (module.action) |
| 6 | `roles` | Named role groups |
| 7 | `role_permissions` | Many-to-many: role → permissions |
| 8 | `users` | All system users (admins + delivery staff) |
| 9 | `rejection_reasons` | Staff rejection reason options |
| 10 | `tasks` | Patient movement requests (core table) |
| 11 | `task_agents` | Current active agent slots per task |
| 12 | `task_assignment_history` | Full history of all assignment attempts |
| 13 | `task_timeline` | Ordered event log for a task (UI timeline source) |
| 14 | `staff_current_status` | Live availability and location per staff |
| 15 | `bay_tap_events` | Immutable QR/NFC tap log |
| 16 | `staff_shifts` | Computed shift record per staff per day |
| 17 | `shift_breaks` | Break segments within a shift |
| 18 | `notifications` | Push notification log |
| 19 | `meta_flow_requests` | Inbound webhook log from Meta Flow |
| 20 | `audit_logs` | Every user action with before/after values |

---

### 5.2 Full Schema (MySQL 8.0.45)

```sql
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ── HOSPITAL STRUCTURE ─────────────────────────────────────────

CREATE TABLE towers (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE floors (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tower_id     INT UNSIGNED NOT NULL,
    floor_number TINYINT NOT NULL,
    floor_name   VARCHAR(100) NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tower_id) REFERENCES towers(id),
    UNIQUE KEY uq_tower_floor (tower_id, floor_number)
);

CREATE TABLE locations (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    floor_id    INT UNSIGNED NOT NULL,
    name        VARCHAR(150) NOT NULL,
    code        VARCHAR(50),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (floor_id) REFERENCES floors(id)
);

CREATE TABLE staff_bays (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    floor_id    INT UNSIGNED NOT NULL,
    name        VARCHAR(100) NOT NULL,
    qr_code     VARCHAR(255) NOT NULL UNIQUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (floor_id) REFERENCES floors(id)
);

-- ── ACCESS MANAGEMENT ──────────────────────────────────────────

CREATE TABLE permissions (
    id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module      VARCHAR(60) NOT NULL,
    action      VARCHAR(60) NOT NULL,
    description VARCHAR(255),
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_perm (module, action)
);

CREATE TABLE roles (
    id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id       TINYINT UNSIGNED NOT NULL,
    permission_id SMALLINT UNSIGNED NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id         TINYINT UNSIGNED NOT NULL,
    meta_flow_id    VARCHAR(100) UNIQUE,
    name            VARCHAR(100) NOT NULL,
    employee_id     VARCHAR(50)  UNIQUE,
    email           VARCHAR(150) UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    fcm_token       VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ── LOOKUP ─────────────────────────────────────────────────────

CREATE TABLE rejection_reasons (
    id          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reason      VARCHAR(150) NOT NULL UNIQUE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── TASKS ──────────────────────────────────────────────────────

CREATE TABLE tasks (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_number             VARCHAR(20)  NOT NULL UNIQUE,
    meta_flow_id            VARCHAR(150) UNIQUE,
    source                  ENUM('manual','meta_flow') NOT NULL DEFAULT 'manual',
    requestor_name          VARCHAR(100) NOT NULL,
    requestor_phone         VARCHAR(20),
    requestor_extension     VARCHAR(20),
    patient_name            VARCHAR(100),
    patient_mrd             VARCHAR(50),
    patient_phone           VARCHAR(20),
    pickup_location_id      INT UNSIGNED NOT NULL,
    destination_location_id INT UNSIGNED NOT NULL,
    asset_type              VARCHAR(80)  NOT NULL,
    asset_type_notes        VARCHAR(255),
    scheduled_at            DATETIME,
    transfer_purpose        VARCHAR(100),
    remarks                 TEXT,
    required_agents         TINYINT UNSIGNED NOT NULL DEFAULT 1,
    status                  ENUM(
                                'new',
                                'delivery_assigned',
                                'reassigning',
                                'in_progress',
                                'completed',
                                'cancelled'
                            ) NOT NULL DEFAULT 'new',
    sla_minutes             TINYINT UNSIGNED NOT NULL DEFAULT 15,
    first_accepted_at       DATETIME,
    first_picked_up_at      DATETIME,
    all_delivered_at        DATETIME,
    completed_at            DATETIME,
    cancelled_at            DATETIME,
    cancellation_reason     VARCHAR(255),
    created_by              INT UNSIGNED,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pickup_location_id)      REFERENCES locations(id),
    FOREIGN KEY (destination_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by)              REFERENCES users(id),
    INDEX idx_tasks_status     (status),
    INDEX idx_tasks_created_at (created_at),
    INDEX idx_tasks_meta_flow  (meta_flow_id)
);

CREATE TABLE task_timeline (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id             INT UNSIGNED NOT NULL,
    event_type          ENUM(
                            'created',
                            'staff_assigned',
                            'staff_accepted',
                            'staff_rejected',
                            'staff_timeout',
                            'picked_up',
                            'delivered',
                            'all_delivered',
                            'completed',
                            'cancelled',
                            'note_added'
                        ) NOT NULL,
    from_status         ENUM('new','delivery_assigned','reassigning','in_progress','completed','cancelled'),
    to_status           ENUM('new','delivery_assigned','reassigning','in_progress','completed','cancelled'),
    actor_id            INT UNSIGNED,
    actor_type          ENUM('admin','delivery_staff','system','meta_flow') NOT NULL DEFAULT 'system',
    staff_id            INT UNSIGNED,
    rejection_reason_id TINYINT UNSIGNED,
    rejection_notes     VARCHAR(500),
    notes               VARCHAR(500),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id)             REFERENCES tasks(id),
    FOREIGN KEY (actor_id)            REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id)            REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (rejection_reason_id) REFERENCES rejection_reasons(id),
    INDEX idx_tt_task       (task_id, created_at),
    INDEX idx_tt_staff      (staff_id, created_at),
    INDEX idx_tt_event_type (event_type)
);

CREATE TABLE task_agents (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id             INT UNSIGNED NOT NULL,
    staff_id            INT UNSIGNED NOT NULL,
    agent_label         VARCHAR(80),
    slot_number         TINYINT UNSIGNED NOT NULL DEFAULT 1,
    assigned_by         INT UNSIGNED,
    assigned_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    agent_status        ENUM(
                            'pending',
                            'accepted',
                            'picked_up',
                            'delivered',
                            'rejected',
                            'timeout'
                        ) NOT NULL DEFAULT 'pending',
    accepted_at         DATETIME,
    picked_up_at        DATETIME,
    delivered_at        DATETIME,
    rejection_reason_id TINYINT UNSIGNED,
    rejection_notes     VARCHAR(255),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_task_slot (task_id, slot_number),
    FOREIGN KEY (task_id)             REFERENCES tasks(id),
    FOREIGN KEY (staff_id)            REFERENCES users(id),
    FOREIGN KEY (assigned_by)         REFERENCES users(id),
    FOREIGN KEY (rejection_reason_id) REFERENCES rejection_reasons(id),
    INDEX idx_ta_task  (task_id),
    INDEX idx_ta_staff (staff_id)
);

CREATE TABLE task_assignment_history (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id             INT UNSIGNED NOT NULL,
    staff_id            INT UNSIGNED NOT NULL,
    slot_number         TINYINT UNSIGNED NOT NULL DEFAULT 1,
    assigned_by         INT UNSIGNED,
    assignment_round    TINYINT UNSIGNED NOT NULL DEFAULT 1,
    assigned_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    response            ENUM('pending','accepted','rejected','timeout') NOT NULL DEFAULT 'pending',
    response_at         DATETIME,
    rejection_reason_id TINYINT UNSIGNED,
    rejection_notes     VARCHAR(255),
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id)             REFERENCES tasks(id),
    FOREIGN KEY (staff_id)            REFERENCES users(id),
    FOREIGN KEY (assigned_by)         REFERENCES users(id),
    FOREIGN KEY (rejection_reason_id) REFERENCES rejection_reasons(id),
    INDEX idx_tah_task  (task_id),
    INDEX idx_tah_staff (staff_id)
);

-- ── STAFF AVAILABILITY ─────────────────────────────────────────

CREATE TABLE staff_current_status (
    staff_id        INT UNSIGNED PRIMARY KEY,
    availability    ENUM('available','on_job','on_break','off_shift') NOT NULL DEFAULT 'off_shift',
    current_bay_id  INT UNSIGNED,
    current_task_id INT UNSIGNED,
    last_seen_at    DATETIME,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id)        REFERENCES users(id),
    FOREIGN KEY (current_bay_id)  REFERENCES staff_bays(id),
    FOREIGN KEY (current_task_id) REFERENCES tasks(id)
);

-- ── ATTENDANCE ─────────────────────────────────────────────────

CREATE TABLE bay_tap_events (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id    INT UNSIGNED NOT NULL,
    bay_id      INT UNSIGNED NOT NULL,
    event_type  ENUM('shift_start','break_start','break_end','shift_end','location_update') NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (bay_id)   REFERENCES staff_bays(id),
    INDEX idx_bte_staff (staff_id, created_at),
    INDEX idx_bte_bay   (bay_id,   created_at)
);

CREATE TABLE staff_shifts (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_id            INT UNSIGNED NOT NULL,
    shift_date          DATE NOT NULL,
    shift_start         DATETIME NOT NULL,
    shift_end           DATETIME,
    total_break_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    total_jobs          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    start_bay_id        INT UNSIGNED,
    is_complete         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id)     REFERENCES users(id),
    FOREIGN KEY (start_bay_id) REFERENCES staff_bays(id),
    UNIQUE KEY uq_staff_shift_date (staff_id, shift_date)
);

CREATE TABLE shift_breaks (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shift_id         INT UNSIGNED NOT NULL,
    break_start      DATETIME NOT NULL,
    break_end        DATETIME,
    duration_minutes SMALLINT UNSIGNED,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES staff_shifts(id)
);

-- ── NOTIFICATIONS ──────────────────────────────────────────────

CREATE TABLE notifications (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    task_id     INT UNSIGNED,
    type        VARCHAR(50)  NOT NULL,
    title       VARCHAR(150) NOT NULL,
    body        VARCHAR(500),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at     DATETIME,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    INDEX idx_notif_user (user_id, is_read)
);

-- ── META FLOW INTEGRATION ──────────────────────────────────────

CREATE TABLE meta_flow_requests (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    external_id     VARCHAR(150) NOT NULL UNIQUE,
    raw_payload     JSON,
    task_id         INT UNSIGNED,
    status          ENUM('received','processed','failed') NOT NULL DEFAULT 'received',
    error_message   TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- ── AUDIT LOG ──────────────────────────────────────────────────

CREATE TABLE audit_logs (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED,
    role_id      TINYINT UNSIGNED,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(60)  NOT NULL,
    entity_id    VARCHAR(40)  NOT NULL,
    old_value    JSON,
    new_value    JSON,
    ip_address   VARCHAR(45),
    user_agent   VARCHAR(300),
    meta         JSON,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_al_user       (user_id,     created_at),
    INDEX idx_al_entity     (entity_type, entity_id),
    INDEX idx_al_action     (action,      created_at),
    INDEX idx_al_created_at (created_at)
);

SET FOREIGN_KEY_CHECKS = 1;
```

---

## 6. Key Business Rules

### Task Status Flow
```
new → delivery_assigned → in_progress → completed
delivery_assigned → reassigning → delivery_assigned  (cycle on reject/timeout)
any active status → cancelled
```

| Status | Meaning |
|---|---|
| `new` | Created, no agents assigned |
| `delivery_assigned` | Agent(s) assigned, awaiting acceptance (60s window) |
| `reassigning` | An agent rejected or timed out — finding replacement |
| `in_progress` | First agent accepted; patient movement started |
| `completed` | ALL agents delivered |
| `cancelled` | Admin cancelled |

### Agent Status Flow (per `task_agents` row)
```
pending → accepted → picked_up → delivered
pending → rejected  (→ task becomes reassigning)
pending → timeout   (→ task becomes reassigning)
```

### Multi-Agent Completion Rule
```sql
-- Task is complete only when this returns 0
SELECT COUNT(*) FROM task_agents
WHERE task_id = ? AND agent_status != 'delivered';
```

### Nearest Staff Logic
Query priority order:
1. Same floor as pickup location
2. Same tower, different floor
3. Adjacent towers
Filter: `staff_current_status.availability = 'available'`

### Attendance Rules
- All attendance events happen via bay QR/NFC tap only — not through the app
- `bay_tap_events` is immutable — never update or delete rows
- `staff_shifts` and `shift_breaks` are computed from `bay_tap_events` on each tap

### Permission Check (API middleware)
1. Get `users.role_id`
2. Load permissions from `role_permissions` join `permissions`
3. Check if `module.action` exists in the set

### Audit Log Rule
Every Express route that mutates data (POST, PUT, PATCH, DELETE) must write one row to `audit_logs` with `old_value` and `new_value` as JSON snapshots.

---

## 7. Table Relationships

```
towers (1) ──── (N) floors (1) ──── (N) locations
                           (1) ──── (N) staff_bays

roles (1) ──── (N) role_permissions (N) ──── (1) permissions
roles (1) ──── (N) users

users (1) ──── (1) staff_current_status
users (1) ──── (N) bay_tap_events
users (1) ──── (N) staff_shifts (1) ──── (N) shift_breaks
users (1) ──── (N) notifications
users (1) ──── (N) audit_logs

tasks (1) ──── (N) task_agents
tasks (1) ──── (N) task_assignment_history
tasks (1) ──── (N) task_timeline
tasks (1) ──── (N) notifications
tasks (1) ──── (1) meta_flow_requests

task_agents.rejection_reason_id ──── rejection_reasons
task_assignment_history.rejection_reason_id ──── rejection_reasons
task_timeline.rejection_reason_id ──── rejection_reasons
```

---

## 8. API Summary (87 Endpoints)

### Auth (5)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `PATCH /api/v1/auth/fcm-token`
- `GET /api/v1/auth/me`

### Users (7)
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `PUT /api/v1/users/:id`
- `PATCH /api/v1/users/:id/deactivate`
- `PATCH /api/v1/users/:id/activate`
- `GET /api/v1/users/:id/audit`

### Roles & Permissions (7)
- `GET /api/v1/roles`
- `POST /api/v1/roles`
- `GET /api/v1/roles/:id`
- `PUT /api/v1/roles/:id`
- `DELETE /api/v1/roles/:id`
- `GET /api/v1/permissions`
- `PUT /api/v1/roles/:id/permissions`

### Hospital Structure (18)
- `GET|POST /api/v1/towers` · `PUT|PATCH /api/v1/towers/:id`
- `GET /api/v1/towers/:towerId/floors` · `POST /api/v1/floors` · `PUT|PATCH /api/v1/floors/:id`
- `GET /api/v1/locations` · `POST /api/v1/locations` · `PUT|PATCH /api/v1/locations/:id`
- `GET /api/v1/bays` · `POST /api/v1/bays` · `GET /api/v1/bays/:id` · `PUT|PATCH /api/v1/bays/:id` · `GET /api/v1/bays/:id/qr`

### Tasks — Admin (10)
- `GET /api/v1/tasks` — filter: status, date, asset_type, staff, location
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `PUT /api/v1/tasks/:id`
- `PATCH /api/v1/tasks/:id/cancel`
- `GET /api/v1/tasks/:id/timeline`
- `GET /api/v1/tasks/:id/agents`
- `GET /api/v1/tasks/:id/suggested-staff`
- `POST /api/v1/tasks/:id/assign`
- `POST /api/v1/tasks/:id/reassign`

### Task Agents — Admin (2)
- `GET /api/v1/tasks/:id/agents`
- `PATCH /api/v1/tasks/:id/agents/:agentId/reassign`

### Delivery Staff — Own Tasks (7)
- `GET /api/v1/my/tasks`
- `GET /api/v1/my/tasks/history`
- `GET /api/v1/my/tasks/:id`
- `PATCH /api/v1/my/tasks/:id/accept`
- `PATCH /api/v1/my/tasks/:id/reject`
- `PATCH /api/v1/my/tasks/:id/pickup`
- `PATCH /api/v1/my/tasks/:id/deliver`

### Staff Availability (3)
- `GET /api/v1/staff/available`
- `GET /api/v1/staff/:id/status`
- `GET /api/v1/staff/nearby?location_id=`

### Attendance (6)
- `POST /api/v1/bay/tap`
- `GET /api/v1/attendance`
- `GET /api/v1/attendance/:staffId`
- `GET /api/v1/attendance/:staffId/shifts/:shiftId`
- `GET /api/v1/my/attendance`
- `GET /api/v1/my/attendance/today`

### Notifications (5)
- `GET /api/v1/my/notifications`
- `GET /api/v1/my/notifications/unread-count`
- `PATCH /api/v1/my/notifications/:id/read`
- `PATCH /api/v1/my/notifications/read-all`

### Reports (10)
- `GET /api/v1/reports/dashboard`
- `GET /api/v1/reports/task-summary`
- `GET /api/v1/reports/staff-performance`
- `GET /api/v1/reports/sla-breaches`
- `GET /api/v1/reports/rejection-analysis`
- `GET /api/v1/reports/hourly-load`
- `GET /api/v1/reports/tower-performance`
- `GET /api/v1/reports/attendance-summary`
- `GET /api/v1/reports/task-summary/export`
- `GET /api/v1/reports/attendance-summary/export`

### Audit Log (2)
- `GET /api/v1/audit-logs`
- `GET /api/v1/audit-logs/:entityType/:entityId`

### Meta Flow Webhook (1)
- `POST /api/v1/webhooks/meta-flow` — auth: `X-MetaFlow-Secret` header

### Lookup (4)
- `GET /api/v1/rejection-reasons`
- `POST /api/v1/rejection-reasons`
- `PUT /api/v1/rejection-reasons/:id`
- `PATCH /api/v1/rejection-reasons/:id/toggle`

---

## 9. Naming Conventions

| Convention | Rule |
|---|---|
| Tables | `snake_case`, plural nouns |
| Columns | `snake_case` |
| Primary keys | always `id` |
| Foreign keys | `{referenced_table_singular}_id` |
| Timestamps | `created_at`, `updated_at` on every table |
| Immutable logs | `created_at` only (`bay_tap_events`, `task_timeline`) |
| Boolean columns | prefix `is_` (`is_active`, `is_complete`, `is_read`) |
| Enum values | `snake_case` strings |
| API routes | `kebab-case`, REST conventions |
| JWT | Bearer token, all routes except `/auth/login` and `/webhooks/*` |

---

## 10. Seed Roles & Permissions

### Roles
| ID | Name | Access |
|---|---|---|
| 1 | Super Admin | All permissions |
| 2 | PMS Admin | Tasks, staff view, attendance, reports, settings view |
| 3 | Delivery Staff | Own tasks, own attendance |

### Permission Modules
`tasks` · `staff` · `delivery` · `attendance` · `reports` · `settings` · `users` · `audit`

---

## 11. Integration Notes

### Meta Flow Webhook
- Endpoint: `POST /api/v1/webhooks/meta-flow`
- Auth: `X-MetaFlow-Secret` shared secret (not JWT)
- On receive: write to `meta_flow_requests` → create `tasks` row → link via `tasks.meta_flow_id`
- Users from Meta Flow linked via `users.meta_flow_id`

### Firebase FCM
- Token stored in `users.fcm_token`
- Updated on every app login via `PATCH /api/v1/auth/fcm-token`
- Notification types: `task_assigned` | `task_timeout` | `sla_breach` | `task_completed` | `task_reassigned`

---

*Document version: 1.0 — Generated for PMS Automation, Amrita Hospitals*
*MySQL 8.0.45 | Express.js | React.js | React Native*
