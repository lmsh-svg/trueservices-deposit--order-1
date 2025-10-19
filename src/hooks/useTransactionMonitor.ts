import { useEffect, useState, useCallback } from 'react';
import { createAddressWebSocket } from '@/lib/mempool';

interface TransactionUpdate {
  txid: string;
  timestamp: number;
}

export function useTransactionMonitor(
  addresses: string[],
  enabled: boolean = true
) {
  const [newTransactions, setNewTransactions] = useState<TransactionUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const handleNewTransaction = useCallback((txid: string) => {
    setNewTransactions(prev => [...prev, {
      txid,
      timestamp: Date.now(),
    }]);
  }, []);

  useEffect(() => {
    if (!enabled || addresses.length === 0) {
      return;
    }

    const websockets: WebSocket[] = [];

    // Create WebSocket connection for each address
    addresses.forEach(address => {
      try {
        const ws = createAddressWebSocket(address, handleNewTransaction);
        
        ws.addEventListener('open', () => {
          setIsConnected(true);
        });

        ws.addEventListener('close', () => {
          setIsConnected(false);
        });

        websockets.push(ws);
      } catch (error) {
        console.error('Failed to create WebSocket for address:', address, error);
      }
    });

    // Cleanup on unmount
    return () => {
      websockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      setIsConnected(false);
    };
  }, [addresses, enabled, handleNewTransaction]);

  const clearTransactions = useCallback(() => {
    setNewTransactions([]);
  }, []);

  return {
    newTransactions,
    isConnected,
    clearTransactions,
  };
}