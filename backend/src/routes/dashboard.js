const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const [products, stocks, suppliers, customers, purchaseOrders, salesOrders, warehouses, openQuotes] = await Promise.all([
    prisma.product.findMany({ where: { active: true } }),
    prisma.productStock.findMany(),
    prisma.supplier.count(),
    prisma.customer.count(),
    prisma.purchaseOrder.findMany({ where: { status: { in: ['PENDIENTE', 'PARCIAL'] } } }),
    prisma.salesOrder.findMany({ where: { status: { in: ['PENDIENTE', 'SURTIDO_PARCIAL'] } } }),
    prisma.warehouse.count(),
    prisma.salesQuote.count({ where: { status: { in: ['BORRADOR', 'ENVIADA'] } } }),
  ]);

  const stockByProduct = new Map();
  for (const s of stocks) {
    stockByProduct.set(s.productId, (stockByProduct.get(s.productId) || 0) + Number(s.quantity));
  }

  const withStock = products.map((p) => ({ ...p, stock: stockByProduct.get(p.id) || 0 }));
  const lowStock = withStock.filter((p) => p.stock <= Number(p.minStock));
  const inventoryValue = withStock.reduce((sum, p) => sum + p.stock * Number(p.unitCost), 0);

  res.json({
    totalProducts: products.length,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock.slice(0, 10),
    inventoryValue,
    totalSuppliers: suppliers,
    totalCustomers: customers,
    totalWarehouses: warehouses,
    openPurchaseOrders: purchaseOrders.length,
    openSalesOrders: salesOrders.length,
    openQuotes,
  });
});

module.exports = router;
