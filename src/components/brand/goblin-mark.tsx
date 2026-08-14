import { cn } from "@/lib/utils";

/**
 * The Yield Goblin mark. Inline SVG rather than a raster asset so it stays
 * crisp at any size and picks up currentColor-independent brand greens.
 */
export function GoblinMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Yield Goblin"
      className={cn("size-8", className)}
    >
      <defs>
        <linearGradient id="goblin-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7BD389" />
          <stop offset="100%" stopColor="#3FA55C" />
        </linearGradient>
        <linearGradient id="goblin-hood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E8B57" />
          <stop offset="100%" stopColor="#1B6B41" />
        </linearGradient>
      </defs>

      {/* Hood */}
      <path
        d="M24 3c9.2 0 15.4 5.6 15.4 13.6 0 2.3-.5 4.3-1.3 6L34 20c.5-1.2.8-2.5.8-3.9C34.8 10.6 30.3 7 24 7s-10.8 3.6-10.8 9.1c0 1.4.3 2.7.8 3.9l-4.1 2.6a14.6 14.6 0 0 1-1.3-6C8.6 8.6 14.8 3 24 3Z"
        fill="url(#goblin-hood)"
      />

      {/* Ears */}
      <path
        d="M11.6 20.5 4.2 16.8c-.9-.5-1.9.5-1.4 1.4l4.6 8.3ZM36.4 20.5l7.4-3.7c.9-.5 1.9.5 1.4 1.4l-4.6 8.3Z"
        fill="url(#goblin-skin)"
      />

      {/* Face */}
      <path
        d="M24 12.5c7 0 12.4 4.6 12.4 11.4 0 8-5.6 14.6-12.4 14.6S11.6 31.9 11.6 23.9c0-6.8 5.4-11.4 12.4-11.4Z"
        fill="url(#goblin-skin)"
      />

      {/* Eyes */}
      <ellipse cx="19" cy="24" rx="3" ry="3.4" fill="#FFFFFF" />
      <ellipse cx="29" cy="24" rx="3" ry="3.4" fill="#FFFFFF" />
      <circle cx="19.6" cy="24.4" r="1.7" fill="#14301F" />
      <circle cx="29.6" cy="24.4" r="1.7" fill="#14301F" />

      {/* Grin */}
      <path
        d="M18 30.5c1.7 1.9 3.8 2.9 6 2.9s4.3-1 6-2.9c-1.1 3.4-3.4 5.3-6 5.3s-4.9-1.9-6-5.3Z"
        fill="#14301F"
        opacity="0.85"
      />
      <path d="M20.4 31.6h1.9l-.4 2.1Z" fill="#FFFFFF" />
      <path d="M25.7 31.6h1.9l-.4 2.1Z" fill="#FFFFFF" />

      {/* Nose */}
      <path
        d="M24 25.4c1 0 1.8 1.1 1.8 2.1s-.8 1.3-1.8 1.3-1.8-.3-1.8-1.3.8-2.1 1.8-2.1Z"
        fill="#2F7D4B"
        opacity="0.6"
      />
    </svg>
  );
}
