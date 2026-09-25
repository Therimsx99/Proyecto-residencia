const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const [products, suppliers, customers, purchaseOrders, salesOrders] = await Promise.all([
    prisma.product.findMany({ where: { active: true } }),
    prisma.supplier.count(),
    prisma.customer.count(),
    prisma.purchaseOrder.findMany({ where: { status: { in: ['PENDIENTE', 'PARCIAL'] } } }),
    prisma.salesOrder.findMany({ where: { status: { in: ['PENDIENTE', 'SURTIDO_PARCIAL'] } } }),
  ]);

  const lowStock = products.filter((p) => Number(p.stock) <= Number(p.minStock));
  const inventoryValue = products.reduce((sum, p) => sum + Number(p.stock) * Number(p.unitCost), 0);

  res.json({
    totalProducts: products.length,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock.slice(0, 10),
    inventoryValue,
    totalSuppliers: suppliers,
    totalCustomers: customers,
    openPurchaseOrders: purchaseOrders.length,
    openSalesOrders: salesOrders.length,
  });
});

module.exports = router;
