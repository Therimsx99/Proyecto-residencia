const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function nextFolio(prefix, model) {
  const count = await model.count();
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  const orders = await prisma.purchaseOrder.findMany({
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get('/:id', async (req, res) => {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: { supplier: true, items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ error: 'Orden de compra no encontrada' });
  res.json(order);
});

// POST /api/purchases  { supplierId, expectedDate, notes, items: [{ productId, quantity, unitCost }] }
router.post('/', async (req, res) => {
  const { supplierId, expectedDate, notes, items } = req.body;
  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'supplierId y al menos un item son requeridos' });
  }

  const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitCost), 0);
  const folio = await nextFolio('OC', prisma.purchaseOrder);

  const order = await prisma.purchaseOrder.create({
    data: {
      folio,
      supplierId: Number(supplierId),
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes,
      total,
      items: {
        create: items.map((it) => ({
          productId: Number(it.productId),
          quantity: it.quantity,
          unitCost: it.unitCost,
        })),
      },
    },
    include: { items: { include: { product: true } }, supplier: true },
  });

  res.status(201).json(order);
});

// POST /api/purchases/:id/receive  { items: [{ purchaseOrderItemId, receivedQty }] }
router.post('/:id/receive', async (req, res) => {
  const orderId = Number(req.params.id);
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un item recibido' });
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ error: 'Orden de compra no encontrada' });
  if (order.status === 'RECIBIDA' || order.status === 'CANCELADA') {
    return res.status(400).json({ error: `La orden ya está ${order.status.toLowerCase()}` });
  }

  const ops = [];
  for (const receipt of items) {
    const item = order.items.find((i) => i.id === Number(receipt.purchaseOrderItemId));
    if (!item) continue;
    const qty = Number(receipt.receivedQty);
    if (qty <= 0) continue;

    ops.push(
      prisma.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQty: { increment: qty } },
      })
    );
    ops.push(
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: qty } },
      })
    );
    ops.push(
      prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'ENTRADA',
          quantity: qty,
          reason: `Recepción de compra ${order.folio}`,
          reference: order.folio,
          userId: req.user.id,
        },
      })
    );
  }

  await prisma.$transaction(ops);

  const updatedItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: orderId } });
  const allReceived = updatedItems.every((i) => Number(i.receivedQty) >= Number(i.quantity));
  const anyReceived = updatedItems.some((i) => Number(i.receivedQty) > 0);
  const status = allReceived ? 'RECIBIDA' : anyReceived ? 'PARCIAL' : 'PENDIENTE';

  const updatedOrder = await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status },
    include: { items: { include: { product: true } }, supplier: true },
  });

  res.json(updatedOrder);
});

router.post('/:id/cancel', async (req, res) => {
  const order = await prisma.purchaseOrder.update({
    where: { id: Number(req.params.id) },
    data: { status: 'CANCELADA' },
  });
  res.json(order);
});

module.exports = router;
