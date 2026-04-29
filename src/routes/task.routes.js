import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { taskSchema, updateTaskSchema, taskQuerySchema, assignAgentsSchema } from '../validations/schemas.js';

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
 *             required: [meta_flow_id, patient_category, patient_mrd, patient_name, phone_number, pickup_location_id, destination_location_id, purpose_of_transfer, requestor_name, requestor_phone_number]
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
 *               pickup_location_id:
 *                 type: integer
 *               destination_location_id:
 *                 type: integer
 *               date_time:
 *                 type: string
 *                 format: date-time
 *               specify:
 *                 type: string
 *               purpose_of_transfer:
 *                 type: string
 *               remarks:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [new, delivery_assigned, delivery_accepted, delivery_reassigned, picked_up, completed, cancelled]
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
 *   delete:
 *     summary: Cancel task
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
 *         description: Task cancelled
 */

/**
 * @swagger
 * /api/v1/tasks/{id}/agents:
 *   post:
 *     summary: Assign or Reassign agents to a task (Admin)
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
 *                   required: [staff_id, slot_number]
 *                   properties:
 *                     staff_id:
 *                       type: integer
 *                     agent_label:
 *                       type: string
 *                       example: Primary
 *                     slot_number:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       200:
 *         description: Agents updated successfully
 *
 * /api/v1/tasks/{id}/reject:
 *   post:
 *     summary: Reject a task assignment (Staff)
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
 *     summary: Accept a task assignment (Staff)
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
 *     summary: Mark task as picked up (Staff)
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
 *     summary: Mark task as completed/delivered (Staff)
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
router.post('/:id/reject', authMiddleware, taskController.rejectTask);
router.post('/:id/accept', authMiddleware, taskController.acceptTask);
router.post('/:id/pickup', authMiddleware, taskController.pickupTask);
router.post('/:id/complete', authMiddleware, taskController.completeTask);
router.put('/:id', authMiddleware, checkPermission('tasks', 'update_status'), validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', authMiddleware, checkPermission('tasks', 'cancel'), taskController.deleteTask);



export default router;
