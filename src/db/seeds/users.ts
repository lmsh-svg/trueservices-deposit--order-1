import { db } from '@/db';
import { users } from '@/db/schema';

async function main() {
    const currentTimestamp = new Date().toISOString();
    
    const sampleUsers = [
        {
            email: 'admin@trueservices.com',
            passwordHash: 'hashed_admin_password_123',
            role: 'admin',
            balance: 0,
            loyaltyPoints: 0,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            email: 'user@test.com',
            passwordHash: 'hashed_user_password_456',
            role: 'user',
            balance: 100,
            loyaltyPoints: 500,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            email: 'sarah.johnson@example.com',
            passwordHash: 'hashed_password_789',
            role: 'user',
            balance: 250.50,
            loyaltyPoints: 750,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            email: 'michael.chen@example.com',
            passwordHash: 'hashed_password_abc',
            role: 'user',
            balance: 0,
            loyaltyPoints: 150,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            email: 'emma.davis@example.com',
            passwordHash: 'hashed_password_def',
            role: 'user',
            balance: 425.75,
            loyaltyPoints: 920,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});