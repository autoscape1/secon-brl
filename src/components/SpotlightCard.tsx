import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  theme: 'journal' | 'noir';
  variant?: 'flat' | 'inset' | 'convex' | 'none';
  as?: any;
  [key: string]: any;
}

const SpotlightCard = forwardRef<HTMLDivElement, SpotlightCardProps>(({ 
  children, 
  className = '', 
  theme, 
  variant = 'none',
  as: Component = 'div',
  ...props
}, ref) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => cardRef.current!);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const isNoir = theme === 'noir';
  
  const variantClasses = {
    flat: 'nm-flat',
    inset: 'nm-inset',
    convex: 'nm-convex',
    none: ''
  };

  return (
    <Component
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden transition-all duration-300 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(200px circle at ${mousePos.x}px ${mousePos.y}px, ${
            isNoir 
              ? 'rgba(255, 59, 48, 0.22)' 
              : 'rgba(0, 32, 104, 0.12)'
          }, transparent 65%)`,
        }}
      />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </Component>
  );
});

SpotlightCard.displayName = 'SpotlightCard';

export default SpotlightCard;
