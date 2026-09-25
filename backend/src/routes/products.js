const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/products?search=&category=&lowStock=true
router.get('/', async (req, res) => {
  const { search, category, lowStock } = req.query;

  const where = {
    active: true,
    ...(search && {
      OR: [
        { name: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } },
      ],
    }),
    ...(category && { category: String(category) }),
  };

  const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });

  const filtered =
    lowStock === 'true' ? products.filter((p) => Number(p.stock) <= Number(p.minStock)) : products;

  res.json(filtered);
});

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(product);
});

router.post('/', async (req, res) => {
  const { sku, name, description, category, unit, minStock, unitCost, unitPrice, location } = req.body;
  if (!sku || !name || !category) {
    return res.status(400).json({ error: 'sku, name y category son requeridos' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        category,
        unit: unit || 'pieza',
        minStock: minStock ?? 0,
        unitCost: unitCost ?? 0,
        unitPrice: unitPrice ?? 0,
        location,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un producto con ese SKU' });
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { name, description, category, unit, minStock, unitCost, unitPrice, location, active } = req.body;
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: { name, description, category, unit, minStock, unitCost, unitPrice, location, active },
  });
  res.json(product);
});

router.delete('/:id', async (req, res) => {
  await prisma.product.update({ where: { id: Number(req.params.id) }, data: { active: false } });
  res.status(204).send();
});

// POST /api/products/:id/movements  { type: 'ENTRADA'|'SALIDA'|'AJUSTE', quantity, reason, reference }
router.post('/:id/movements', async (req, res) => {
  const productId = Number(req.params.id);
  const { type, quantity, reason, reference } = req.body;

  if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de movimiento inválido' });
  }
  if (!quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  let newStock = Number(product.stock);
  if (type === 'ENTRADA' || type === 'AJUSTE') newStock += Number(quantity);
  if (type === 'SALIDA') {
    if (Number(quantity) > newStock) {
      return res.status(400).json({ error: 'Stock insuficiente para esta salida' });
    }
    newStock -= Number(quantity);
  }

  const [movement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: {
        productId,
        type,
        quantity,
        reason: reason || '',
        reference,
        userId: req.user.id,
      },
    }),
    prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
  ]);

  res.status(201).json(movement);
});

router.get('/:id/movements', async (req, res) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId: Number(req.params.id) },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(movements);
});

module.exports = router;
