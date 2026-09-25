const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { applyMovement, stockByWarehouse } = require('../lib/stock');

const router = express.Router();
router.use(requireAuth);

async function withStock(product) {
  const stocks = await stockByWarehouse(product.id);
  const stock = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
  return { ...product, stock, stocks };
}

// GET /api/products?search=&category=&lowStock=true&warehouseId=
router.get('/', async (req, res) => {
  const { search, category, lowStock, warehouseId } = req.query;

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
  const productIds = products.map((p) => p.id);
  const stockRows = await prisma.productStock.findMany({
    where: { productId: { in: productIds }, ...(warehouseId && { warehouseId: Number(warehouseId) }) },
  });

  const enriched = products.map((p) => {
    const rows = stockRows.filter((s) => s.productId === p.id);
    const stock = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
    return { ...p, stock };
  });

  const filtered = lowStock === 'true' ? enriched.filter((p) => p.stock <= Number(p.minStock)) : enriched;

  res.json(filtered);
});

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(await withStock(product));
});

router.post('/', requireRole('ALMACEN'), async (req, res) => {
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
    res.status(201).json({ ...product, stock: 0 });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un producto con ese SKU' });
    }
    throw err;
  }
});

router.put('/:id', requireRole('ALMACEN'), async (req, res) => {
  const { name, description, category, unit, minStock, unitCost, unitPrice, location, active } = req.body;
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: { name, description, category, unit, minStock, unitCost, unitPrice, location, active },
  });
  res.json(await withStock(product));
});

router.delete('/:id', requireRole('ALMACEN'), async (req, res) => {
  await prisma.product.update({ where: { id: Number(req.params.id) }, data: { active: false } });
  res.status(204).send();
});

// POST /api/products/:id/movements  { warehouseId, toWarehouseId?, type, quantity, reason, reference }
router.post('/:id/movements', requireRole('ALMACEN'), async (req, res) => {
  const productId = Number(req.params.id);
  const { warehouseId, toWarehouseId, type, quantity, reason, reference } = req.body;

  if (!['ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de movimiento inválido' });
  }
  if (!warehouseId) return res.status(400).json({ error: 'warehouseId es requerido' });
  if (type === 'TRANSFERENCIA' && (!toWarehouseId || Number(toWarehouseId) === Number(warehouseId))) {
    return res.status(400).json({ error: 'Selecciona un almacén destino distinto al origen' });
  }
  if (!quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

  try {
    const movement = await prisma.$transaction((tx) =>
      applyMovement(tx, {
        productId,
        warehouseId: Number(warehouseId),
        toWarehouseId: toWarehouseId ? Number(toWarehouseId) : undefined,
        type,
        quantity: Number(quantity),
        reason: reason || '',
        reference,
        userId: req.user.id,
      })
    );
    res.status(201).json(movement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/products/:id/movements — kardex
router.get('/:id/movements', async (req, res) => {
  const { warehouseId, from, to } = req.query;
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      productId: Number(req.params.id),
      ...(warehouseId && { warehouseId: Number(warehouseId) }),
      ...(from || to
        ? { createdAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } }
        : {}),
    },
    include: { user: { select: { name: true } }, warehouse: true, toWarehouse: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(movements);
});

module.exports = router;
