/** Pre-filled on user create forms; must be NEXT_PUBLIC_* to be available in client components. */
export function getDefaultCreatePassword(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_PASSWORD?.trim();
  return fromEnv || "change-me";
}