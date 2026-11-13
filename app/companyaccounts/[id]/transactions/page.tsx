import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy URL — keep deep links working inside the account workspace. */
export const instant = false;

export default async function CompanyAccountTransactionsRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/account/companyAccounts/${id}/transactions`);
}
