import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard · Mwanga",
  description: "Battery swap operations and station management",
};

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
