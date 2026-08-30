/**
 * ZoomSlider.tsx
 * Vertical elastic slider for map zoom control
 * Adapted from React Bits ElasticSlider - vertical variant, no speaker icons
 */

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';

interface ZoomSliderProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
}

const MAX_OVERFLOW = 30;

function decay(value: number, max: number) {
  if (max === 0) return 0;
  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}

export const ZoomSlider = ({ zoom, minZoom, maxZoom, onZoomChange }: ZoomSliderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<'top' | 'bottom' | 'middle'>('middle');

  const clientY = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  const normalizedZoom = (zoom - minZoom) / (maxZoom - minZoom);
  const percentage = Math.max(0, Math.min(100, (1 - normalizedZoom) * 100));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    animate(overflow, 0, { type: 'spring', bounce: 0.5 });
  }, [overflow]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const { top, height } = rect;
      const y = e.clientY;

      // Determine region for elastic effect
      if (y < top) {
        regionRef.current = 'top';
        overflow.jump(decay(top - y, MAX_OVERFLOW));
      } else if (y > top + height) {
        regionRef.current = 'bottom';
        overflow.jump(decay(y - (top + height), MAX_OVERFLOW));
      } else {
        regionRef.current = 'middle';
        overflow.jump(0);
      }

      clientY.jump(y);

      if (isDragging) {
        // Calculate new zoom based on vertical position
        const clampedY = Math.max(top, Math.min(y, top + height));
        const newPercentage = 1 - (clampedY - top) / height;
        const newZoom = minZoom + newPercentage * (maxZoom - minZoom);
        onZoomChange(Math.round(newZoom * 10) / 10);
      }
    },
    [isDragging, minZoom, maxZoom, onZoomChange, clientY, overflow]
  );

  const handleZoomIn = () => {
    const newZoom = Math.min(maxZoom, zoom + 1);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(minZoom, zoom - 1);
    onZoomChange(newZoom);
  };

  const overflowY = useTransform(overflow, (val) =>
    regionRef.current === 'top' ? -val : regionRef.current === 'bottom' ? val : 0
  );

  const trackWidth = useTransform(scale, [1, 1.2], [4, 8]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Zoom In Button */}
      <motion.button
        onClick={handleZoomIn}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-8 h-8 flex items-center justify-center rounded"
        style={{
          backgroundColor: 'rgba(19, 35, 59, 0.9)',
          border: '1px solid rgba(108, 122, 137, 0.5)',
          color: '#EDE7DC',
        }}
        title="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </motion.button>

      {/* Vertical Slider */}
      <div className="relative h-32 flex items-center justify-center">
        <motion.div
          ref={sliderRef}
          className="relative h-32 w-4 rounded-full cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: 'rgba(19, 35, 59, 0.6)',
            border: '1px solid rgba(108, 122, 137, 0.3)',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onHoverStart={() => animate(scale, 1.2)}
          onHoverEnd={() => animate(scale, 1)}
        >
          {/* Track Background */}
          <div className="absolute inset-1 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: 'rgba(108, 122, 137, 0.3)' }}
            />
            {/* Active Range */}
            <motion.div
              className="absolute left-0 right-0 rounded-full"
              style={{
                bottom: 0,
                height: `${percentage}%`,
                backgroundColor: '#4FA88B',
                opacity: 0.8,
              }}
            />
          </div>

          {/* Thumb */}
          <motion.div
            className="absolute left-0 right-0 mx-auto w-4 h-4 rounded-full"
            style={{
              bottom: `calc(${percentage}% - 8px)`,
              backgroundColor: '#EDE7DC',
              boxShadow: '0 0 8px rgba(79, 168, 139, 0.5)',
              scale: isDragging ? 1.3 : 1,
              transition: 'scale 0.15s ease',
            }}
          />
        </motion.div>

        {/* Zoom Value Indicator */}
        <div
          className="absolute -right-10 font-mono text-[10px] text-signal"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Z{zoom.toFixed(1)}
        </div>
      </div>

      {/* Zoom Out Button */}
      <motion.button
        onClick={handleZoomOut}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-8 h-8 flex items-center justify-center rounded"
        style={{
          backgroundColor: 'rgba(19, 35, 59, 0.9)',
          border: '1px solid rgba(108, 122, 137, 0.5)',
          color: '#EDE7DC',
        }}
        title="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </motion.button>
    </div>
  );
};

export default ZoomSlider;
