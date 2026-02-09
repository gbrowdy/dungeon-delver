import { useMemo } from 'react';
import { getSprite, frameToBoxShadow, AnimationState } from '@/data/sprites';
import { cn } from '@/lib/utils';

interface PixelSpriteProps {
  type: string;
  state: AnimationState;
  direction?: 'left' | 'right';
  scale?: number;
  className?: string;
  frame?: number;
}

export function PixelSprite({
  type,
  state,
  direction = 'right',
  scale = 4,
  className,
  frame = 0,
}: PixelSpriteProps) {
  const sprite = useMemo(() => getSprite(type), [type]);

  const boxShadow = useMemo(() => {
    const frames = sprite.frames[state];
    const frameIndex = frame % frames.length;
    const currentFrame = frames[frameIndex];
    if (!currentFrame) {
      return '';
    }
    return frameToBoxShadow(currentFrame, scale);
  }, [sprite, state, frame, scale]);

  const width = sprite.width * scale;
  const height = sprite.height * scale;

  return (
    <div
      className={cn(
        'relative',
        state === 'hit' && 'animate-sprite-hit',
        className
      )}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: direction === 'left' ? 'scaleX(-1)' : undefined,
      }}
    >
      {/* The actual pixel art rendered via box-shadow */}
      <div
        className="absolute"
        style={{
          width: `${scale}px`,
          height: `${scale}px`,
          boxShadow,
          // Position at 0,0 - box-shadows extend from there
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}

// Animated version that cycles through frames
interface AnimatedPixelSpriteProps extends Omit<PixelSpriteProps, 'frame'> {
  animationSpeed?: number; // ms per frame
  paused?: boolean;
}

export function AnimatedPixelSprite({
  type,
  state,
  direction = 'right',
  scale = 4,
  className,
  animationSpeed = 200,
  paused = false,
}: AnimatedPixelSpriteProps) {
  const sprite = useMemo(() => getSprite(type), [type]);
  const frameCount = sprite.frames[state].length;

  // Use CSS animation for smooth frame cycling
  const animationDuration = animationSpeed * frameCount;

  return (
    <div
      className={cn(
        'relative pixel-sprite',
        state === 'walk' && !paused && 'animate-sprite-walk',
        state === 'idle' && 'animate-sprite-idle',
        state === 'attack' && 'animate-sprite-attack',
        state === 'hit' && 'animate-sprite-hit',
        state === 'die' && 'animate-sprite-die',
        className
      )}
      style={{
        width: `${sprite.width * scale}px`,
        height: `${sprite.height * scale}px`,
        transform: direction === 'left' ? 'scaleX(-1)' : undefined,
        '--frame-count': frameCount,
        '--animation-duration': `${animationDuration}ms`,
      } as React.CSSProperties}
    >
      {/* Render all frames, CSS will handle visibility */}
      {sprite.frames[state].map((frame, index) => (
        <div
          key={index}
          className="absolute sprite-frame"
          style={{
            width: `${scale}px`,
            height: `${scale}px`,
            boxShadow: frameToBoxShadow(frame, scale),
            top: 0,
            left: 0,
            opacity: index === 0 ? 1 : 0,
            '--frame-index': index,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
