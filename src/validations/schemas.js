import { z } from 'zod';

/**
 * Helper for numeric fields that can be sent as strings (e.g. from form-data)
 * but must be present and valid integers.
 */
const numericId = (name) => z.any()
  .refine((val) => val !== undefined && val !== null && val !== '', { 
    message: `${name} is required` 
  })
  .transform((val) => {
    const parsed = Number(val);
    return isNaN(parsed) ? val : parsed;
  })
  .refine((val) => typeof val === 'number' && !isNaN(val), { 
    message: `${name} must be a number` 
  })
  .pipe(z.number().int(`${name} must be an integer`));

const requiredString = (name, min = 1) => z.any()
  .refine((val) => val !== undefined && val !== null && val !== '', { 
    message: `${name} is required` 
  })
  .pipe(z.string().min(min, `${name} is required`));

const requiredEmail = (name = 'Email') => z.any()
  .refine((val) => val !== undefined && val !== null && val !== '', { 
    message: `${name} is required` 
  })
  .pipe(z.string().email('Invalid email address'));

// Auth Schemas
export const loginSchema = z.object({
  body: z.object({
    email: requiredEmail(),
    password: requiredString('Password'),
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: requiredString('Refresh token'),
  })
});

// Pagination Schema
export const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
});

// User Schemas
export const createUserSchema = z.object({
  body: z.object({
    name: requiredString('Name'),
    email: requiredEmail(),
    password: requiredString('Password', 6),
    role_id: numericId('Role ID'),
    phone: z.string().optional().nullable(),
    employee_id: z.string().optional().nullable(),
  })
});

export const createDeliveryStaffSchema = z.object({
  body: z.object({
    name: requiredString('Name'),
    email: requiredEmail(),
    password: requiredString('Password', 6),
    phone: z.string().optional().nullable(),
    employee_id: z.string().optional().nullable(),
    is_active: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.boolean().optional()
    ),
  })
});

export const updateDeliveryStaffSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    phone: z.string().optional().nullable(),
    employee_id: z.string().optional().nullable(),
    is_active: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.boolean().optional()
    ),
  })
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    role_id: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.number().int().optional()
    ),
    phone: z.string().optional().nullable(),
    employee_id: z.string().optional().nullable(),
    is_active: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.boolean().optional()
    ),
  })
});

// Tower Schemas
export const towerSchema = z.object({
  body: z.object({
    name: requiredString('Name'),
    code: requiredString('Code'),
    sort_order: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.number().int().optional()
    ),
    is_active: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.boolean().optional()
    ),
  })
});

// Floor Schemas
export const floorSchema = z.object({
  body: z.object({
    tower_id: numericId('Tower ID'),
    floor_number: numericId('Floor number'),
    floor_name: requiredString('Floor name'),
    is_active: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.boolean().optional()
    ),
  })
});

// Location Schemas
export const locationSchema = z.object({
  body: z.object({
    floor_id: numericId('Floor ID'),
    name: requiredString('Name'),
    code: z.string().optional().nullable(),
    external_id: z.string().optional().nullable(),
    is_active: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.boolean().optional()
    ),
  })
});

// Staff Bay Schemas
export const staffBaySchema = z.object({
  body: z.object({
    floor_id: numericId('Floor ID'),
    name: requiredString('Name'),
    is_active: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.boolean().optional()
    ),
  })
});

// Task Schemas
export const taskSchema = z.object({
  body: z.object({
    meta_flow_id: z.string().min(1, 'Meta Flow ID is required'),
    patient_category: z.string().min(1, 'Patient Category is required'),
    patient_mrd: z.string().min(1, 'Patient MRD is required'),
    patient_name: z.string().min(1, 'Patient Name is required'),
    phone_number: z.string().min(1, 'Phone Number is required'),
    pickup_location_id: numericId('Pickup Location ID'),
    destination_location_id: numericId('Destination Location ID'),
    date_time: z.string().optional().nullable(),
    specify: z.string().optional().nullable(),
    purpose_of_transfer: z.string().min(1, 'Purpose of Transfer is required'),
    asset_type: z.string().min(1, 'Asset Type is required'),
    requestor_name: z.string().min(1, 'Requestor Name is required'),
    requestor_phone_number: z.string().min(1, 'Requestor Phone Number is required'),
    requestor_extension_number: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    patient_category: z.string().optional(),
    patient_name: z.string().optional(),
    phone_number: z.string().optional(),
    date_time: z.string().optional().nullable(),
    specify: z.string().optional().nullable(),
    purpose_of_transfer: z.string().optional(),
    asset_type: z.string().optional(),
    remarks: z.string().optional().nullable(),
  }),
});

export const taskQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    pickup_location_id: z.string().optional(),
    destination_location_id: z.string().optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
  }),
});
export const assignAgentsSchema = z.object({
  body: z.object({
    agents: z.array(z.object({
      staff_id: z.number().int(),
      agent_label: z.string().optional(),
      slot_number: z.number().int().optional()
    })).min(1, 'At least one agent must be assigned')
  }),
});
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional().nullable(),
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    old_password: requiredString('Old password'),
    new_password: z.string().min(6, 'New password must be at least 6 characters')
  })
});
