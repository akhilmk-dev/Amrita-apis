import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import { sendNotification, notifyAdmins } from '../utils/notification.utils.js';
import { createAuditLog } from '../utils/audit.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         task_number:
 *           type: string
 *         meta_flow_id:
 *           type: string
 *         source:
 *           type: string
 *         status:
 *           type: string
 *         patient_name:
 *           type: string
 *         patient_mrd:
 *           type: string
 *         pickup_location_id:
 *           type: integer
 *         destination_location_id:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * Create a new task
 */
export const createTask = async (req, res, next) => {
  try {
    const {
      meta_flow_id,
      patient_category,
      patient_mrd,
      patient_name,
      phone_number,
      pickup_location_id,
      destination_location_id,
      date_time,
      specify,
      asset_type,
      purpose_of_transfer,
      requestor_name,
      requestor_phone_number,
      requestor_extension_number,
      remarks
    } = req.body;

    // Generate Task Number: TSK-YYYYMMDD-XXXX
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    const task_number = `TSK-${date}-${random}`;

    // 1. Resolve External IDs to internal database IDs
    const [pickupLocation, destinationLocation] = await Promise.all([
      prisma.locations.findUnique({ where: { external_id: String(pickup_location_id) } }),
      prisma.locations.findUnique({ where: { external_id: String(destination_location_id) } })
    ]);

    if (!pickupLocation) {
      throw new ApiError(`Pickup Location with external ID '${pickup_location_id}' not found`, 404);
    }
    if (!destinationLocation) {
      throw new ApiError(`Destination Location with external ID '${destination_location_id}' not found`, 404);
    }

    // 2. Insert into tasks
    const newTask = await prisma.tasks.create({
      data: {
        task_number,
        meta_flow_id,
        source: 'meta_flow',
        requestor_name,
        requestor_phone: requestor_phone_number,
        requestor_extension: requestor_extension_number,
        patient_name,
        patient_mrd,
        patient_phone: phone_number,
        patient_category,
        pickup_location_id: pickupLocation.id,
        destination_location_id: destinationLocation.id,
        asset_type,
        asset_type_notes: specify,
        scheduled_at: date_time ? new Date(date_time) : null,
        transfer_purpose: purpose_of_transfer,
        remarks,
        required_agents: 0,
        status: 'new',
        sla_minutes: 15,
        created_by: req.user?.user_id || null
      }
    });

    // 3. Insert into task_timeline
    await prisma.task_timeline.create({
      data: {
        task_id: newTask.id,
        event_type: 'created',
        to_status: 'new',
        actor_id: req.user?.user_id || null,
        actor_type: req.user?.role_key === 'super_admin' ? 'admin' : 'system'
      }
    });

    // Notify All Admins
    await notifyAdmins({
      task_id: newTask.id,
      type: 'task_created',
      title: 'New Task Received',
      body: `Task #${newTask.task_number} for patient ${newTask.patient_name} has been created.`
    });

    // 3. Create Audit Log
    await createAuditLog({
      req,
      action: 'add',
      entityType: 'tasks',
      entityId: newTask.id,
      newValue: newTask,
      meta: newTask
    });

    return successResponse(res, newTask, 'Task created successfully', 201);
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ApiError('Task with this Meta Flow ID already exists', 409));
    }
    next(error);
  }
};

/**
 * Get all tasks with pagination
 */
