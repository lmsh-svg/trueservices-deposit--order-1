import { db } from '@/db';
import { services } from '@/db/schema';

async function main() {
    const currentTimestamp = new Date().toISOString();
    
    const sampleServices = [
        {
            name: 'Uber Eats Large',
            category: 'food_delivery',
            description: 'Get 70% off on Uber Eats orders up to $50',
            isAvailable: true,
            discountPercentage: 70,
            priceLimit: 50,
            imageUrl: '/images/services/ubereats-large.png',
            orderLink: null,
            browseLink: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Uber Eats Small',
            category: 'food_delivery',
            description: 'Get 70% off on Uber Eats orders up to $25',
            isAvailable: true,
            discountPercentage: 70,
            priceLimit: 25,
            imageUrl: '/images/services/ubereats-small.png',
            orderLink: null,
            browseLink: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'DoorDash Large',
            category: 'food_delivery',
            description: 'Get 70% off on DoorDash orders up to $50',
            isAvailable: true,
            discountPercentage: 70,
            priceLimit: 50,
            imageUrl: '/images/services/doordash-large.png',
            orderLink: null,
            browseLink: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'DoorDash Small',
            category: 'food_delivery',
            description: 'Get 70% off on DoorDash orders up to $25',
            isAvailable: true,
            discountPercentage: 70,
            priceLimit: 25,
            imageUrl: '/images/services/doordash-small.png',
            orderLink: null,
            browseLink: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'GrubHub',
            category: 'food_delivery',
            description: 'Get 70% off on GrubHub orders up to $40',
            isAvailable: true,
            discountPercentage: 70,
            priceLimit: 40,
            imageUrl: '/images/services/grubhub.png',
            orderLink: null,
            browseLink: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            name: 'Uber Eats Extra Large',
            category: 'food_delivery',
            description: 'Get 70% off on Uber Eats orders up to $75',
            isAvailable: true,
            discountPercentage: 70,
            priceLimit: 75,
            imageUrl: '/images/services/ubereats-xl.png',
            orderLink: null,
            browseLink: null,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    await db.insert(services).values(sampleServices);
    
    console.log('✅ Services seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});