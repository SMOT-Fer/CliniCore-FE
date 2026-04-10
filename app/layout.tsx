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
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.dataset.themeMode='light';document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';localStorage.removeItem('starmot-theme-mode');}catch(e){document.documentElement.dataset.themeMode='light';document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';}})();`
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
