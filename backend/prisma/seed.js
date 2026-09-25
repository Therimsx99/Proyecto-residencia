const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando datos de muestra...');

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@bridacero.com' },
    update: {},
    create: {
      name: 'Aaron Teutle',
      email: 'admin@bridacero.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const almacenHash = await bcrypt.hash('almacen123', 10);
  await prisma.user.upsert({
    where: { email: 'almacen@bridacero.com' },
    update: {},
    create: {
      name: 'Encargado de Almacén',
      email: 'almacen@bridacero.com',
      passwordHash: almacenHash,
      role: 'ALMACEN',
    },
  });

  const products = [
    { sku: 'VAR-3-8', name: 'Varilla corrugada 3/8" x 12m', category: 'Varilla', unit: 'pieza', stock: 450, minStock: 100, unitCost: 145, unitPrice: 185, location: 'Patio A-1' },
    { sku: 'VAR-1-2', name: 'Varilla corrugada 1/2" x 12m', category: 'Varilla', unit: 'pieza', stock: 320, minStock: 100, unitCost: 255, unitPrice: 320, location: 'Patio A-2' },
    { sku: 'VAR-5-8', name: 'Varilla corrugada 5/8" x 12m', category: 'Varilla', unit: 'pieza', stock: 80, minStock: 100, unitCost: 395, unitPrice: 480, location: 'Patio A-3' },
    { sku: 'MALLA-6X6', name: 'Malla electrosoldada 6x6-10/10', category: 'Malla', unit: 'rollo', stock: 25, minStock: 10, unitCost: 1850, unitPrice: 2300, location: 'Patio B-1' },
    { sku: 'ALAMBRE-REC', name: 'Alambre recocido cal. 18', category: 'Alambre', unit: 'kg', stock: 600, minStock: 150, unitCost: 28, unitPrice: 38, location: 'Bodega C-1' },
    { sku: 'CEM-GRIS-50', name: 'Cemento gris CPC 30R 50kg', category: 'Cemento', unit: 'saco', stock: 18, minStock: 50, unitCost: 195, unitPrice: 235, location: 'Bodega D-1' },
    { sku: 'CLAVO-3', name: 'Clavo estándar 3"', category: 'Ferretería', unit: 'kg', stock: 210, minStock: 40, unitCost: 32, unitPrice: 45, location: 'Bodega C-2' },
    { sku: 'LAM-CAL-26', name: 'Lámina galvanizada cal. 26 x 3.05m', category: 'Lámina', unit: 'pieza', stock: 60, minStock: 20, unitCost: 310, unitPrice: 395, location: 'Patio B-2' },
    { sku: 'TUB-PTR-2', name: 'Tubo PTR 2" x 2" cal. 14', category: 'Perfil estructural', unit: 'pieza (6m)', stock: 140, minStock: 30, unitCost: 480, unitPrice: 590, location: 'Patio A-4' },
    { sku: 'ANGULO-1-4', name: 'Ángulo de acero 2" x 1/4" x 6m', category: 'Perfil estructural', unit: 'pieza', stock: 12, minStock: 25, unitCost: 620, unitPrice: 760, location: 'Patio A-5' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }

  const suppliers = [
    { name: 'Aceros del Golfo S.A. de C.V.', contactName: 'Roberto Mena', phone: '2221234567', email: 'ventas@acerosgolfo.mx', address: 'Blvd. Industrial 450, Puebla' },
    { name: 'Cementos Puebla S.A.', contactName: 'Lorena Vidal', phone: '2229876543', email: 'contacto@cementospuebla.mx', address: 'Carretera a Cholula km 5, Puebla' },
    { name: 'Ferretera Industrial del Centro', contactName: 'Julio Ramos', phone: '2221112233', email: 'julio.ramos@ferreteraindustrial.mx', address: 'Av. Reforma 220, Puebla' },
  ];

  const supplierRecords = [];
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    const record = existing || (await prisma.supplier.create({ data: s }));
    supplierRecords.push(record);
  }

  const customers = [
    { name: 'Constructora Vallarta S.A. de C.V.', contactName: 'Miguel Ángel Soto', phone: '2225556677', email: 'compras@constructoravallarta.mx', address: 'Zona Industrial, Puebla' },
    { name: 'Grupo Edificador Tulcingo', contactName: 'Ana Rentería', phone: '2224445566', email: 'ana.renteria@edificadortulcingo.mx', address: 'San Cristóbal Tulcingo, Puebla' },
    { name: 'Home Depot Puebla Sur', contactName: 'Encargado de compras', phone: '2223334455', email: 'compraspue@homedepot.mx', address: 'Bulevar del Niño Poblano, Puebla' },
  ];

  const customerRecords = [];
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    const record = existing || (await prisma.customer.create({ data: c }));
    customerRecords.push(record);
  }

  const allProducts = await prisma.product.findMany();
  const byS = (sku) => allProducts.find((p) => p.sku === sku);

  const existingPO = await prisma.purchaseOrder.findFirst();
  if (!existingPO) {
    await prisma.purchaseOrder.create({
      data: {
        folio: 'OC-0001',
        supplierId: supplierRecords[0].id,
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
        status: 'PENDIENTE',
        deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        total: 150 * 185 + 80 * 320,
        notes: 'Pedido para obra Residencial Las Torres',
        items: {
          create: [
            { productId: byS('VAR-3-8').id, quantity: 150, unitPrice: 185 },
            { productId: byS('VAR-1-2').id, quantity: 80, unitPrice: 320 },
          ],
        },
      },
    });

    await prisma.salesOrder.create({
      data: {
        folio: 'PED-0002',
        customerId: customerRecords[2].id,
        status: 'SURTIDO_PARCIAL',
        deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        total: 30 * 2300,
        notes: 'Pedido recurrente de malla electrosoldada',
        items: {
          create: [{ productId: byS('MALLA-6X6').id, quantity: 30, unitPrice: 2300, deliveredQty: 15 }],
        },
      },
    });
  }

  console.log('Datos de muestra listos.');
  console.log('Usuario admin: admin@bridacero.com / admin123');
  console.log('Usuario almacén: almacen@bridacero.com / almacen123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
