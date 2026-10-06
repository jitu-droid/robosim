'use client';

import { useEffect } from 'react';

export const useScrollAnimation = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Stagger child animations for elements marked with data-animate
            const targetEl = entry.target as HTMLElement;
            const animatedChildren = targetEl.querySelectorAll('[data-animate]');
            animatedChildren.forEach((el, idx) => {
              const node = el as HTMLElement;
              // Apply initial reveal class and individual delay
              node.classList.add('reveal');
              node.style.setProperty('--stagger-delay', `${idx * 90}ms`);
              // Trigger visibility with stagger
              setTimeout(() => {
                node.classList.add('visible');
              }, idx * 90);
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.page-section');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);
};
