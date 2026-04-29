# Implementation Log - Code Changes

This document tracks all significant code modifications and new features added to the Amrita PMS API.

## [2026-04-28]

### 1. Robust Validation System
- **File**: `src/validations/schemas.js`
- **Change**: Implemented strict validation helpers:
    - `numericId(name)`: Ensures numeric IDs are present and valid, preventing "NaN" errors.
    - `requiredString(name)`: Guarantees that mandatory strings are not empty or missing.
    - `requiredEmail()`: Standardized email validation with custom required messages.
- **Applied to**: Auth, Users, Towers, Floors, Locations, and Staff Bays.

### 2. Centralized Pagination
- **File**: `src/utils/pagination.utils.js` (New)
- **Change**: Created `getPaginationParams` and `getPaginatedResponse` to standardize pagination across the app.
- **Controllers Updated**: 
    - `user.controller.js`
    - `tower.controller.js`
    - `floor.controller.js`
    - `location.controller.js`
- **Metadata**: Responses now include `totalItems`, `totalPages`, `currentPage`, etc.

### 3. Staff Bay Module
- **Files**:
    - `src/controllers/staffBay.controller.js` (New)
    - `src/routes/staffBay.routes.js` (New)
    - `src/routes/index.js` (Updated)
- **Features**:
    - Full CRUD for Staff Bays.
    - **Automatic QR Generation**: Uses `crypto.randomUUID()` and `qrcode` package to generate images.
    - **Physical Storage**: QR images are saved to `public/uploads/qrcodes/`.
    - **Public Scanning**: The retrieval endpoint is public to allow direct scanning from any device.

### 4. Static File Serving
- **File**: `src/app.js`
- **Change**: Added `express.static` for `/public` directory to allow browser access to generated QR codes.

### 5. Audit Logging System
- **File**: `src/utils/audit.utils.js` (New)
- **Change**: Created a centralized `createAuditLog` helper.
- **Functionality**: Automatically captures:
    - User ID and Role ID.
    - Action type (add, edit, delete, etc.).
    - Entity Type (Module) and Entity ID.
    - IP Address and User Agent.
    - Meta data (full response JSON).
    - Old/New values for state tracking.

### 7. Task Management Module
- **Files**:
    - `src/controllers/task.controller.js` (New)
    - `src/routes/task.routes.js` (New)
    - `src/routes/index.js` (Updated)
- **Features**:
    - **Meta-flow Integration**: Specialized creation endpoint capturing `meta_flow_id` and `patient_category`.
    - **Automated Workflow**: 
        - Generates unique `task_number` (TSK-YYYYMMDD-XXXX).
        - Automatically creates a `task_timeline` entry with 'created' event.
        - Maps incoming IDs directly to `pickup_location_id` and `destination_location_id`.
    - **CRUD Operations**: Support for listing with pagination, updating, and cancelling (soft-delete).
    - **Integrated Auditing**: All actions recorded in `audit_logs`.

### 8. Swagger Documentation
- **File**: `src/config/swagger.config.js`
- **Change**: Added global `PaginationMeta` schema.
- **Routes**: Updated all listing endpoints to document pagination parameters and structured responses. Added new Task management endpoints.
