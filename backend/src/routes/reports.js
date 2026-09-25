const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function dateRange(query) {
  const to = query.to ? new Date(`${query.to}T23:59:59.999`) : new Date();
  const from = query.from ? new Date(`${query.from}T00:00:00`) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

router.get('/sales', async (req, res) => {
  const { from, to } = dateRange(req.query);

  const orders = await prisma.salesOrder.findMany({
    where: { orderDate: { gte: from, lte: to }, status: { not: 'CANCELADO' } },
    include: { items: { include: { product: true } } },
  });

  const byDayMap = new Map();
  const byProductMap = new Map();

  for (const order of orders) {
    const key = dayKey(order.orderDate);
    byDayMap.set(key, (byDayMap.get(key) || 0) + Number(order.total));

    for (const item of order.items) {
      const prev = byProductMap.get(item.productId) || { name: item.product.name, qty: 0, total: 0 };
      prev.qty += Number(item.quantity);
      prev.total += Number(item.quantity) * Number(item.unitPrice);
      byProductMap.set(item.productId, prev);
    }
  }

  const byDay = [...byDayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }));
  const byProduct = [...byProductMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

  res.json({ from, to, orderCount: orders.length, totalRevenue, byDay, topProducts: byProduct });
});

router.get('/purchases', async (req, res) => {
  const { from, to } = dateRange(req.query);

  const orders = await prisma.purchaseOrder.findMany({
    where: { orderDate: { gte: from, lte: to }, status: { not: 'CANCELADA' } },
    include: { items: { include: { product: true } }, supplier: true },
  });

  const byDayMap = new Map();
  const bySupplierMap = new Map();

  for (const order of orders) {
    const key = dayKey(order.orderDate);
    byDayMap.set(key, (byDayMap.get(key) || 0) + Number(order.total));

    const prev = bySupplierMap.get(order.supplierId) || { name: order.supplier.name, total: 0, orders: 0 };
    prev.total += Number(order.total);
    prev.orders += 1;
    bySupplierMap.set(order.supplierId, prev);
  }

  const byDay = [...byDayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }));
  const bySupplier = [...bySupplierMap.values()].sort((a, b) => b.total - a.total);
  const totalSpend = orders.reduce((sum, o) => sum + Number(o.total), 0);

  res.json({ from, to, orderCount: orders.length, totalSpend, byDay, bySupplier });
});

router.get('/inventory', async (req, res) => {
  const products = await prisma.product.findMany({ where: { active: true } });
  const stocks = await prisma.productStock.findMany({ include: { warehouse: true } });

  const stockByProduct = new Map();
  for (const s of stocks) {
    stockByProduct.set(s.productId, (stockByProduct.get(s.productId) || 0) + Number(s.quantity));
  }

  const byCategoryMap = new Map();
  let totalValue = 0;
  let lowStockCount = 0;

  for (const p of products) {
    const stock = stockByProduct.get(p.id) || 0;
    const value = stock * Number(p.unitCost);
    totalValue += value;
    if (stock <= Number(p.minStock)) lowStockCount += 1;
    byCategoryMap.set(p.category, (byCategoryMap.get(p.category) || 0) + value);
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  const byWarehouseMap = new Map();
  for (const s of stocks) {
    const prev = byWarehouseMap.get(s.warehouseId) || { name: s.warehouse.name, units: 0 };
    prev.units += Number(s.quantity);
    byWarehouseMap.set(s.warehouseId, prev);
  }
  const byWarehouse = [...byWarehouseMap.values()];

  const movements = await prisma.inventoryMovement.findMany({
    where: { type: 'SALIDA', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    include: { product: true },
  });
  const rotationMap = new Map();
  for (const m of movements) {
    const prev = rotationMap.get(m.productId) || { name: m.product.name, qty: 0 };
    prev.qty += Number(m.quantity);
    rotationMap.set(m.productId, prev);
  }
  const topMoving = [...rotationMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  res.json({ totalValue, lowStockCount, byCategory, byWarehouse, topMoving });
});

module.exports = router;
