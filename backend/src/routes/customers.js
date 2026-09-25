const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
  res.json(customers);
});

router.post('/', async (req, res) => {
  const { name, contactName, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name es requerido' });
  const customer = await prisma.customer.create({ data: { name, contactName, phone, email, address } });
  res.status(201).json(customer);
});

router.put('/:id', async (req, res) => {
  const { name, contactName, phone, email, address } = req.body;
  const customer = await prisma.customer.update({
    where: { id: Number(req.params.id) },
    data: { name, contactName, phone, email, address },
  });
  res.json(customer);
});

router.delete('/:id', async (req, res) => {
  await prisma.customer.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
