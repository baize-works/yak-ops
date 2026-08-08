import type { SVGProps } from 'react';

const SyncNodeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    {...props}
  >
    <ellipse cx="10" cy="6.5" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M5 6.5v4c0 1.38 2.24 2.5 5 2.5 1.12 0 2.16-.18 3-.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M5 10.5v3.5c0 1.38 2.24 2.5 5 2.5.67 0 1.31-.07 1.9-.2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M14.6 10.3a4.45 4.45 0 0 1 4.9 1.15"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="m18.9 9.7.7 1.9-2 .3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.4 15.7a4.45 4.45 0 0 1-4.9 1.15"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="m15.1 18.3-.7-1.9 2-.3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default SyncNodeIcon;
