# Database Log - Schema & Permission Changes

This document tracks all changes made to the database schema, permissions, and initial data seeding.

## [2026-04-28]

### 1. Permissions for Staff Bays
- **Module**: `staff_bays`
- **Actions**: `view`, `add`, `edit`, `delete`
- **Assignment**: All permissions assigned to Super Admin (Role ID: 1).
- **SQL Script**: `scripts/add_staff_bay_permissions.sql`
- **Query**:
```sql
INSERT INTO permissions (module, action, description) VALUES 
('staff_bays', 'view', 'View staff bays'),
('staff_bays', 'add', 'Add new staff bay'),
('staff_bays', 'edit', 'Edit existing staff bay'),
('staff_bays', 'delete', 'Delete/Deactivate staff bay');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE module = 'staff_bays';
```

### 2. Schema Verification
- **Table**: `staff_bays`
- **Status**: Table already existed in the Prisma schema with the following structure:
    - `id` (INT UNSIGNED, PK)
    - `floor_id` (INT UNSIGNED, FK)
    - `name` (VARCHAR 100)
    - `qr_code` (VARCHAR 255, UNIQUE) - *Now used to store Public Image URL*
    - `is_active` (BOOLEAN)
    - `created_at`, `updated_at` (DATETIME)

### 3. Task Table Verification
    - **External ID Mapping**: Added `external_id` to `locations` table. Task creation now resolves `pickup_location_id` and `destination_location_id` from these external IDs to internal database IDs.
    - **Automated Workflow**: 
    - `patient_category` (VARCHAR 80)
    - `meta_flow_id` (VARCHAR 150, UNIQUE)
    - `pickup_location_id` / `destination_location_id` (INT UNSIGNED, FK)
    - `task_number` (VARCHAR 20, UNIQUE)

### 5. Location External ID
- **Table**: `locations`
- **New Column**: `external_id` (VARCHAR 100, UNIQUE)
- **Purpose**: Used for mapping external system IDs to internal database IDs during task creation.

### 4. Permissions for Tasks
- **Module**: `tasks`
- **Actions Reused**: `view`, `create`, `update_status`, `cancel`
- **Status**: Using pre-existing permissions from the database.



