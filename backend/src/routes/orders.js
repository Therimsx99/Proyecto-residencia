const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { applyMovement } = require('../lib/stock');

const router = express.Router();
router.use(requireAuth);

async function nextFolio(prefix, model) {
  const count = await model.count();
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  const orders = await prisma.salesOrder.findMany({
    include: { customer: true, warehouse: true, items: { include: { product: true } }, quote: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get('/:id', async (req, res) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true, warehouse: true, items: { include: { product: true } }, quote: true },
  });
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(order);
});

// POST /api/orders  { customerId, warehouseId, deliveryDate, notes, quoteId?, items: [{ productId, quantity, unitPrice }] }
router.post('/', requireRole('VENTAS'), async (req, res) => {
  const { customerId, warehouseId, deliveryDate, notes, quoteId, items } = req.body;
  if (!customerId || !warehouseId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerId, warehouseId y al menos un item son requeridos' });
  }

  if (quoteId) {
    const quote = await prisma.salesQuote.findUnique({ where: { id: Number(quoteId) } });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (quote.status === 'CONVERTIDA') return res.status(400).json({ error: 'Esa cotización ya fue convertida a pedido' });
  }

  const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
  const folio = await nextFolio('PED', prisma.salesOrder);

  const order = await prisma.salesOrder.create({
    data: {
      folio,
      customerId: Number(customerId),
      warehouseId: Number(warehouseId),
      quoteId: quoteId ? Number(quoteId) : null,
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
    include: { items: { include: { product: true } }, customer: true, warehouse: true },
  });

  if (quoteId) {
    await prisma.salesQuote.update({ where: { id: Number(quoteId) }, data: { status: 'CONVERTIDA' } });
  }

  res.status(201).json(order);
});

// POST /api/orders/:id/fulfill  { items: [{ salesOrderItemId, deliveredQty }] }
router.post('/:id/fulfill', requireRole('VENTAS', 'ALMACEN'), async (req, res) => {
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

  try {
    await prisma.$transaction(async (tx) => {
      for (const delivery of items) {
        const item = order.items.find((i) => i.id === Number(delivery.salesOrderItemId));
        if (!item) continue;
        const pending = Number(item.quantity) - Number(item.deliveredQty);
        const qty = Math.min(Number(delivery.deliveredQty), pending);
        if (qty <= 0) continue;

        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: { deliveredQty: { increment: qty } },
        });

        await applyMovement(tx, {
          productId: item.productId,
          warehouseId: order.warehouseId,
          type: 'SALIDA',
          quantity: qty,
          reason: `Surtido de pedido ${order.folio}`,
          reference: order.folio,
          userId: req.user.id,
        });
      }
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const updatedItems = await prisma.salesOrderItem.findMany({ where: { salesOrderId: orderId } });
  const allDelivered = updatedItems.every((i) => Number(i.deliveredQty) >= Number(i.quantity));
  const anyDelivered = updatedItems.some((i) => Number(i.deliveredQty) > 0);
  const status = allDelivered ? 'SURTIDO' : anyDelivered ? 'SURTIDO_PARCIAL' : 'PENDIENTE';

  const updatedOrder = await prisma.salesOrder.update({
    where: { id: orderId },
    data: { status },
    include: { items: { include: { product: true } }, customer: true, warehouse: true },
  });

  res.json(updatedOrder);
});

router.post('/:id/cancel', requireRole('VENTAS'), async (req, res) => {
  const order = await prisma.salesOrder.update({
    where: { id: Number(req.params.id) },
    data: { status: 'CANCELADO' },
  });
  res.json(order);
});

module.exports = router;
