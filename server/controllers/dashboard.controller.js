const prisma = require('../config/prisma');
const { ApiError } = require('../middleware/errorHandler');
const dataSourceService = require('../services/dataSource.service');

async function findOwnedDashboard(id, ownerId, includeWidgets = false) {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id },
    include: includeWidgets ? { widgets: true } : undefined,
  });
  if (!dashboard || dashboard.ownerId !== ownerId) {
    throw new ApiError(404, 'Dashboard not found.');
  }
  return dashboard;
}

async function create(req, res, next) {
  try {
    const { name, description } = req.body;
    const dashboard = await prisma.dashboard.create({
      data: { name, description: description || null, ownerId: req.user.id },
    });
    res.status(201).json({ success: true, data: dashboard });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const dashboards = await prisma.dashboard.findMany({
      where: { ownerId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { widgets: true } } },
    });
    res.json({ success: true, data: dashboards });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const dashboard = await findOwnedDashboard(req.params.id, req.user.id, true);
    res.json({ success: true, data: dashboard });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    await findOwnedDashboard(req.params.id, req.user.id);
    const { name, description } = req.body;
    const updated = await prisma.dashboard.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await findOwnedDashboard(req.params.id, req.user.id);
    await prisma.dashboard.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Dashboard deleted.' });
  } catch (err) {
    next(err);
  }
}

async function addWidget(req, res, next) {
  try {
    const dashboard = await findOwnedDashboard(req.params.id, req.user.id);
    const { title, type, config, position } = req.body;

    const dataSource = await prisma.dataSource.findUnique({ where: { id: config.dataSourceId } });
    if (!dataSource || dataSource.ownerId !== req.user.id) {
      throw new ApiError(404, 'Data source not found.');
    }
    dataSourceService.assertReadOnlyQuery(config.sql);

    const widget = await prisma.widget.create({
      data: {
        title,
        type,
        config,
        position: position || { x: 0, y: 0, w: 4, h: 4 },
        dashboardId: dashboard.id,
        savedQueryId: config.savedQueryId || null,
      },
    });
    res.status(201).json({ success: true, data: widget });
  } catch (err) {
    next(err);
  }
}

async function updateWidget(req, res, next) {
  try {
    const dashboard = await findOwnedDashboard(req.params.id, req.user.id);
    const widget = await prisma.widget.findUnique({ where: { id: req.params.widgetId } });
    if (!widget || widget.dashboardId !== dashboard.id) {
      throw new ApiError(404, 'Widget not found.');
    }

    const { title, type, config, position } = req.body;
    if (config?.sql) {
      dataSourceService.assertReadOnlyQuery(config.sql);
    }

    const updated = await prisma.widget.update({
      where: { id: widget.id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(config !== undefined && { config }),
        ...(position !== undefined && { position }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function bulkUpdateLayout(req, res, next) {
  try {
    const dashboard = await findOwnedDashboard(req.params.id, req.user.id, true);
    const { widgets } = req.body; // [{ id, position }]

    const ownedIds = new Set(dashboard.widgets.map((w) => w.id));
    const updates = widgets.filter((w) => ownedIds.has(w.id));

    await prisma.$transaction(
      updates.map((w) =>
        prisma.widget.update({ where: { id: w.id }, data: { position: w.position } })
      )
    );

    res.json({ success: true, message: 'Layout saved.' });
  } catch (err) {
    next(err);
  }
}

async function removeWidget(req, res, next) {
  try {
    const dashboard = await findOwnedDashboard(req.params.id, req.user.id);
    const widget = await prisma.widget.findUnique({ where: { id: req.params.widgetId } });
    if (!widget || widget.dashboardId !== dashboard.id) {
      throw new ApiError(404, 'Widget not found.');
    }
    await prisma.widget.delete({ where: { id: widget.id } });
    res.json({ success: true, message: 'Widget removed.' });
  } catch (err) {
    next(err);
  }
}

async function getWidgetData(req, res, next) {
  try {
    const dashboard = await findOwnedDashboard(req.params.id, req.user.id);
    const widget = await prisma.widget.findUnique({ where: { id: req.params.widgetId } });
    if (!widget || widget.dashboardId !== dashboard.id) {
      throw new ApiError(404, 'Widget not found.');
    }

    const dataSource = await prisma.dataSource.findUnique({ where: { id: widget.config.dataSourceId } });
    if (!dataSource || dataSource.ownerId !== req.user.id) {
      throw new ApiError(404, 'Data source not found.');
    }

    const result = await dataSourceService.runQuery(dataSource, widget.config.sql);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list,
  getOne,
  update,
  remove,
  addWidget,
  updateWidget,
  bulkUpdateLayout,
  removeWidget,
  getWidgetData,
};
