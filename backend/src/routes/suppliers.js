const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  res.json(suppliers);
});

router.post('/', async (req, res) => {
  const { name, contactName, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name es requerido' });
  const supplier = await prisma.supplier.create({ data: { name, contactName, phone, email, address } });
  res.status(201).json(supplier);
});

router.put('/:id', async (req, res) => {
  const { name, contactName, phone, email, address } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id: Number(req.params.id) },
    data: { name, contactName, phone, email, address },
  });
  res.json(supplier);
});

router.delete('/:id', async (req, res) => {
  await prisma.supplier.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
