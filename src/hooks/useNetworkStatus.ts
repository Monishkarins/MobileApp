import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Subscribes to device connectivity via @react-native-community/netinfo.
 * Defaults to connected (optimistic) and treats a null connectivity value
 * as connected so the UI never falsely shows an offline state on startup.
 */
export function useNetworkStatus(): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isConnected` can be null while NetInfo is determining status — treat as connected.
      setIsConnected(state.isConnected ?? true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected };
}
