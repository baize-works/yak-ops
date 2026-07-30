import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[35] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="loading-spinner" aria-label="加载中" />

        <span className="text-[14px] font-normal text-[#655750]">
          加载中，请稍候...
        </span>
      </div>

      <style>
        {`
          .loading-spinner {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: conic-gradient(
              from 0deg,
              transparent 0deg,
              transparent 210deg,
              rgba(255, 82, 126, 0.2) 245deg,
              #ff527e 300deg,
              #ff527e 360deg
            );
            -webkit-mask: radial-gradient(
              farthest-side,
              transparent calc(100% - 4px),
              #000 calc(100% - 3px)
            );
            mask: radial-gradient(
              farthest-side,
              transparent calc(100% - 4px),
              #000 calc(100% - 3px)
            );
            animation: loading-spin 0.75s linear infinite;
          }

          @keyframes loading-spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .loading-spinner {
              animation-duration: 1.5s;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Loading;
