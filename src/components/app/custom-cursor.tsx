'use client';

import { useEffect, useRef } from 'react';

const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const mousePosition = useRef({ x: 0, y: 0 });
  const dotPosition = useRef({ x: 0, y: 0 });

  // Spring/easing animation parameters
  const stiffness = 0.08; // How "springy" it is - lower is slower
  const damping = 0.75; // How much it resists motion - lower is floatier
  const velocity = useRef({ x: 0, y: 0 });


  const onMouseMove = (e: MouseEvent) => {
    mousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      if (dotRef.current && outlineRef.current) {
        // Update the outline directly for immediate response
        outlineRef.current.style.left = `${mousePosition.current.x}px`;
        outlineRef.current.style.top = `${mousePosition.current.y}px`;

        // Calculate the force to apply to the dot
        const forceX = (mousePosition.current.x - dotPosition.current.x) * stiffness;
        const forceY = (mousePosition.current.y - dotPosition.current.y) * stiffness;

        // Update velocity based on force
        velocity.current.x += forceX;
        velocity.current.y += forceY;

        // Apply damping to slow it down
        velocity.current.x *= damping;
        velocity.current.y *= damping;

        // Update the dot's position based on its velocity
        dotPosition.current.x += velocity.current.x;
        dotPosition.current.y += velocity.current.y;

        dotRef.current.style.left = `${dotPosition.current.x}px`;
        dotRef.current.style.top = `${dotPosition.current.y}px`;
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };


  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);

    const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('a, button, input, select')) {
            if (outlineRef.current) {
                outlineRef.current.style.transform = 'translate(-50%, -50%) scale(2.5)';
            }
            if (dotRef.current) {
                 dotRef.current.style.opacity = '0';
            }
        }
    };

    const handleMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
         if (target.closest('a, button, input, select')) {
            if (outlineRef.current) {
                outlineRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
            }
             if (dotRef.current) {
                 dotRef.current.style.opacity = '1';
            }
        }
    }

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={outlineRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none rounded-full border-2 border-primary transition-transform duration-300"
        style={{ width: '40px', height: '40px', transform: 'translate(-50%, -50%)' }}
      />
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none rounded-full bg-primary transition-opacity duration-300"
        style={{ width: '8px', height: '8px', transform: 'translate(-50%, -50%)' }}
      />
    </>
  );
};

export default CustomCursor;
