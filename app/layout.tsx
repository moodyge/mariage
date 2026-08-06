import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Place Parfaite — Plan de table intelligent",
  description: "Créez un plan de table harmonieux pour votre mariage.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
