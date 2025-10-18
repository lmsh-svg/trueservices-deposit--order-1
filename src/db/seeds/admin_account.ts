import { db } from '@/db';
import { user, account, users } from '@/db/schema';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function main() {
    const adminEmail = 'admin@trueservices.local';
    const adminPassword = 'TrueAdmin2024!Secure';
    const adminName = 'True Services Admin';
    
    // Check if admin already exists
    const existingUser = await db.select().from(user).where(user.email === adminEmail);
    if (existingUser.length > 0) {
        console.log('⚠️ Admin account already exists, skipping creation');
        return;
    }
    
    // Generate UUID for user
    const userId = randomUUID();
    
    // Hash password with bcrypt
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    
    // Current timestamp
    const now = new Date();
    const isoNow = now.toISOString();
    
    // Insert into better-auth user table
    await db.insert(user).values({
        id: userId,
        name: adminName,
        email: adminEmail,
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
    });
    
    // Insert into better-auth account table
    await db.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId: userId,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: now,
        updatedAt: now,
    });
    
    // Insert into legacy users table
    await db.insert(users).values({
        email: adminEmail,
        passwordHash: hashedPassword,
        role: 'admin',
        balance: 0,
        loyaltyPoints: 0,
        createdAt: isoNow,
        updatedAt: isoNow,
    });
    
    console.log('✅ Admin account created successfully');
    console.log('📧 Email: admin@trueservices.local');
    console.log('🔑 Password: TrueAdmin2024!Secure');
    console.log('👤 Name: True Services Admin');
    console.log('🎭 Role: admin');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});