export const getAllTasks = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { status, search, pickup_location_id, destination_location_id, from_date, to_date } = req.query;

    const where = {};
    if (status) where.status = status;
    if (pickup_location_id) where.pickup_location_id = parseInt(pickup_location_id);
    if (destination_location_id) where.destination_location_id = parseInt(destination_location_id);

    // Date Range Filter
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at.gte = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { task_number: { contains: search } },
        { patient_name: { contains: search } },
        { patient_mrd: { contains: search } },
        { phone_number: { contains: search } },
        { purpose_of_transfer: { contains: search } },
        { requestor_name: { contains: search } },
        { requestor_phone_number: { contains: search } },
        { remarks: { contains: search } },
        { asset_type: { contains: search } }
      ];
    }

    const [count, tasks] = await prisma.$transaction([
      prisma.tasks.count({ where }),
      prisma.tasks.findMany({
        where,
        skip,
        take: limit,
        include: {
          pickup_location: true,
          destination_location: true,
          creator: {
            select: { id: true, name: true }
          }
        },
        orderBy: { created_at: 'desc' }
      })
    ]);

    const response = getPaginatedResponse({ count, page, limit, data: tasks });
    return successResponse(res, response, 'Tasks retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get task by ID (with timeline)
 */
export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.tasks.findUnique({
      where: { id: parseInt(id) },
      include: {
        pickup_location: true,
        destination_location: true,
        task_agents: {
          include: {
            staff: {
              select: { id: true, name: true, employee_id: true, profile_image: true }
            }
          }
        },
        task_timeline: {
          orderBy: { created_at: 'desc' },
          include: {
            actor: {
              select: { name: true }
            },
            staff: {
              select: { name: true }
            }
          }
        },
        task_assignment_history: {
          orderBy: { id: 'desc' },
          include: {
            staff: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!task) {
      throw new ApiError('Task not found', 404);
    }

    return successResponse(res, task, 'Task details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update task
 */
export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get old value for audit
    const oldTask = await prisma.tasks.findUnique({ where: { id: parseInt(id) } });
    if (!oldTask) throw new ApiError('Task not found', 404);

    const updatedTask = await prisma.tasks.update({
      where: { id: parseInt(id) },
      data: {
        patient_name: updateData.patient_name,
        patient_phone: updateData.phone_number,
        patient_category: updateData.patient_category,
        asset_type: updateData.asset_type,
        asset_type_notes: updateData.specify,
        transfer_purpose: updateData.purpose_of_transfer,
        remarks: updateData.remarks,
        scheduled_at: updateData.date_time ? new Date(updateData.date_time) : undefined
      }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'tasks',
      entityId: id,
      oldValue: oldTask,
      newValue: updatedTask,
      meta: updatedTask
    });

    return successResponse(res, updatedTask, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel Task (dedicated cancel action)
 */
export const cancelTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;
    const taskId = parseInt(id);

    const task = await prisma.tasks.findUnique({ where: { id: taskId } });
    if (!task) throw new ApiError('Task not found', 404);

    if (task.status === 'completed') {
      throw new ApiError('Cannot cancel a completed task', 400);
    }

    if (task.status === 'cancelled') {
      throw new ApiError('Task is already cancelled', 400);
    }

    const fromStatus = task.status;

    // Get assigned agents before clearing them
    const assignedAgents = await prisma.task_agents.findMany({
      where: { 
        task_id: taskId, 
        agent_status: { in: ['pending', 'accepted'] } 
      },
      include: {
        staff: {
          select: { user_id: true }
        }
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.tasks.update({
        where: { id: taskId },
        data: {
          status: 'cancelled',
          cancelled_at: new Date(),
          remarks: cancel_reason || task.remarks
        }
      });

      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'cancelled',
          from_status: fromStatus,
          to_status: 'cancelled',
          actor_id: req.user?.user_id || null,
          actor_type: req.user?.role_key === 'super_admin' ? 'admin' : 'system',
          notes: cancel_reason || null
        }
      });

      // Free up any assigned agents
      await tx.task_agents.updateMany({
        where: { task_id: taskId, agent_status: { in: ['pending', 'accepted'] } },
        data: { agent_status: 'rejected' }
      });

      // Reset their current_task_id in staff_current_status
      await tx.staff_current_status.updateMany({
        where: { current_task_id: taskId },
        data: { availability: 'available', current_task_id: null }
      });
    });

    // Send notifications (outside transaction)
    const notificationPayload = {
      task_id: taskId,
      type: 'task_cancelled',
      title: 'Task Cancelled',
      body: `Task #${task.task_number} for patient ${task.patient_name} has been cancelled.`
    };

    // 1. Notify Assigned Staff
    for (const agent of assignedAgents) {
      if (agent.staff?.user_id) {
        sendNotification({
          ...notificationPayload,
          user_id: agent.staff.user_id,
          role_key: 'delivery_staff'
        });
      }
    }

    // 2. Notify Admin (the one who cancelled it, so it shows in their panel/bell)
    if (req.user?.user_id) {
      sendNotification({
        ...notificationPayload,
        user_id: req.user.user_id,
        role_key: req.user.role_key
      });
    }

    await createAuditLog({
      req,
      action: 'delete',
      entityType: 'tasks',
      entityId: id,
      meta: { message: 'Task cancelled', cancel_reason }
    });

    return successResponse(res, null, 'Task cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete (Cancel) task - kept for backward compatibility
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.tasks.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'cancelled',
        cancelled_at: new Date()
      }
    });

    // Add to timeline
    await prisma.task_timeline.create({
      data: {
        task_id: parseInt(id),
        event_type: 'cancelled',
        from_status: task.status,
        to_status: 'cancelled',
        actor_id: req.user?.user_id || null,
        actor_type: 'system'
      }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'delete',
      entityType: 'tasks',
      entityId: id,
      meta: { message: 'Task cancelled' }
    });

    return successResponse(res, null, 'Task cancelled successfully');
  } catch (error) {
    next(error);
  }
};

export const updateTaskAgents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agents } = req.body; // Array of { staff_id, agent_label, replace_staff_id }
    const actor_id = req.user?.user_id;

    const taskId = parseInt(id);
    const task = await prisma.tasks.findUnique({ 
      where: { id: taskId }
    });
    if (!task) throw new ApiError('Task not found', 404);

    await prisma.$transaction(async (tx) => {
      // 1. Get current max slot once to avoid repeated queries in loop
      const existingAgents = await tx.task_agents.findMany({
        where: { task_id: taskId },
        select: { slot_number: true }
      });
      let nextSlot = existingAgents.reduce((max, a) => Math.max(max, a.slot_number), 0) + 1;

      for (const agent of agents) {
        const targetSlot = nextSlot++;

        // If not replacing someone, increment required_agents
        if (!agent.replace_staff_id) {
          await tx.tasks.update({
            where: { id: taskId },
            data: { required_agents: { increment: 1 } }
          });
        }

        // Create Task Agent (Always a new row)
        await tx.task_agents.create({
          data: {
            task_id: taskId,
            staff_id: agent.staff_id,
            agent_label: agent.agent_label || 'Agent',
            slot_number: targetSlot,
            assigned_by: actor_id,
            agent_status: 'pending'
          }
        });

        // Record History
        await tx.task_assignment_history.create({
          data: {
            task_id: taskId,
            staff_id: agent.staff_id,
            slot_number: targetSlot,
            assigned_by: actor_id,
            assignment_round: 1,
            response: 'pending'
          }
        });

        // Timeline
        await tx.task_timeline.create({
          data: {
            task_id: taskId,
            event_type: 'staff_assigned',
            from_status: task.status,
            to_status: 'delivery_assigned',
            actor_id,
            actor_type: 'admin',
            staff_id: agent.staff_id
          }
        });

        // Notification
        await sendNotification({
          user_id: agent.staff_id,
          task_id: taskId,
          type: 'task_assigned',
          title: 'New Job Assigned',
          body: `You have been assigned to Task ${task.task_number}. Please accept within 60 seconds.`,
          role_key: 'delivery_staff'
        }, tx);

        // Trigger 60s timeout timer (Outside transaction context)
        setTimeout(() => handleAssignmentTimeout(taskId, agent.staff_id, actor_id), 60000);
      }

      // Sync Task Status
      await syncTaskStatus(taskId, tx);
    }, {
      timeout: 15000 // Increase timeout to 15s to prevent "Transaction not found" on slow connections/OneSignal
    });

    return successResponse(res, null, 'Agents updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Assignment Timeout (60s Background Timer)
 */
const handleAssignmentTimeout = async (taskId, staff_id, admin_id) => {
  try {
    const agent = await prisma.task_agents.findFirst({
      where: { task_id: taskId, staff_id, agent_status: 'pending' }
    });

    if (agent) {
      await prisma.$transaction(async (tx) => {
        // 1. Mark as timeout in task_agents
        await tx.task_agents.updateMany({
          where: { task_id: taskId, staff_id, agent_status: 'pending' },
          data: { agent_status: 'timeout' }
        });

        // 2. Mark as timeout in history
        await tx.task_assignment_history.updateMany({
          where: { task_id: taskId, staff_id, response: 'pending' },
          data: {
            response: 'timeout',
            response_at: new Date()
          }
        });

        // 3. Recalculate Task Status (will move to delivery_reassigned because Active < Target)
        await syncTaskStatus(taskId, tx);

        // 4. Timeline
        await tx.task_timeline.create({
          data: {
            task_id: taskId,
            event_type: 'staff_timeout',
            from_status: 'delivery_assigned', // Fallback
            to_status: 'delivery_reassigned',
            actor_id: staff_id,
            actor_type: 'system',
            staff_id
          }
        });

        // 5. Notify Admin
        const taskDetails = await tx.tasks.findUnique({ where: { id: taskId }, select: { task_number: true } });
        await sendNotification({
          user_id: admin_id,
          task_id: taskId,
          type: 'staff_timeout',
          title: 'Staff Assignment Timeout',
          body: `Staff member (ID: ${staff_id}) failed to accept task ${taskDetails?.task_number} within 60s.`,
          role_key: 'admin'
        }, tx);
      });
      console.log(`Assignment timeout handled for Task ${taskId}, Staff ${staff_id}`);
    }
  } catch (error) {
    console.error('Error handling assignment timeout:', error);
  }
};

/**
 * Staff Action: Accept Task
 */
export const acceptTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff_id = req.user?.user_id;
    const taskId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      const agent = await tx.task_agents.findFirst({
        where: { task_id: taskId, staff_id },
        orderBy: { slot_number: 'desc' }
      });

      if (!agent) throw new ApiError('Agent assignment not found', 404);
      
      // Transition Validation
      if (!getValidTransitions(agent.agent_status).includes('accepted')) {
        throw new ApiError(`Cannot accept task from status: ${agent.agent_status}`, 400);
      }

      // 1. Update Agent Status
      await tx.task_agents.update({
        where: { id: agent.id },
        data: { 
          agent_status: 'accepted',
          accepted_at: new Date()
        }
      });

      // 2. Update Staff Availability
      await tx.staff_current_status.updateMany({
        where: { staff_id },
        data: { 
          availability: 'on_job',
          current_task_id: taskId,
          updated_at: new Date()
        }
      });

      // 3. Sync Task Status
      await syncTaskStatus(taskId, tx);

      // 4. Timeline
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_accepted',
          from_status: agent.agent_status,
          to_status: 'accepted',
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id
        }
      });

      // 5. Notify the assigner (Admin)
      const agentDetails = await tx.task_agents.findFirst({
        where: { id: agent.id },
        select: { assigned_by: true, staff: { select: { name: true } } }
      });
      const task = await tx.tasks.findUnique({ where: { id: taskId } });
      if (agentDetails?.assigned_by) {
        await sendNotification({
          user_id: agentDetails.assigned_by,
          task_id: taskId,
          type: 'staff_accepted',
          title: 'Task Accepted',
          body: `${agentDetails.staff.name} has accepted Task #${task.task_number}.`,
          role_key: 'admin'
        }, tx);
      }
    });

    return successResponse(res, null, 'Task accepted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Staff Action: Pick Up Task
 */
export const pickupTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff_id = req.user?.user_id;
    const taskId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      const agent = await tx.task_agents.findFirst({
        where: { task_id: taskId, staff_id },
        orderBy: { slot_number: 'desc' }
      });

      if (!agent) throw new ApiError('Agent assignment not found', 404);

      if (!getValidTransitions(agent.agent_status).includes('picked_up')) {
        throw new ApiError(`Cannot pickup task from status: ${agent.agent_status}`, 400);
      }

      // 1. Update Agent Status
      await tx.task_agents.update({
        where: { id: agent.id },
        data: { 
          agent_status: 'picked_up',
          picked_up_at: new Date()
        }
      });

      // 2. Sync Task Status
      await syncTaskStatus(taskId, tx);

      // 3. Timeline
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_picked_up',
          from_status: agent.agent_status,
          to_status: 'picked_up',
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id
        }
      });

      // 4. Notify Creator (Admin)
      const task = await tx.tasks.findUnique({ where: { id: taskId } });
      if (task.created_by) {
        await sendNotification({
          user_id: task.created_by,
          task_id: taskId,
          type: 'task_picked_up',
          title: 'Task Picked Up',
          body: `Task #${task.task_number} has been picked up by the agent.`,
          role_key: 'admin'
        }, tx);
      }
    });

    return successResponse(res, null, 'Task picked up successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Staff Action: Complete Task
 */
export const completeTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff_id = req.user?.user_id;
    const taskId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      const today = new Date().toISOString().split('T')[0];

      const agent = await tx.task_agents.findFirst({
        where: { task_id: taskId, staff_id },
        orderBy: { slot_number: 'desc' }
      });

      if (!agent) throw new ApiError('Agent assignment not found', 404);

      if (!getValidTransitions(agent.agent_status).includes('delivered')) {
        throw new ApiError(`Cannot complete task from status: ${agent.agent_status}`, 400);
      }

      // 1. Update Agent Status
      await tx.task_agents.update({
        where: { id: agent.id },
        data: { 
          agent_status: 'delivered',
          delivered_at: new Date()
        }
      });

      // 2. Sync Task Status
      await syncTaskStatus(taskId, tx);

      // 3. Update Availability
      await tx.staff_current_status.updateMany({
        where: { staff_id },
        data: { 
          availability: 'available',
          current_task_id: null,
          updated_at: new Date()
        }
      });

      // 4. Increment total_jobs on the agent's active shift
      await tx.staff_shifts.updateMany({
        where: { staff_id, shift_date: new Date(today), is_complete: false },
        data: { total_jobs: { increment: 1 } }
      });

      // 5. Timeline
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_delivered',
          from_status: agent.agent_status,
          to_status: 'delivered',
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id
        }
      });

      // 6. Notify Creator
      const task = await tx.tasks.findUnique({ where: { id: taskId } });
      if (task.created_by) {
        await sendNotification({
          user_id: task.created_by,
          task_id: taskId,
          type: 'task_completed',
          title: 'Task Completed',
          body: `Task ${task.task_number} has been successfully completed.`,
          role_key: 'admin'
        }, tx);
      }
    });

    return successResponse(res, null, 'Task completed successfully');
  } catch (error) {
    next(error);
  }
};



