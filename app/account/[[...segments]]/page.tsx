import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AccountWorkspace } from "../../../components/account-workspace";
import { getMenuItem } from "../../../lib/nav";
import { sectionFromPathname } from "../../../lib/nav-path";

const ACCOUNT_BASE = "/account";

function accountPathname(segments: string[] | undefined): string {
  if (!segments?.length) {
    return ACCOUNT_BASE;
  }
  return `${ACCOUNT_BASE}/${segments.join("/")}`;
}

function titleForSection(pathname: string): string {
  const section = sectionFromPathname(pathname, ACCOUNT_BASE);
  const item = getMenuItem(section);
  if (section === "overview") {
    return "Overview";
  }
  return item.title;
}

type PageProps = {
  params: Promise<{ segments?: string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { segments } = await params;
  const pathname = accountPathname(segments);
  const label = titleForSection(pathname);
  return {
    title: `${label} — Mwanga`,
  };
}

/** Signals intentional dynamic content so `generateMetadata` may use `await params` with Cache Components / instant navigations. */
async function AccountDynamicMarker() {
  await connection();
  return null;
}

export default function AccountSegmentsPage() {
  return (
    <>
      <Suspense fallback={<div className="landing-shell landing-loading" aria-busy="true" />}>
        <AccountWorkspace pathPrefix="/account" />
      </Suspense>
      <Suspense fallback={null}>
        <AccountDynamicMarker />
      </Suspense>
    </>
  );
}
