import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import { sendNotification } from '../utils/notification.utils.js';
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
        asset_type: 'Trolley', // Defaulting based on example
        asset_type_notes: specify,
        scheduled_at: date_time ? new Date(date_time) : null,
        transfer_purpose: purpose_of_transfer,
        remarks,
        required_agents: 1,
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
        { patient_mrd: { contains: search } }
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
              select: { id: true, name: true, employee_id: true }
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
        pickup_location_id: updateData.pickup_location_id,
        destination_location_id: updateData.destination_location_id,
        asset_type_notes: updateData.specify,
        transfer_purpose: updateData.purpose_of_transfer,
        remarks: updateData.remarks,
        status: updateData.status,
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
 * Delete (Cancel) task
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

/**
 * Unified Assign/Reassign Agents to Task
 */
export const updateTaskAgents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agents } = req.body; // Array of { staff_id, agent_label, slot_number }
    const actor_id = req.user?.user_id;

    const taskId = parseInt(id);
    const task = await prisma.tasks.findUnique({ 
      where: { id: taskId },
      include: { task_agents: true }
    });
    if (!task) throw new ApiError('Task not found', 404);

    const existingAgentIds = task.task_agents.map(a => a.staff_id);
    const newAgentIds = agents.map(a => a.staff_id);

    // 1. Identify removals
    const removedStaffIds = existingAgentIds.filter(sid => !newAgentIds.includes(sid));

    await prisma.$transaction(async (tx) => {
      // Handle Removals
      if (removedStaffIds.length > 0) {
        await tx.task_agents.deleteMany({
          where: { task_id: taskId, staff_id: { in: removedStaffIds } }
        });

        // Log removal in timeline
        for (const sid of removedStaffIds) {
          await tx.task_timeline.create({
            data: {
              task_id: taskId,
              event_type: 'staff_removed',
              from_status: task.status,
              to_status: task.status,
              actor_id,
              actor_type: 'admin',
              staff_id: sid
            }
          });
        }
      }

      // Handle Assignments (Add/Update)
      for (const agent of agents) {
        // Upsert Task Agent
        await tx.task_agents.upsert({
          where: { task_id_slot_number: { task_id: taskId, slot_number: agent.slot_number } },
          create: {
            task_id: taskId,
            staff_id: agent.staff_id,
            agent_label: agent.agent_label,
            slot_number: agent.slot_number,
            assigned_by: actor_id,
            agent_status: 'pending'
          },
          update: {
            staff_id: agent.staff_id,
            agent_label: agent.agent_label,
            assigned_by: actor_id,
            agent_status: 'pending'
          }
        });

        // Record History
        await tx.task_assignment_history.create({
          data: {
            task_id: taskId,
            staff_id: agent.staff_id,
            slot_number: agent.slot_number,
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
          body: `You have been assigned to Task ${task.task_number}. Please accept within 60 seconds.`
        }, tx);

        // Trigger 60s timeout timer
        setTimeout(() => handleAssignmentTimeout(taskId, agent.staff_id, actor_id), 60000);
      }

      // Update Task Status
      await tx.tasks.update({
        where: { id: taskId },
        data: { status: 'delivery_assigned', updated_at: new Date() }
      });
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

    // If still pending after 60s
    if (agent) {
      await prisma.$transaction(async (tx) => {
        // 1. Remove from task_agents
        await tx.task_agents.deleteMany({
          where: { task_id: taskId, staff_id }
        });

        // 2. Mark as timeout in history
        await tx.task_assignment_history.updateMany({
          where: { task_id: taskId, staff_id, response: 'pending' },
          data: {
            response: 'timeout',
            response_at: new Date()
          }
        });

        // 3. Check for reassigning status
        const activeAgents = await tx.task_agents.count({
          where: { task_id: taskId, agent_status: { in: ['accepted', 'picked_up'] } }
        });

        if (activeAgents === 0) {
          await tx.tasks.update({
            where: { id: taskId },
            data: { status: 'reassigning', updated_at: new Date() }
          });
        }

        // 4. Timeline
        await tx.task_timeline.create({
          data: {
            task_id: taskId,
            event_type: 'staff_timeout',
            from_status: 'delivery_assigned',
            to_status: activeAgents === 0 ? 'reassigning' : 'delivery_assigned',
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
          body: `Staff member (ID: ${staff_id}) failed to accept task ${taskDetails?.task_number} within 60s.`
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
    const userPermissions = req.user?.permissions || [];
    const isAdmin = userPermissions.includes('tasks.update_status');

    // Ownership/Permission Check
    if (!isAdmin) {
      const isAssigned = await prisma.task_agents.findFirst({
        where: { task_id: taskId, staff_id: staff_id }
      });
      if (!isAssigned) {
        throw new ApiError('Unauthorized. This task is not assigned to you.', 403);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Agent Status
      await tx.task_agents.updateMany({
        where: { task_id: taskId, staff_id, agent_status: 'pending' },
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

      // 3. Update Task Status (if not already accepted/higher)
      const task = await tx.tasks.findUnique({ where: { id: taskId } });
      if (task.status === 'delivery_assigned' || task.status === 'reassigning') {
        await tx.tasks.update({
          where: { id: taskId },
          data: { 
            status: 'delivery_accepted', 
            first_accepted_at: task.first_accepted_at || new Date(),
            updated_at: new Date() 
          }
        });
      }

      // 4. Timeline
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_accepted',
          from_status: task.status,
          to_status: 'delivery_accepted',
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id
        }
      });
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
    const userPermissions = req.user?.permissions || [];
    const isAdmin = userPermissions.includes('tasks.update_status');

    // Ownership/Permission Check
    if (!isAdmin) {
      const isAssigned = await prisma.task_agents.findFirst({
        where: { task_id: taskId, staff_id: staff_id }
      });
      if (!isAssigned) {
        throw new ApiError('Unauthorized. This task is not assigned to you.', 403);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Agent Status
      await tx.task_agents.updateMany({
        where: { task_id: taskId, staff_id },
        data: { 
          agent_status: 'picked_up',
          picked_up_at: new Date()
        }
      });

      // 2. Update Task Status
      const task = await tx.tasks.findUnique({ where: { id: taskId } });
      await tx.tasks.update({
        where: { id: taskId },
        data: { 
          status: 'picked_up', 
          first_picked_up_at: task.first_picked_up_at || new Date(),
          updated_at: new Date() 
        }
      });

      // 3. Timeline
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_picked_up',
          from_status: task.status,
          to_status: 'picked_up',
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id
        }
      });
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
    const userPermissions = req.user?.permissions || [];
    const isAdmin = userPermissions.includes('tasks.update_status');

    // Ownership/Permission Check
    if (!isAdmin) {
      const isAssigned = await prisma.task_agents.findFirst({
        where: { task_id: taskId, staff_id: staff_id }
      });
      if (!isAssigned) {
        throw new ApiError('Unauthorized. This task is not assigned to you.', 403);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Agent Status
      await tx.task_agents.updateMany({
        where: { task_id: taskId, staff_id },
        data: { 
          agent_status: 'delivered',
          delivered_at: new Date()
        }
      });

      // 2. Check if all agents completed (optional logic, usually task completes when last agent delivers)
      const pendingAgents = await tx.task_agents.count({
        where: { task_id: taskId, agent_status: { not: 'delivered' } }
      });

      if (pendingAgents === 0) {
        const taskDetails = await tx.tasks.findUnique({ where: { id: taskId } });
        await sendNotification({
          user_id: taskDetails.created_by,
          task_id: taskId,
          type: 'task_completed',
          title: 'Task Completed',
          body: `Task ${taskDetails.task_number} has been successfully completed.`
        }, tx);

        await tx.tasks.update({
          where: { id: taskId },
          data: { 
            status: 'completed', 
            all_delivered_at: new Date(),
            completed_at: new Date(),
            updated_at: new Date() 
          }
        });
      }

      // 3. Free Staff
      await tx.staff_current_status.updateMany({
        where: { staff_id },
        data: { 
          availability: 'available',
          current_task_id: null,
          updated_at: new Date()
        }
      });

      // 4. Increment total_jobs for the staff's current shift
      const today = new Date().toISOString().split('T')[0];
      await tx.staff_shifts.updateMany({
        where: { staff_id, shift_date: new Date(today), is_complete: false },
        data: { total_jobs: { increment: 1 } }
      });

      // 5. Timeline
      const task = await tx.tasks.findUnique({ where: { id: taskId } });
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_delivered',
          from_status: task.status,
          to_status: pendingAgents === 0 ? 'completed' : task.status,
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id
        }
      });
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
    const userPermissions = req.user?.permissions || [];
    const isAdmin = userPermissions.includes('tasks.update_status');

    // 1. Ownership/Permission Check
    if (!isAdmin) {
      const isAssigned = await prisma.task_agents.findFirst({
        where: { task_id: taskId, staff_id: staff_id }
      });
      if (!isAssigned) {
        throw new ApiError('Unauthorized. This task is not assigned to you.', 403);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark as rejected in task_agents
      await tx.task_agents.updateMany({
        where: { task_id: taskId, staff_id },
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

      // 3. Check for reassigning status
      const activeAgents = await tx.task_agents.count({
        where: { task_id: taskId, agent_status: { in: ['accepted', 'picked_up'] } }
      });

      if (activeAgents === 0) {
        await tx.tasks.update({
          where: { id: taskId },
          data: { status: 'reassigning', updated_at: new Date() }
        });
      }

      // 4. Timeline
      await tx.task_timeline.create({
        data: {
          task_id: taskId,
          event_type: 'staff_rejected',
          from_status: 'delivery_assigned',
          to_status: activeAgents === 0 ? 'reassigning' : 'delivery_assigned',
          actor_id: staff_id,
          actor_type: 'delivery_staff',
          staff_id,
          rejection_reason_id
        }
      });

      // 5. Notify Admin
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
          body: `Staff member rejected task ${taskId}. Reason: ${rejection_notes || 'Not specified'}`
        }, tx);
      }
    });

    return successResponse(res, null, 'Task rejected successfully');
  } catch (error) {
    next(error);
  }
};

