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
  const orders = await prisma.salesOrder.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get('/:id', async (req, res) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(order);
});

// POST /api/orders  { customerId, deliveryDate, notes, items: [{ productId, quantity, unitPrice }] }
router.post('/', async (req, res) => {
  const { customerId, deliveryDate, notes, items } = req.body;
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerId y al menos un item son requeridos' });
  }

  const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
  const folio = await nextFolio('PED', prisma.salesOrder);

  const order = await prisma.salesOrder.create({
    data: {
      folio,
      customerId: Number(customerId),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      notes,
      total,
      items: {
        create: items.map((it) => ({
          productId: Number(it.productId),
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      },
    },
    include: { items: { include: { product: true } }, customer: true },
  });

  res.status(201).json(order);
});

// POST /api/orders/:id/fulfill  { items: [{ salesOrderItemId, deliveredQty }] }
router.post('/:id/fulfill', async (req, res) => {
  const orderId = Number(req.params.id);
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un item a surtir' });
  }

  const order = await prisma.salesOrder.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  if (order.status === 'SURTIDO' || order.status === 'CANCELADO') {
    return res.status(400).json({ error: `El pedido ya está ${order.status.toLowerCase()}` });
  }

  for (const delivery of items) {
    const item = order.items.find((i) => i.id === Number(delivery.salesOrderItemId));
    if (!item) continue;
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    const pending = Number(item.quantity) - Number(item.deliveredQty);
    const qty = Math.min(Number(delivery.deliveredQty), pending);
    if (qty <= 0) continue;
    if (qty > Number(product.stock)) {
      return res.status(400).json({ error: `Stock insuficiente para ${product.name}` });
    }
  }

  const ops = [];
  for (const delivery of items) {
    const item = order.items.find((i) => i.id === Number(delivery.salesOrderItemId));
    if (!item) continue;
    const pending = Number(item.quantity) - Number(item.deliveredQty);
    const qty = Math.min(Number(delivery.deliveredQty), pending);
    if (qty <= 0) continue;

    ops.push(
      prisma.salesOrderItem.update({
        where: { id: item.id },
        data: { deliveredQty: { increment: qty } },
      })
    );
    ops.push(
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: qty } },
      })
    );
    ops.push(
      prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: 'SALIDA',
          quantity: qty,
          reason: `Surtido de pedido ${order.folio}`,
          reference: order.folio,
          userId: req.user.id,
        },
      })
    );
  }

  await prisma.$transaction(ops);

  const updatedItems = await prisma.salesOrderItem.findMany({ where: { salesOrderId: orderId } });
  const allDelivered = updatedItems.every((i) => Number(i.deliveredQty) >= Number(i.quantity));
  const anyDelivered = updatedItems.some((i) => Number(i.deliveredQty) > 0);
  const status = allDelivered ? 'SURTIDO' : anyDelivered ? 'SURTIDO_PARCIAL' : 'PENDIENTE';

  const updatedOrder = await prisma.salesOrder.update({
    where: { id: orderId },
    data: { status },
    include: { items: { include: { product: true } }, customer: true },
  });

  res.json(updatedOrder);
});

router.post('/:id/cancel', async (req, res) => {
  const order = await prisma.salesOrder.update({
    where: { id: Number(req.params.id) },
    data: { status: 'CANCELADO' },
  });
  res.json(order);
});

module.exports = router;
