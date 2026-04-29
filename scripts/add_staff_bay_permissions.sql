-- 1. Add permissions for Staff Bays module
INSERT INTO permissions (module, action, description) VALUES 
('staff_bays', 'view', 'View staff bays'),
('staff_bays', 'add', 'Add new staff bay'),
('staff_bays', 'edit', 'Edit existing staff bay'),
('staff_bays', 'delete', 'Delete/Deactivate staff bay');

-- 2. Assign these permissions to the Super Admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE module = 'staff_bays';
