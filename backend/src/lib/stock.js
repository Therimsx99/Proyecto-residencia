const prisma = require('./prisma');

async function getStock(tx, productId, warehouseId) {
  const row = await tx.productStock.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });
  return row ? Number(row.quantity) : 0;
}

async function setStock(tx, productId, warehouseId, quantity) {
  await tx.productStock.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: { quantity },
    create: { productId, warehouseId, quantity },
  });
}

async function totalStock(productId) {
  const rows = await prisma.productStock.findMany({ where: { productId } });
  return rows.reduce((sum, r) => sum + Number(r.quantity), 0);
}

async function stockByWarehouse(productId) {
  return prisma.productStock.findMany({
    where: { productId },
    include: { warehouse: true },
    orderBy: { warehouse: { name: 'asc' } },
  });
}

// Records a movement and updates ProductStock within a transaction.
// For ENTRADA/AJUSTE: quantity is added. For SALIDA: quantity is subtracted.
// For TRANSFERENCIA: quantity is subtracted from warehouseId and added to toWarehouseId.
async function applyMovement(tx, { productId, warehouseId, toWarehouseId, type, quantity, reason, reference, userId }) {
  const current = await getStock(tx, productId, warehouseId);
  let next = current;

  if (type === 'ENTRADA' || type === 'AJUSTE') next = current + quantity;
  if (type === 'SALIDA' || type === 'TRANSFERENCIA') {
    if (quantity > current) {
      throw new Error('Stock insuficiente en el almacén de origen');
    }
    next = current - quantity;
  }

  await setStock(tx, productId, warehouseId, next);

  if (type === 'TRANSFERENCIA') {
    const destCurrent = await getStock(tx, productId, toWarehouseId);
    await setStock(tx, productId, toWarehouseId, destCurrent + quantity);
  }

  return tx.inventoryMovement.create({
    data: {
      productId,
      warehouseId,
      toWarehouseId: type === 'TRANSFERENCIA' ? toWarehouseId : null,
      type,
      quantity,
      balanceAfter: next,
      reason,
      reference,
      userId,
    },
  });
}

module.exports = { getStock, setStock, totalStock, stockByWarehouse, applyMovement };
