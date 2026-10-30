import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  block?: boolean;
  displayMode?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({
  math,
  block = false,
  displayMode = false,
  className = '',
}) => {
  const isBlock = block || displayMode;

  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: isBlock,
        throwOnError: false,
        output: 'htmlAndMathml',
        strict: false,
      });
    } catch {
      return `<span class="text-rose-600 font-mono text-xs">${math}</span>`;
    }
  }, [math, isBlock]);

  if (isBlock) {
    return (
      <div
        className={`w-full overflow-x-auto py-1 text-center select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
