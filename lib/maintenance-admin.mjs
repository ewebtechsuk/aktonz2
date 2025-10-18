import { listApexMaintenanceTasks } from './apex27-maintenance.mjs';

const SOON_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function enrichTask(task) {
  if (!task || typeof task !== 'object') {
    return null;
  }

  const now = Date.now();
  const dueTimestamp = Number.isFinite(task.dueTimestamp) ? task.dueTimestamp : null;
  const isClosed = task.statusCategory === 'closed';
  const overdue = Boolean(dueTimestamp && dueTimestamp < now && !isClosed);
  const dueSoon = Boolean(
    !overdue && dueTimestamp && dueTimestamp >= now && dueTimestamp - now <= SOON_THRESHOLD_MS && !isClosed,
  );

  return {
    ...task,
    overdue,
    dueSoon,
  };
}

export async function listMaintenanceTasksForAdmin() {
  const tasks = await listApexMaintenanceTasks();
  return tasks.map((task) => enrichTask(task)).filter(Boolean);
}
