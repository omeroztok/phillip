import type { SVGProps } from "react";

// One small stroke-icon set, hand-drawn to match a single weight and corner
// radius. Kept local instead of pulling in an icon package: a dozen icons
// isn't worth the dependency, and it means every glyph actually fits the
// dashboard's own line weight. Always paired with a visible text label, so
// they're decorative (aria-hidden) by default.

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function IconGrid({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <rect x="2.75" y="2.75" width="6" height="6" rx="1.5" />
      <rect x="11.25" y="2.75" width="6" height="6" rx="1.5" />
      <rect x="2.75" y="11.25" width="6" height="6" rx="1.5" />
      <rect x="11.25" y="11.25" width="6" height="6" rx="1.5" />
    </svg>
  );
}

export function IconUsers({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <circle cx="7.25" cy="6.5" r="2.65" />
      <path d="M2.5 16.2c0-2.6 2.1-4.2 4.75-4.2s4.75 1.6 4.75 4.2" />
      <path d="M12.6 4.3c1.3.35 2.15 1.5 2.15 2.9 0 1.35-.8 2.45-2 2.85" />
      <path d="M13.7 12.15c1.9.5 3.15 1.9 3.15 4" />
    </svg>
  );
}

export function IconFunnel({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M3 3.5h14l-4.9 6.3v5.3l-4.2 1.9v-7.2z" />
    </svg>
  );
}

export function IconChat({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M3 4.5h14v9H8.8L5 16.8V13.5H3z" />
      <path d="M6.5 8h7" strokeWidth={1.4} />
      <path d="M6.5 10.6h4.5" strokeWidth={1.4} />
    </svg>
  );
}

export function IconGear({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.9v2.1M10 15v2.1M17.1 10h-2.1M5 10H2.9M15.1 4.9l-1.5 1.5M6.4 13.6l-1.5 1.5M15.1 15.1l-1.5-1.5M6.4 6.4L4.9 4.9" />
    </svg>
  );
}

export function IconSearch({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <circle cx="9" cy="9" r="5.6" />
      <path d="M13.4 13.4 17.5 17.5" />
    </svg>
  );
}

export function IconBell({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M5.2 8.4c0-3 1.9-5.1 4.8-5.1s4.8 2.1 4.8 5.1c0 2.9.7 3.9 1.7 4.9H3.5c1-1 1.7-2 1.7-4.9z" />
      <path d="M8 15.8c.35.9 1 1.4 2 1.4s1.65-.5 2-1.4" />
    </svg>
  );
}

export function IconUserPlus({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 4.5v5M13 7h5" />
    </svg>
  );
}

export function IconPulse({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M2.5 10.5h3.2l1.7-4.2 2.8 8 2-6.4 1.4 2.6h3.9" />
    </svg>
  );
}

export function IconCheckBadge({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M10 2.6l1.9 1.05 2.15-.2 1.05 1.9 1.9 1.05-.2 2.15 1.05 1.9-1.05 1.9.2 2.15-1.9 1.05-1.05 1.9-2.15-.2L10 18.9l-1.9-1.05-2.15.2-1.05-1.9-1.9-1.05.2-2.15L2.15 11l1.05-1.9-.2-2.15 1.9-1.05 1.05-1.9 2.15.2z" />
      <path d="M7.2 10.1l1.9 1.9 3.7-3.9" />
    </svg>
  );
}

export function IconCoin({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.4v7.2M12.3 7.9c0-.9-1-1.5-2.3-1.5-1.4 0-2.4.6-2.4 1.6 0 1.1.9 1.4 2.4 1.7 1.5.3 2.4.7 2.4 1.8 0 1-1 1.6-2.4 1.6-1.3 0-2.3-.6-2.3-1.5" />
    </svg>
  );
}

export function IconGauge({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M3 12.5a7 7 0 1 1 14 0" />
      <path d="M10 12.5 13.2 8" />
      <path d="M3 12.5h1.4M15.6 12.5H17" strokeWidth={1.4} />
    </svg>
  );
}

export function IconHeatmap({ size = 18, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <circle cx="10" cy="10" r="7.25" />
      <circle cx="10" cy="10" r="4.25" strokeWidth={1.4} />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconChevronDown({ size = 14, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

export function IconLogout({ size = 16, ...rest }: IconProps) {
  return (
    <svg aria-hidden="true" {...base(size)} {...rest}>
      <path d="M8 3.5H4.5v13H8" />
      <path d="M8 10h8.5M13.5 6.5 17 10l-3.5 3.5" />
    </svg>
  );
}
