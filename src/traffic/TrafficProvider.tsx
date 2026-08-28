/**
 * TrafficProvider.tsx
 * Integrates SimTrafficEngine with fleetStore
 */

import { useEffect, useRef, useCallback } from 'react';
import { useFleetStore, type PositionUpdate } from '../store/fleetStore';
import { SimTrafficEngine } from './SimTrafficEngine';

export const TrafficProvider = ({ children }: { children: React.ReactNode }) => {
  const upsertPosition = useFleetStore((s) => s.upsertPosition);
  const engineRef = useRef<SimTrafficEngine | null>(null);

  const handleUpdate = useCallback(
    (update: PositionUpdate) => {
      upsertPosition(update);
    },
    [upsertPosition]
  );

  useEffect(() => {
    // Initialize simulation engine
    engineRef.current = new SimTrafficEngine(12345);
    engineRef.current.start(handleUpdate);

    // Set initial status
    useFleetStore.getState().setSource('sim');

    return () => {
      engineRef.current?.stop();
    };
  }, [handleUpdate]);

  return <>{children}</>;
};
