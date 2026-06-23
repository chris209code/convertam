export default function Logo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Convertam logo"
    >
      <rect width="32" height="32" rx="8" fill="#3a63b8"/>
      {/* Top arrow - left to right */}
      <path
        d="M8 13 C8 13 16 9 24 13"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="24,8.5 24,17.5 19.5,13" fill="white"/>
      {/* Bottom arrow - right to left */}
      <path
        d="M24 19 C24 19 16 23 8 19"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="8,14.5 8,23.5 12.5,19" fill="white"/>
    </svg>
  );
}
