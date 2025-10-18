import { db } from '@/db';
import { cryptoAddresses } from '@/db/schema';

async function main() {
    const currentTimestamp = new Date().toISOString();
    
    const sampleCryptoAddresses = [
        {
            cryptocurrency: 'bitcoin',
            address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            isActive: true,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            cryptocurrency: 'ethereum',
            address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            isActive: true,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            cryptocurrency: 'dogecoin',
            address: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
            isActive: true,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            cryptocurrency: 'litecoin',
            address: 'LXYZaBcDeFgHiJkLmNoPqRsTuVwXyZ1234',
            isActive: true,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        },
        {
            cryptocurrency: 'usdt',
            address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            isActive: true,
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
        }
    ];

    await db.insert(cryptoAddresses).values(sampleCryptoAddresses);
    
    console.log('✅ Crypto addresses seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});