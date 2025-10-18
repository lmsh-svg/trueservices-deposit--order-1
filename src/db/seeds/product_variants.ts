import { db } from '@/db';
import { products, productVariants } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    // First, query the products table to get the Speedway Gas product ID
    const speedwayProduct = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.name, 'Speedway Gas'))
        .limit(1);

    if (!speedwayProduct || speedwayProduct.length === 0) {
        throw new Error('Speedway Gas product not found in products table');
    }

    const speedwayProductId = speedwayProduct[0].id;
    const currentTimestamp = new Date().toISOString();

    const sampleVariants = [
        {
            productId: speedwayProductId,
            denomination: 20.00,
            customerPrice: 14.00,
            adminCost: 12.80,
            stockQuantity: 10,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            productId: speedwayProductId,
            denomination: 100.00,
            customerPrice: 70.00,
            adminCost: 64.00,
            stockQuantity: 10,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            productId: speedwayProductId,
            denomination: 150.00,
            customerPrice: 105.00,
            adminCost: 96.00,
            stockQuantity: 10,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            productId: speedwayProductId,
            denomination: 250.00,
            customerPrice: 175.00,
            adminCost: 160.00,
            stockQuantity: 10,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    await db.insert(productVariants).values(sampleVariants);
    
    console.log('✅ Product variants seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});