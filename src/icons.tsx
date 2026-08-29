import React from "react";

type P = { className?: string };
const base = (props: P, children: React.ReactNode, viewBox = "0 0 24 24") => (
  <svg
    className={props.className ?? "w-5 h-5"}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconTooth = (p: P) =>
  base(
    p,
    <path d="M12 3.4C10.2 2.3 7.7 1.9 6 3.2c-2 1.5-2.4 4-1.6 6.2.7 1.8 1.2 3.6 1.5 5.5.2 1.6.5 4.9 2.3 4.9 1.9 0 1.4-3.1 2-5.4.3-1.1.9-1.9 1.8-1.9s1.5.8 1.8 1.9c.6 2.3.1 5.4 2 5.4 1.8 0 2.1-3.3 2.3-4.9.3-1.9.8-3.7 1.5-5.5.8-2.2.4-4.7-1.6-6.2-1.7-1.3-4.2-.9-6 .2Z" />
  );

export const IconGrid = (p: P) =>
  base(
    p,
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="2" />
      <rect x="13.5" y="11" width="7" height="9.5" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    </>
  );

export const IconCalendar = (p: P) =>
  base(
    p,
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
    </>
  );

export const IconCalendarPlus = (p: P) =>
  base(
    p,
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5M12 12.5v5M9.5 15h5" />
    </>
  );

export const IconUsers = (p: P) =>
  base(
    p,
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17.8 14.9c1.6.7 2.4 2.2 2.7 4.1" />
    </>
  );

export const IconUserPlus = (p: P) =>
  base(
    p,
    <>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M4 19.5c.6-3.2 3-5 6-5 1.2 0 2.3.3 3.2.8M18 13.5v5M15.5 16h5" />
    </>
  );

export const IconReceipt = (p: P) =>
  base(
    p,
    <>
      <path d="M6 3.5h12v17l-2.4-1.6L13.2 20.5l-2.4-1.6-2.4 1.6-2.4-1.6V3.5Z" />
      <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </>
  );

export const IconSpark = (p: P) =>
  base(
    p,
    <>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.2l-1.8-5.6L4.5 10.8 10.2 9 12 3.5Z" />
      <path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" />
    </>
  );

export const IconSearch = (p: P) =>
  base(
    p,
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </>
  );

export const IconBell = (p: P) =>
  base(
    p,
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </>
  );

export const IconPlus = (p: P) => base(p, <path d="M12 5.5v13M5.5 12h13" />);
export const IconX = (p: P) => base(p, <path d="m6 6 12 12M18 6 6 18" />);
export const IconCheck = (p: P) => base(p, <path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconClock = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  );
export const IconPhone = (p: P) =>
  base(
    p,
    <path d="M5.5 4h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L16 14l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4Z" />
  );
export const IconPencil = (p: P) =>
  base(p, <path d="M14.5 5 19 9.5 8.5 20H4v-4.5L14.5 5ZM12.5 7l4.5 4.5" />);
export const IconTrash = (p: P) =>
  base(
    p,
    <>
      <path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5 7.5 20h9l1-13.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </>
  );
export const IconChevronDown = (p: P) => base(p, <path d="m6 9.5 6 6 6-6" />);
export const IconArrowLeft = (p: P) => base(p, <path d="M19 12H5m6-6-6 6 6 6" />);
export const IconEye = (p: P) =>
  base(
    p,
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  );
export const IconAlert = (p: P) =>
  base(
    p,
    <>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4M12 16.8h.01" />
    </>
  );
export const IconWallet = (p: P) =>
  base(
    p,
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M15 12h5v3h-5a1.5 1.5 0 0 1 0-3Z" />
    </>
  );
export const IconTrendUp = (p: P) => base(p, <path d="M4 17 10 11l4 4 6-7m0 0h-4.5M20 8v4.5" />);
export const IconFilter = (p: P) => base(p, <path d="M4 6h16M7 12h10m-7 6h4" />);
export const IconDrop = (p: P) =>
  base(p, <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />);
export const IconShield = (p: P) =>
  base(p, <path d="M12 3.5 5 6v6c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5V6l-7-2.5Z" />);
export const IconMenu = (p: P) => base(p, <path d="M4 7h16M4 12h16M4 17h10" />);
export const IconPrinter = (p: P) =>
  base(
    p,
    <>
      <path d="M7 8V4h10v4M7 17H4.5V10A2 2 0 0 1 6.5 8h11a2 2 0 0 1 2 2v7H17" />
      <rect x="7" y="14" width="10" height="6" rx="1" />
    </>
  );
export const IconHeart = (p: P) =>
  base(
    p,
    <path d="M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7.2 4.4 4.4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />
  );
export const IconCoins = (p: P) =>
  base(
    p,
    <>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </>
  );
export const IconScalpel = (p: P) =>
  base(
    p,
    <>
      <path d="M4 20c4-.5 7-2 9-4l5-5a2.12 2.12 0 0 0-3-3l-5 5c-2 2-3.5 5-6 7Z" />
      <path d="m13 8 3 3" />
    </>
  );
export const IconCrown = (p: P) =>
  base(
    p,
    <>
      <path d="M4 17 5 8l4 3 3-5 3 5 4-3 1 9H4Z" />
      <path d="M4 20h16" />
    </>
  );
export const IconIdCard = (p: P) =>
  base(
    p,
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="8.5" cy="11" r="1.8" />
      <path d="M6 15.5c.5-1.4 1.4-2 2.5-2s2 .6 2.5 2M14 9.5h4M14 12.5h4M14 15.5h2.5" />
    </>
  );
export const IconPulse = (p: P) => base(p, <path d="M3 12h4l2.5-6 4.5 12 2.5-6H21" />);

export const IconStetho = (p: P) =>
  base(
    p,
    <>
      <path d="M5 4v5a5 5 0 0 0 10 0V4" />
      <path d="M10 14v2.5a4.5 4.5 0 0 0 9 0V14" />
      <circle cx="19" cy="11.5" r="2.2" />
    </>
  );
/* زرعة سن (لولب) */
export const IconImplant = (p: P) =>
  base(
    p,
    <>
      <path d="M9.5 4h5l-.6 3.5h-3.8L9.5 4Z" />
      <path d="M10.3 9.5h3.4l-.4 3h-2.6l-.4-3ZM10.7 14.5h2.6l-.3 2.5h-2l-.3-2.5ZM11 19h2l-.4 2h-1.2L11 19Z" />
      <path d="M9.8 8h4.4M10.2 12.6h3.6" />
    </>
  );
/* تقويم (سلك وأقواس) */
export const IconBraces = (p: P) =>
  base(
    p,
    <>
      <path d="M3.5 12c2.5-1.5 5.5-1.5 8.5 0s6 1.5 8.5 0" />
      <rect x="5.5" y="8.8" width="4" height="4.4" rx="1" />
      <rect x="10" y="10.3" width="4" height="4.4" rx="1" />
      <rect x="14.5" y="8.8" width="4" height="4.4" rx="1" />
    </>
  );
/* أشعة (فيلم وسن) */
export const IconXray = (p: P) =>
  base(
    p,
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M12 7.2c-1.1-.7-2.7-.9-3.7-.1-1.2.9-1.4 2.4-.9 3.7.4 1.1.7 2.2.9 3.4.1 1 .3 2.6 1.4 2.6s1-.9 1.2-2.3c.1-.7.5-1.1 1.1-1.1s1 .4 1.1 1.1c.2 1.4.2 2.3 1.2 2.3s1.3-1.6 1.4-2.6c.2-1.2.5-2.3.9-3.4.5-1.3.3-2.8-.9-3.7-1-.8-2.6-.6-3.7.1Z" />
    </>
  );
export const IconLogout = (p: P) =>
  base(
    p,
    <>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </>
  );

export const IconSettings = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
    </>
  );

