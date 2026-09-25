const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

async function nextFolio(prefix, model) {
  const count = await model.count();
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/', async (req, res) => {
  const quotes = await prisma.salesQuote.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(quotes);
});

router.get('/:id', async (req, res) => {
  const quote = await prisma.salesQuote.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(quote);
});

// POST /api/quotes  { customerId, validUntil, notes, items: [{ productId, quantity, unitPrice }] }
router.post('/', requireRole('VENTAS'), async (req, res) => {
  const { customerId, validUntil, notes, items } = req.body;
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerId y al menos un item son requeridos' });
  }

  const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
  const folio = await nextFolio('COT', prisma.salesQuote);

  const quote = await prisma.salesQuote.create({
    data: {
      folio,
      customerId: Number(customerId),
      validUntil: validUntil ? new Date(validUntil) : null,
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

  res.status(201).json(quote);
});

router.post('/:id/send', requireRole('VENTAS'), async (req, res) => {
  const quote = await prisma.salesQuote.update({ where: { id: Number(req.params.id) }, data: { status: 'ENVIADA' } });
  res.json(quote);
});

router.post('/:id/accept', requireRole('VENTAS'), async (req, res) => {
  const quote = await prisma.salesQuote.update({ where: { id: Number(req.params.id) }, data: { status: 'ACEPTADA' } });
  res.json(quote);
});

router.post('/:id/reject', requireRole('VENTAS'), async (req, res) => {
  const quote = await prisma.salesQuote.update({ where: { id: Number(req.params.id) }, data: { status: 'RECHAZADA' } });
  res.json(quote);
});

module.exports = router;
