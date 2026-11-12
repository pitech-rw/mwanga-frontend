import type { SVGProps } from "react";
import type { Section } from "../../lib/nav";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function IconBase({ size = 18, className, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={props["aria-hidden"] ?? true}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconLayoutDashboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </IconBase>
  );
}

export function IconBatteryCharging(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M11 7-3 5h4l-3 5" />
      <path d="M14.856 6H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.935" />
      <path d="M22 14v-4" />
      <path d="M5.14 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.936" />
    </IconBase>
  );
}

export function IconBike(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </IconBase>
  );
}

export function IconNfc(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
      <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
      <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
      <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
    </IconBase>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 12h4" />
      <path d="M10 8h4" />
      <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
      <path d="M6 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2" />
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
    </IconBase>
  );
}

export function IconUser(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  );
}

export function IconShield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </IconBase>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </IconBase>
  );
}

export function IconArrowLeftRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </IconBase>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="9" cy="7" r="4" />
    </IconBase>
  );
}

export function IconTriangleAlert(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </IconBase>
  );
}

export function IconLandmark(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 22h18" />
      <path d="M6 18v-9" />
      <path d="M10 18v-9" />
      <path d="M14 18v-9" />
      <path d="M18 18v-9" />
      <path d="M4 9h16" />
      <path d="M12 2 4 9h16z" />
    </IconBase>
  );
}

export function IconBell(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </IconBase>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </IconBase>
  );
}

export function IconSun(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </IconBase>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
    </IconBase>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </IconBase>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </IconBase>
  );
}

const NAV_ICON_MAP = {
  overview: IconLayoutDashboard,
  topUp: IconWallet,
  riders: IconUsers,
  batteries: IconBatteryCharging,
  bikes: IconBike,
  cards: IconNfc,
  roles: IconShield,
  stations: IconMapPin,
  swaps: IconArrowLeftRight,
  users: IconUsers,
  owners: IconBuilding,
  agents: IconUser,
  violations: IconTriangleAlert,
  wallets: IconWallet,
  companyAccounts: IconLandmark,
} as const satisfies Record<Section, (props: IconProps) => React.JSX.Element>;

export function NavIcon({ section, className, size }: { section: Section; className?: string; size?: number }) {
  const Icon = NAV_ICON_MAP[section];
  return <Icon className={className} size={size} />;
}

export const icons = {
  layoutDashboard: IconLayoutDashboard,
  batteryCharging: IconBatteryCharging,
  bike: IconBike,
  nfc: IconNfc,
  building: IconBuilding,
  user: IconUser,
  shield: IconShield,
  mapPin: IconMapPin,
  arrowLeftRight: IconArrowLeftRight,
  users: IconUsers,
  triangleAlert: IconTriangleAlert,
  wallet: IconWallet,
  landmark: IconLandmark,
  bell: IconBell,
  logOut: IconLogOut,
  sun: IconSun,
  moon: IconMoon,
  search: IconSearch,
  chevronLeft: IconChevronLeft,
  chevronRight: IconChevronRight,
  chevronDown: IconChevronDown,
  plus: IconPlus,
};
