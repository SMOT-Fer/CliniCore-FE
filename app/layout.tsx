import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "StarMOT",
    template: "%s | StarMOT",
  },
  description: "Plataforma clínica StarMOT para administración operativa y seguridad.",
  applicationName: "StarMOT",
  icons: {
    icon: "/logo.png?v=starmot-1",
    shortcut: "/logo.png?v=starmot-1",
    apple: "/logo.png?v=starmot-1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="preload" as="image" href="/galaxia.jpg" />
        <link rel="preload" as="image" href="/galaxia-claro.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key='starmot-theme-mode';var stored=localStorage.getItem(key);var mode=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='system'?(prefersDark?'dark':'light'):mode;document.documentElement.dataset.themeMode=mode;document.documentElement.dataset.theme=resolved;document.documentElement.style.colorScheme=resolved;}catch(e){document.documentElement.dataset.themeMode='system';document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';}})();`
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased starmot-app`}
      >
        {children}
      </body>
    </html>
  );
}
