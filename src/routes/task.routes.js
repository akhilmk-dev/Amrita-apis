import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { taskSchema, updateTaskSchema, taskQuerySchema, assignAgentsSchema, adminAgentStatusSchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management and Meta-flow integration
 */

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a new task (Integration point)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [meta_flow_id, patient_category, patient_mrd, patient_name, phone_number, pickup_location_id, destination_location_id, purpose_of_transfer, asset_type, requestor_name, requestor_phone_number]
 *             properties:
 *               meta_flow_id:
 *                 type: string
 *                 description: Unique identifier from external system
 *               patient_category:
 *                 type: string
 *                 enum: [IP, OP, ICU, ER, Radiology, Auxiliary Support]
 *                 example: IP
 *               patient_mrd:
 *                 type: string
 *                 description: Patient MRD number
 *               patient_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *                 description: Patient phone number
 *               pickup_location_id:
 *                 type: integer
 *               destination_location_id:
 *                 type: integer
 *               date_time:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled time (ISO 8601)
 *               specify:
 *                 type: string
 *                 description: Specific asset or notes (mapped to asset_type_notes)
 *               asset_type:
 *                 type: string
 *                 description: Type of asset (e.g., Trolley, Wheelchair)
 *                 example: Trolley
 *               purpose_of_transfer:
 *                 type: string
 *               requestor_name:
 *                 type: string
 *               requestor_phone_number:
 *                 type: string
 *               requestor_extension_number:
 *                 type: string
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created successfully
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, delivery_assigned, delivery_accepted, delivery_reassigned, picked_up, completed, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           description: Search by task number, patient name, or MRD
 *       - in: query
 *         name: pickup_location_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: destination_location_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of tasks with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   put:
 *     summary: Update task details
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patient_category:
 *                 type: string
 *               patient_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               date_time:
 *                 type: string
 *                 format: date-time
 *               specify:
 *                 type: string
 *               purpose_of_transfer:
 *                 type: string
 *               asset_type:
 *                 type: string
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated
 *   get:
 *     summary: Get task details with timeline
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed task information including agents and timeline
 *
 * /api/v1/tasks/{id}/cancel:
 *   post:
 *     summary: Cancel a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancel_reason:
 *                 type: string
 *                 description: Optional reason for cancellation
 *     responses:
 *       200:
 *         description: Task cancelled successfully
 *       400:
 *         description: Task cannot be cancelled (already completed)
 *       404:
 *         description: Task not found
 */

/**
 * @swagger
 * /api/v1/tasks/{id}/agents:
 *   post:
 *     summary: Assign or Reassign agents to a task (Admin)
 *     description: If replace_staff_id is provided, it is treated as a reassignment (target count stays same). If omitted, it is a new assignment (target count increments).
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agents]
 *             properties:
 *               agents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [staff_id]
 *                   properties:
 *                     staff_id:
 *                       type: integer
 *                     agent_label:
 *                       type: string
 *                       example: Primary
 *                     replace_staff_id:
 *                       type: integer
 *                       description: The ID of the failed staff member being replaced
 *     responses:
 *       200:
 *         description: Agents updated successfully
 *
 * /api/v1/tasks/{id}/agents/{staff_id}/next-statuses:
 *   get:
 *     summary: Get allowed next statuses for an agent (Admin)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *       - in: path
 *         name: staff_id
 *         required: true
 *     responses:
 *       200:
 *         description: Array of valid statuses
 *
 * /api/v1/tasks/{id}/agents/{staff_id}/status:
 *   patch:
 *     summary: Override agent status (Admin Only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *       - in: path
 *         name: staff_id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, picked_up, delivered, rejected]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *
 * /api/v1/tasks/{id}/reject:
 *   post:
 *     summary: Reject task assignment (Delivery Staff)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejection_reason_id:
 *                 type: integer
 *               rejection_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task rejected
 *
 * /api/v1/tasks/{id}/accept:
 *   post:
 *     summary: Accept task assignment (Delivery Staff)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task accepted
 *
 * /api/v1/tasks/{id}/pickup:
 *   post:
 *     summary: Mark task as picked up (Delivery Staff)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task picked up
 *
 * /api/v1/tasks/{id}/complete:
 *   post:
 *     summary: Mark task as completed (Delivery Staff)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task completed
 */


router.post('/', authMiddleware, checkPermission('tasks', 'create'), validate(taskSchema), taskController.createTask);
router.get('/', authMiddleware, checkPermission('tasks', 'view'), validate(taskQuerySchema), taskController.getAllTasks);
router.get('/:id', authMiddleware, checkPermission('tasks', 'view'), taskController.getTaskById);
router.post('/:id/agents', authMiddleware, checkPermission('tasks', 'assign'), validate(assignAgentsSchema), taskController.updateTaskAgents);
router.post('/:id/reject', authMiddleware, checkPermission('tasks', 'update_status'), taskController.rejectTask);
router.post('/:id/accept', authMiddleware, checkPermission('tasks', 'update_status'), taskController.acceptTask);
router.post('/:id/pickup', authMiddleware, checkPermission('tasks', 'update_status'), taskController.pickupTask);
router.post('/:id/complete', authMiddleware, checkPermission('tasks', 'update_status'), taskController.completeTask);
router.put('/:id', authMiddleware, checkPermission('tasks', 'update_status'), validate(updateTaskSchema), taskController.updateTask);
router.post('/:id/cancel', authMiddleware, checkPermission('tasks', 'cancel'), taskController.cancelTask);

// Admin Agent Status Management
router.get('/:id/agents/:staff_id/next-statuses', authMiddleware, checkPermission('tasks', 'view'), taskController.getAgentNextStatuses);
router.patch('/:id/agents/:staff_id/status', authMiddleware, checkPermission('tasks', 'update_status'), validate(adminAgentStatusSchema), taskController.updateAgentStatusAdmin);



export default router;
