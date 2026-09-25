const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  res.json(warehouses);
});

router.post('/', requireRole('ALMACEN'), async (req, res) => {
  const { code, name, address } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code y name son requeridos' });
  try {
    const warehouse = await prisma.warehouse.create({ data: { code, name, address } });
    res.status(201).json(warehouse);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ya existe un almacén con ese código' });
    throw err;
  }
});

router.put('/:id', requireRole('ALMACEN'), async (req, res) => {
  const { name, address, active } = req.body;
  const warehouse = await prisma.warehouse.update({
    where: { id: Number(req.params.id) },
    data: { name, address, active },
  });
  res.json(warehouse);
});

module.exports = router;
