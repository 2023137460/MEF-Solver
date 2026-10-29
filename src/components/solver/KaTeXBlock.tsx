// ============================================================================
// KATEX BLOCK & INLINE MATHEMATICAL RENDERER
// ============================================================================

import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface KaTeXBlockProps {
  math: string;
  block?: boolean;
  className?: string;
  errorColor?: string;
}

export const KaTeXBlock: React.FC<KaTeXBlockProps> = ({
  math,
  block = false,
  className = '',
  errorColor = '#dc2626'
}) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      katex.render(math, containerRef.current, {
        displayMode: block,
        throwOnError: false,
        errorColor
      });
    } catch (e) {
      if (containerRef.current) {
        containerRef.current.innerText = math;
      }
    }
  }, [math, block, errorColor]);

  return <span ref={containerRef} className={className} />;
};

export const CircledNumKaTeX: React.FC<{ n: number | string; className?: string }> = ({ n, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full border-2 border-red-600 text-red-600 font-sans font-extrabold leading-none select-none bg-white w-5 h-5 text-[11px] mx-0.5 ${className}`}
  >
    {n}
  </span>
);