/**
 * Handle Staff Rejection
 */
export const rejectTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejection_reason_id, rejection_notes } = req.body;
    const staff_id = req.user?.user_id;
    const taskId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      const agent = await tx.task_agents.findFirst({
        where: { task_id: taskId, staff_id },
        orderBy: { slot_number: 'desc' }
      });

      if (!agent) throw new ApiError('Agent assignment not found', 404);

      // 1. Mark as rejected in task_agents
      await tx.task_agents.update({
        where: { id: agent.id },
        data: {
          agent_status: 'rejected',
          rejection_reason_id,
          rejection_notes
        }
      });

      // 2. Update assignment history
      await tx.task_assignment_history.updateMany({
        where: { task_id: taskId, staff_id, response: 'pending' },
        data: {
          response: 'rejected',
          response_at: new Date(),
          rejection_reason_id
        }
      });

      // 3. Update Availability
      await tx.staff_current_status.updateMany({
        where: { staff_id },
        data: { availability: 'available', current_task_id: null }
      });

      // 4. Sync Task Status
      await syncTaskStatus(taskId, tx);

      // 5. Timeline
      const task = await tx.tasks.findUnique({ where: { id: taskId }, select: { task_number: true, status: true } });
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_rejected',
          from_status: agent.agent_status,
          to_status: 'delivery_reassigned',
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id,
          rejection_reason_id
        }
      });

      // 6. Notify Admin
      const lastAssignment = await tx.task_assignment_history.findFirst({
        where: { task_id: taskId, staff_id, response: 'rejected' },
        orderBy: { id: 'desc' }
      });
      if (lastAssignment) {
        await sendNotification({
          user_id: lastAssignment.assigned_by,
          task_id: taskId,
          type: 'task_rejected',
          title: 'Task Assignment Rejected',
          body: `Staff member rejected task #${task.task_number}. Reason: ${rejection_notes || 'Not specified'}`,
          role_key: 'admin'
        }, tx);
      }
    });

    return successResponse(res, null, 'Task rejected successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Internal: Recalculate and update the overall task status based on individual agent states
 */
const syncTaskStatus = async (taskId, tx) => {
  const task = await tx.tasks.findUnique({
    where: { id: taskId },
    include: { task_agents: true }
  });

  if (!task) return;

  const agents = task.task_agents;
  const activeAgents = agents.filter(a => !['rejected', 'timeout'].includes(a.agent_status));
  const activeCount = activeAgents.length;
  
  let newStatus = task.status;

  // 1. If any agent failed and hasn't been replaced (Active < Target)
  if (activeCount < task.required_agents) {
    newStatus = 'delivery_reassigned';
  } 
  // 2. All-or-nothing forward transitions
  else if (activeCount === task.required_agents && activeCount > 0) {
    const allAccepted = activeAgents.every(a => ['accepted', 'picked_up', 'delivered'].includes(a.agent_status));
    const allPickedUp = activeAgents.every(a => ['picked_up', 'delivered'].includes(a.agent_status));
    const allDelivered = activeAgents.every(a => a.agent_status === 'delivered');

    if (allDelivered) {
      newStatus = 'completed';
    } else if (allPickedUp) {
      newStatus = 'picked_up';
    } else if (allAccepted) {
      newStatus = 'delivery_accepted';
    } else {
      newStatus = 'delivery_assigned';
    }
  }

  if (newStatus !== task.status) {
    await tx.tasks.update({
      where: { id: taskId },
      data: { 
        status: newStatus,
        updated_at: new Date(),
        ...(newStatus === 'completed' ? { completed_at: new Date(), all_delivered_at: new Date() } : {})
      }
    });
  }
  
  return newStatus;
};

/**
 * Internal: Get valid next statuses for an agent
 */
const getValidTransitions = (currentStatus) => {
  const transitions = {
    'pending': ['accepted', 'rejected', 'timeout'],
    'accepted': ['picked_up', 'rejected'],
    'picked_up': ['delivered', 'rejected'],
    'delivered': [],
    'rejected': [],
    'timeout': []
  };
  return transitions[currentStatus] || [];
};

/**
 * Admin: Get allowed status transitions for a specific agent
 */
export const getAgentNextStatuses = async (req, res, next) => {
  try {
    const { id, staff_id } = req.params;
    const agent = await prisma.task_agents.findFirst({
      where: { task_id: parseInt(id), staff_id: parseInt(staff_id) },
      orderBy: { slot_number: 'desc' }
    });

    if (!agent) throw new ApiError('Agent assignment not found', 404);

    const nextStatuses = getValidTransitions(agent.agent_status);
    return successResponse(res, nextStatuses, 'Next statuses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Force update agent status (Override)
 */
export const updateAgentStatusAdmin = async (req, res, next) => {
  try {
    const { id, staff_id } = req.params;
    const { status, notes } = req.body;
    const admin_id = req.user?.user_id;
    const taskId = parseInt(id);
    const staffId = parseInt(staff_id);

    // Permission Check
    const userPermissions = req.user?.permissions || [];
    const canUpdate = userPermissions.includes('tasks.update_status');
    const isDeliveryStaff = req.user?.role_key === 'delivery_staff';

    if (!canUpdate || isDeliveryStaff) {
      throw new ApiError('Unauthorized. You do not have permission to override status.', 403);
    }

    const agent = await prisma.task_agents.findFirst({
      where: { task_id: taskId, staff_id: staffId },
      orderBy: { slot_number: 'desc' }
    });

    if (!agent) throw new ApiError('Agent assignment not found', 404);

    // Validate Transition
    const allowed = getValidTransitions(agent.agent_status);
    if (!allowed.includes(status)) {
      throw new ApiError(`Invalid status transition from ${agent.agent_status} to ${status}`, 400);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Agent
      await tx.task_agents.update({
        where: { id: agent.id },
        data: { 
          agent_status: status,
          ...(status === 'accepted' ? { accepted_at: new Date() } : {}),
          ...(status === 'picked_up' ? { picked_up_at: new Date() } : {}),
          ...(status === 'delivered' ? { delivered_at: new Date() } : {})
        }
      });

      // 2. Update Staff Availability if needed
      if (status === 'accepted') {
        await tx.staff_current_status.updateMany({
          where: { staff_id: staffId },
          data: { availability: 'on_job', current_task_id: taskId }
        });
      } else if (status === 'delivered' || status === 'rejected' || status === 'timeout') {
        await tx.staff_current_status.updateMany({
          where: { staff_id: staffId },
          data: { availability: 'available', current_task_id: null }
        });
      }

      // 3. Timeline
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: status === 'accepted' ? 'staff_accepted' : status === 'picked_up' ? 'staff_picked_up' : status === 'delivered' ? 'staff_delivered' : 'staff_rejected',
          from_status: agent.agent_status,
          to_status: status === 'delivered' ? 'completed' : status, // Placeholder, syncTaskStatus will fix
          actor_id: admin_id,
          actor_type: 'admin',
          staff_id: staffId,
          notes: notes || `Admin override to ${status}`
        }
      });

      // 4. Sync Task Status
      await syncTaskStatus(taskId, tx);
    });

    return successResponse(res, null, `Agent status updated to ${status} successfully`);
  } catch (error) {
    next(error);
  }
};

