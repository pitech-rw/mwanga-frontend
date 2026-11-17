import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { LocaleProvider } from "../components/locale";
import { ThemeProvider } from "../components/theme";
import { ToastProvider } from "../components/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mwanga — Sign in",
  description: "Sign in to Mwanga battery swap operations",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f12" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`} data-theme="dark" data-locale="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mwanga-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var l=localStorage.getItem("mwanga-locale");if(l==="en"||l==="fr"){document.documentElement.lang=l;document.documentElement.dataset.locale=l;}}catch(e){}`,
          }}
        />
        <LocaleProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
