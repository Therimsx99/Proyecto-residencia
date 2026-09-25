const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { applyMovement } = require('../src/lib/stock');

const prisma = new PrismaClient();

async function upsertUser(name, email, password, role) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
}

async function main() {
  console.log('Sembrando datos de muestra...');

  await upsertUser('Aaron Teutle', 'admin@bridacero.com', 'admin123', 'ADMIN');
  await upsertUser('Encargado de Almacén', 'almacen@bridacero.com', 'almacen123', 'ALMACEN');
  await upsertUser('Encargado de Compras', 'compras@bridacero.com', 'compras123', 'COMPRAS');
  await upsertUser('Encargado de Ventas', 'ventas@bridacero.com', 'ventas123', 'VENTAS');
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@bridacero.com' } });

  const warehouseDefs = [
    { code: 'ALM-CEN', name: 'Almacén Central', address: 'Carretera federal Puebla Tlaxcala Km. 8.5 #604, San Cristóbal Tulcingo' },
    { code: 'SUC-PUE', name: 'Sucursal Puebla Centro', address: 'Av. Reforma 850, Centro, Puebla' },
  ];
  const warehouses = [];
  for (const w of warehouseDefs) {
    const wh = await prisma.warehouse.upsert({ where: { code: w.code }, update: {}, create: w });
    warehouses.push(wh);
  }
  const [central, sucursal] = warehouses;

  const productDefs = [
    { sku: 'VAR-3-8', name: 'Varilla corrugada 3/8" x 12m', category: 'Varilla', unit: 'pieza', minStock: 100, unitCost: 145, unitPrice: 185, location: 'Patio A-1', stockCentral: 350, stockSucursal: 100 },
    { sku: 'VAR-1-2', name: 'Varilla corrugada 1/2" x 12m', category: 'Varilla', unit: 'pieza', minStock: 100, unitCost: 255, unitPrice: 320, location: 'Patio A-2', stockCentral: 250, stockSucursal: 70 },
    { sku: 'VAR-5-8', name: 'Varilla corrugada 5/8" x 12m', category: 'Varilla', unit: 'pieza', minStock: 100, unitCost: 395, unitPrice: 480, location: 'Patio A-3', stockCentral: 60, stockSucursal: 20 },
    { sku: 'MALLA-6X6', name: 'Malla electrosoldada 6x6-10/10', category: 'Malla', unit: 'rollo', minStock: 10, unitCost: 1850, unitPrice: 2300, location: 'Patio B-1', stockCentral: 20, stockSucursal: 5 },
    { sku: 'ALAMBRE-REC', name: 'Alambre recocido cal. 18', category: 'Alambre', unit: 'kg', minStock: 150, unitCost: 28, unitPrice: 38, location: 'Bodega C-1', stockCentral: 450, stockSucursal: 150 },
    { sku: 'CEM-GRIS-50', name: 'Cemento gris CPC 30R 50kg', category: 'Cemento', unit: 'saco', minStock: 50, unitCost: 195, unitPrice: 235, location: 'Bodega D-1', stockCentral: 12, stockSucursal: 6 },
    { sku: 'CLAVO-3', name: 'Clavo estándar 3"', category: 'Ferretería', unit: 'kg', minStock: 40, unitCost: 32, unitPrice: 45, location: 'Bodega C-2', stockCentral: 160, stockSucursal: 50 },
    { sku: 'LAM-CAL-26', name: 'Lámina galvanizada cal. 26 x 3.05m', category: 'Lámina', unit: 'pieza', minStock: 20, unitCost: 310, unitPrice: 395, location: 'Patio B-2', stockCentral: 45, stockSucursal: 15 },
    { sku: 'TUB-PTR-2', name: 'Tubo PTR 2" x 2" cal. 14', category: 'Perfil estructural', unit: 'pieza (6m)', minStock: 30, unitCost: 480, unitPrice: 590, location: 'Patio A-4', stockCentral: 110, stockSucursal: 30 },
    { sku: 'ANGULO-1-4', name: 'Ángulo de acero 2" x 1/4" x 6m', category: 'Perfil estructural', unit: 'pieza', minStock: 25, unitCost: 620, unitPrice: 760, location: 'Patio A-5', stockCentral: 8, stockSucursal: 4 },
  ];

  const products = [];
  for (const p of productDefs) {
    const { stockCentral, stockSucursal, ...data } = p;
    const product = await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: data });
    products.push({ ...product, stockCentral, stockSucursal });
  }

  const existingMovements = await prisma.inventoryMovement.count();
  if (existingMovements === 0) {
    for (const p of products) {
      await prisma.$transaction((tx) =>
        applyMovement(tx, {
          productId: p.id,
          warehouseId: central.id,
          type: 'ENTRADA',
          quantity: p.stockCentral,
          reason: 'Inventario inicial',
          reference: 'SALDO-INICIAL',
          userId: adminUser.id,
        })
      );
      await prisma.$transaction((tx) =>
        applyMovement(tx, {
          productId: p.id,
          warehouseId: sucursal.id,
          type: 'ENTRADA',
          quantity: p.stockSucursal,
          reason: 'Inventario inicial',
          reference: 'SALDO-INICIAL',
          userId: adminUser.id,
        })
      );
    }
  }

  const byS = (sku) => products.find((p) => p.sku === sku);

  const suppliers = [
    { name: 'Aceros del Golfo S.A. de C.V.', contactName: 'Roberto Mena', phone: '2221234567', email: 'ventas@acerosgolfo.mx', address: 'Blvd. Industrial 450, Puebla' },
    { name: 'Cementos Puebla S.A.', contactName: 'Lorena Vidal', phone: '2229876543', email: 'contacto@cementospuebla.mx', address: 'Carretera a Cholula km 5, Puebla' },
    { name: 'Ferretera Industrial del Centro', contactName: 'Julio Ramos', phone: '2221112233', email: 'julio.ramos@ferreteraindustrial.mx', address: 'Av. Reforma 220, Puebla' },
  ];
  const supplierRecords = [];
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    supplierRecords.push(existing || (await prisma.supplier.create({ data: s })));
  }

  const mayoreoItems = [
    { sku: 'VAR-3-8', price: 175 },
    { sku: 'VAR-1-2', price: 300 },
    { sku: 'CEM-GRIS-50', price: 220 },
  ];
  let mayoreoList = await prisma.priceList.findFirst({ where: { name: 'Lista mayoreo' } });
  if (!mayoreoList) {
    mayoreoList = await prisma.priceList.create({
      data: {
        name: 'Lista mayoreo',
        items: { create: mayoreoItems.map((it) => ({ productId: byS(it.sku).id, price: it.price })) },
      },
    });
  }

  const customers = [
    { name: 'Constructora Vallarta S.A. de C.V.', contactName: 'Miguel Ángel Soto', phone: '2225556677', email: 'compras@constructoravallarta.mx', address: 'Zona Industrial, Puebla', priceListId: mayoreoList.id },
    { name: 'Grupo Edificador Tulcingo', contactName: 'Ana Rentería', phone: '2224445566', email: 'ana.renteria@edificadortulcingo.mx', address: 'San Cristóbal Tulcingo, Puebla', priceListId: null },
    { name: 'Home Depot Puebla Sur', contactName: 'Encargado de compras', phone: '2223334455', email: 'compraspue@homedepot.mx', address: 'Bulevar del Niño Poblano, Puebla', priceListId: null },
  ];
  const customerRecords = [];
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    customerRecords.push(existing || (await prisma.customer.create({ data: c })));
  }

  const existingPO = await prisma.purchaseOrder.findFirst();
  if (!existingPO) {
    await prisma.purchaseOrder.create({
      data: {
        folio: 'OC-0001',
        supplierId: supplierRecords[0].id,
        warehouseId: central.id,
        status: 'PENDIENTE',
        expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        total: 100 * 395 + 40 * 620,
        notes: 'Reposición de varilla 5/8" y ángulo estructural (stock bajo)',
        items: {
          create: [
            { productId: byS('VAR-5-8').id, quantity: 100, unitCost: 395 },
            { productId: byS('ANGULO-1-4').id, quantity: 40, unitCost: 620 },
          ],
        },
      },
    });

    await prisma.purchaseOrder.create({
      data: {
        folio: 'OC-0002',
        supplierId: supplierRecords[1].id,
        warehouseId: central.id,
        status: 'PARCIAL',
        expectedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        total: 200 * 195,
        notes: 'Reposición de cemento gris',
        items: {
          create: [{ productId: byS('CEM-GRIS-50').id, quantity: 200, unitCost: 195, receivedQty: 80 }],
        },
      },
    });
  }

  const existingSO = await prisma.salesOrder.findFirst();
  if (!existingSO) {
    await prisma.salesOrder.create({
      data: {
        folio: 'PED-0001',
        customerId: customerRecords[0].id,
        warehouseId: central.id,
        status: 'PENDIENTE',
        deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        total: 150 * 175 + 80 * 300,
        notes: 'Pedido para obra Residencial Las Torres',
        items: {
          create: [
            { productId: byS('VAR-3-8').id, quantity: 150, unitPrice: 175 },
            { productId: byS('VAR-1-2').id, quantity: 80, unitPrice: 300 },
          ],
        },
      },
    });

    await prisma.salesOrder.create({
      data: {
        folio: 'PED-0002',
        customerId: customerRecords[2].id,
        warehouseId: sucursal.id,
        status: 'SURTIDO_PARCIAL',
        deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        total: 5 * 2300,
        notes: 'Pedido recurrente de malla electrosoldada',
        items: {
          create: [{ productId: byS('MALLA-6X6').id, quantity: 5, unitPrice: 2300, deliveredQty: 2 }],
        },
      },
    });
  }

  const existingQuote = await prisma.salesQuote.findFirst();
  if (!existingQuote) {
    await prisma.salesQuote.create({
      data: {
        folio: 'COT-0001',
        customerId: customerRecords[1].id,
        status: 'ENVIADA',
        validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        total: 60 * 590 + 20 * 395,
        notes: 'Cotización para bodega industrial, pendiente de aprobación del cliente',
        items: {
          create: [
            { productId: byS('TUB-PTR-2').id, quantity: 60, unitPrice: 590 },
            { productId: byS('LAM-CAL-26').id, quantity: 20, unitPrice: 395 },
          ],
        },
      },
    });
  }

  console.log('Datos de muestra listos.');
  console.log('admin@bridacero.com / admin123 (ADMIN)');
  console.log('almacen@bridacero.com / almacen123 (ALMACEN)');
  console.log('compras@bridacero.com / compras123 (COMPRAS)');
  console.log('ventas@bridacero.com / ventas123 (VENTAS)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
