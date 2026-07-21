const prisma = require('../config/prisma');
const { ApiError } = require('../middleware/errorHandler');

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { dataSources: true, dashboards: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      throw new ApiError(400, 'You cannot change your own role or status here.');
    }

    const { role, isActive } = req.body;
    if (role && !['ADMIN', 'ANALYST', 'VIEWER'].includes(role)) {
      throw new ApiError(400, 'Invalid role.');
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.code === 'P2025') return next(new ApiError(404, 'User not found.'));
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      throw new ApiError(400, 'You cannot delete your own account here.');
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    if (err.code === 'P2025') return next(new ApiError(404, 'User not found.'));
    next(err);
  }
}

async function listAllDataSources(req, res, next) {
  try {
    const dataSources = await prisma.dataSource.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: dataSources });
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    const [
      userCount,
      dataSourceCount,
      dashboardCount,
      insightCount,
      savedQueryCount,
      usersByRole,
      dataSourcesByType,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.dataSource.count(),
      prisma.dashboard.count(),
      prisma.insight.count(),
      prisma.savedQuery.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.dataSource.groupBy({ by: ['type'], _count: true }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totals: { userCount, dataSourceCount, dashboardCount, insightCount, savedQueryCount },
        usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
        dataSourcesByType: dataSourcesByType.map((r) => ({ type: r.type, count: r._count })),
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, updateUser, deleteUser, listAllDataSources, stats };
