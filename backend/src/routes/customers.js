const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const customers = await prisma.customer.findMany({
    include: { priceList: true },
    orderBy: { name: 'asc' },
  });
  res.json(customers);
});

router.post('/', requireRole('VENTAS'), async (req, res) => {
  const { name, contactName, phone, email, address, priceListId } = req.body;
  if (!name) return res.status(400).json({ error: 'name es requerido' });
  const customer = await prisma.customer.create({
    data: { name, contactName, phone, email, address, priceListId: priceListId ? Number(priceListId) : null },
  });
  res.status(201).json(customer);
});

router.put('/:id', requireRole('VENTAS'), async (req, res) => {
  const { name, contactName, phone, email, address, priceListId } = req.body;
  const customer = await prisma.customer.update({
    where: { id: Number(req.params.id) },
    data: { name, contactName, phone, email, address, priceListId: priceListId ? Number(priceListId) : null },
  });
  res.json(customer);
});

router.delete('/:id', requireRole('VENTAS'), async (req, res) => {
  await prisma.customer.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
