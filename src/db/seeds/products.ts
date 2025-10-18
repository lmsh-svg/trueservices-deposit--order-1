import { db } from '@/db';
import { products } from '@/db/schema';

async function main() {
    const currentTimestamp = new Date().toISOString();
    
    const sampleProducts = [
        {
            name: 'iPhone 15 Pro',
            category: 'electronics',
            description: 'Latest iPhone with A17 Pro chip and titanium design',
            price: 999.99,
            isAvailable: true,
            imageUrl: '/images/products/iphone-15-pro.png',
            stockQuantity: 25,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'MacBook Pro 14"',
            category: 'electronics',
            description: 'Powerful laptop with M3 chip and stunning display',
            price: 1999.99,
            isAvailable: true,
            imageUrl: '/images/products/macbook-pro.png',
            stockQuantity: 15,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'AirPods Pro (2nd generation)',
            category: 'electronics',
            description: 'Active noise cancellation and spatial audio',
            price: 249.99,
            isAvailable: true,
            imageUrl: '/images/products/airpods-pro.png',
            stockQuantity: 50,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Phone Case - Silicone',
            category: 'accessories',
            description: 'Premium silicone case for iPhone',
            price: 39.99,
            isAvailable: true,
            imageUrl: '/images/products/phone-case.png',
            stockQuantity: 100,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'USB-C Fast Charger',
            category: 'accessories',
            description: '30W USB-C power adapter for fast charging',
            price: 29.99,
            isAvailable: true,
            imageUrl: '/images/products/charger.png',
            stockQuantity: 75,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Lightning to USB-C Cable',
            category: 'accessories',
            description: '1 meter braided cable for fast charging',
            price: 19.99,
            isAvailable: true,
            imageUrl: '/images/products/cable.png',
            stockQuantity: 120,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Amazon Gift Card $50',
            category: 'gift_cards',
            description: 'Digital gift card for Amazon purchases',
            price: 50.00,
            isAvailable: true,
            imageUrl: '/images/products/amazon-card.png',
            stockQuantity: 500,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Google Play Gift Card $25',
            category: 'gift_cards',
            description: 'Digital gift card for Google Play Store',
            price: 25.00,
            isAvailable: true,
            imageUrl: '/images/products/google-play-card.png',
            stockQuantity: 300,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Steam Wallet Card $20',
            category: 'gift_cards',
            description: 'Digital wallet card for Steam games',
            price: 20.00,
            isAvailable: true,
            imageUrl: '/images/products/steam-card.png',
            stockQuantity: 250,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        }
    ];

    await db.insert(products).values(sampleProducts);
    
    console.log('✅ Products seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});