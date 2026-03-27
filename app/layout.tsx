import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/app/context/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CliniCore",
    template: "%s | CliniCore",
  },
  description: "Plataforma clínica CliniCore para administración operativa y seguridad.",
  applicationName: "CliniCore",
  icons: {
    icon: "/logo-clinicore.png",
    shortcut: "/logo-clinicore.png",
    apple: "/logo-clinicore.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key='starmot-theme-mode';var stored=localStorage.getItem(key);var mode=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='system'?(prefersDark?'dark':'light'):mode;document.documentElement.dataset.themeMode=mode;document.documentElement.dataset.theme=resolved;document.documentElement.style.colorScheme=resolved;}catch(e){document.documentElement.dataset.themeMode='system';document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';}})();`
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased starmot-app`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
