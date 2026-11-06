import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Battery swap operations and station management",
};

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
