const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const priceLists = await prisma.priceList.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(priceLists);
});

router.post('/', requireRole('VENTAS'), async (req, res) => {
  const { name, isDefault } = req.body;
  if (!name) return res.status(400).json({ error: 'name es requerido' });
  const priceList = await prisma.priceList.create({ data: { name, isDefault: !!isDefault } });
  res.status(201).json(priceList);
});

// PUT /api/price-lists/:id/items  { items: [{ productId, price }] }
router.put('/:id/items', requireRole('VENTAS'), async (req, res) => {
  const priceListId = Number(req.params.id);
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items debe ser un arreglo' });

  await prisma.$transaction(
    items.map((it) =>
      prisma.priceListItem.upsert({
        where: { priceListId_productId: { priceListId, productId: Number(it.productId) } },
        update: { price: it.price },
        create: { priceListId, productId: Number(it.productId), price: it.price },
      })
    )
  );

  const priceList = await prisma.priceList.findUnique({
    where: { id: priceListId },
    include: { items: { include: { product: true } } },
  });
  res.json(priceList);
});

router.delete('/:id', requireRole('VENTAS'), async (req, res) => {
  await prisma.priceList.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