export const IconBook = (p: P) =>
  base(
    p,
    <>
      <path d="M12 6.5C10.5 5 8.4 4.3 6 4.3c-1 0-1.9.1-2.5.3v13.2c.6-.2 1.5-.3 2.5-.3 2.4 0 4.5.7 6 2.2 1.5-1.5 3.6-2.2 6-2.2 1 0 1.9.1 2.5.3V4.6c-.6-.2-1.5-.3-2.5-.3-2.4 0-4.5.7-6 2.2Z" />
      <path d="M12 6.5v13.2" />
    </>
  );

export const IconKey = (p: P) =>
  base(
    p,
    <>
      <circle cx="8" cy="9" r="4.2" />
      <path d="m11 12 8.5 8.5M16.5 17.5l2.5-2.5M14 15l2-2" />
    </>
  );

export const IconChat = (p: P) =>
  base(
    p,
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 4v-4h-1A2.5 2.5 0 0 1 4 13.5v-7Z" />
      <path d="M8 8.5h8M8 11.5h5" />
    </>
  );

export const IconBox = (p: P) =>
  base(
    p,
    <>
      <path d="M3.5 5h17v3.5h-17z" />
      <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5" />
      <path d="M9.5 12.5h5" />
    </>
  );

export const IconSun = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  );

export const IconMoon = (p: P) =>
  base(p, <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />);

export const IconSliders = (p: P) =>
  base(
    p,
    <>
      <path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="19" cy="16" r="2" />
    </>
  );

export const IconCopy = (p: P) =>
  base(
    p,
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  );

/* شعار العيادة */
export function Logo({ className = "w-10 h-10" }: P) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1273c4" />
      <rect width="64" height="64" rx="16" fill="url(#lg)" />
      <path
        d="M32 13c-4.6-2.9-11-3.8-15.4-.4-4.8 3.7-5.7 9.6-3.9 14.8 1.7 4.6 2.9 8.9 3.7 13.4.5 3.8 1.2 11.8 5.8 11.8 4.6 0 3.6-7.7 5.1-13.2.7-2.7 2.2-4.6 4.7-4.6s4 1.9 4.7 4.6c1.5 5.5.5 13.2 5.1 13.2 4.6 0 5.3-8 5.8-11.8.8-4.5 2-8.8 3.7-13.4 1.8-5.2.9-11.1-3.9-14.8C43 9.2 36.6 10.1 32 13Z"
        fill="#fff"
      />
      <path d="M14 36h8l3-6 4 9 3.5-6H50" stroke="#0b518f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#2f9fe0" />
          <stop offset="1" stopColor="#0b518f" />
        </linearGradient>
      </defs>
    </svg>
  );
}
