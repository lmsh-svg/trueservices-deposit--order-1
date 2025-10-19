/**
 * Mempool.space API Integration Service
 * Handles Bitcoin transaction verification, historical pricing, and WebSocket monitoring
 */

export interface MempoolTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness: string[];
    is_coinbase: boolean;
    sequence: number;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address?: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface MempoolPrice {
  USD: number;
  EUR: number;
  GBP: number;
  CAD: number;
  CHF: number;
  AUD: number;
  JPY: number;
}

const MEMPOOL_API_BASE = 'https://mempool.space/api';

/**
 * Fetch transaction details from mempool.space
 */
export async function getTransaction(txid: string): Promise<MempoolTransaction> {
  const response = await fetch(`${MEMPOOL_API_BASE}/tx/${txid}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Transaction not found on blockchain');
    }
    throw new Error(`Failed to fetch transaction: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get historical Bitcoin price at a specific timestamp
 */
export async function getHistoricalPrice(timestamp: number): Promise<number> {
  // Convert to Unix timestamp if needed
  const unixTimestamp = Math.floor(timestamp / 1000);
  
  const response = await fetch(`${MEMPOOL_API_BASE}/v1/historical-price?timestamp=${unixTimestamp}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch historical price: ${response.statusText}`);
  }
  
  const data: { prices: MempoolPrice[] } = await response.json();
  
  // Return USD price
  return data.prices[0]?.USD || 0;
}

/**
 * Get current Bitcoin price
 */
export async function getCurrentPrice(): Promise<number> {
  const response = await fetch(`${MEMPOOL_API_BASE}/v1/prices`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch current price: ${response.statusText}`);
  }
  
  const data: MempoolPrice = await response.json();
  return data.USD;
}

/**
 * Calculate USD value of a Bitcoin transaction at the time it occurred
 */
export async function calculateTransactionValue(
  txid: string,
  targetAddress: string
): Promise<{
  btcAmount: number;
  usdAmount: number;
  confirmations: number;
  timestamp: number;
  confirmed: boolean;
}> {
  const tx = await getTransaction(txid);
  
  // Find the output that was sent to our address
  const output = tx.vout.find(
    (vout) => vout.scriptpubkey_address === targetAddress
  );
  
  if (!output) {
    throw new Error('Transaction was not sent to the specified address');
  }
  
  // Convert satoshis to BTC
  const btcAmount = output.value / 100000000;
  
  // Check if transaction is confirmed
  if (!tx.status.confirmed || !tx.status.block_time) {
    return {
      btcAmount,
      usdAmount: 0,
      confirmations: 0,
      timestamp: Date.now(),
      confirmed: false,
    };
  }
  
  // Get historical price at transaction time
  const historicalPrice = await getHistoricalPrice(tx.status.block_time * 1000);
  const usdAmount = btcAmount * historicalPrice;
  
  // Calculate confirmations
  const latestBlockResponse = await fetch(`${MEMPOOL_API_BASE}/blocks/tip/height`);
  const latestBlock = await latestBlockResponse.json();
  const confirmations = latestBlock - tx.status.block_height + 1;
  
  return {
    btcAmount,
    usdAmount,
    confirmations,
    timestamp: tx.status.block_time * 1000,
    confirmed: true,
  };
}

/**
 * Check if transaction has minimum required confirmations
 */
export async function hasMinimumConfirmations(
  txid: string,
  minConfirmations: number = 2
): Promise<boolean> {
  const tx = await getTransaction(txid);
  
  if (!tx.status.confirmed || !tx.status.block_height) {
    return false;
  }
  
  const latestBlockResponse = await fetch(`${MEMPOOL_API_BASE}/blocks/tip/height`);
  const latestBlock = await latestBlockResponse.json();
  const confirmations = latestBlock - tx.status.block_height + 1;
  
  return confirmations >= minConfirmations;
}

/**
 * Create WebSocket connection to monitor address
 */
export function createAddressWebSocket(
  address: string,
  onTransaction: (txid: string) => void
): WebSocket {
  const ws = new WebSocket('wss://mempool.space/api/v1/ws');
  
  ws.onopen = () => {
    // Subscribe to address transactions
    ws.send(JSON.stringify({
      action: 'want',
      data: ['address-transactions', address],
    }));
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle new transaction
      if (data['address-transactions'] && data['address-transactions'].txid) {
        onTransaction(data['address-transactions'].txid);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return ws;
}