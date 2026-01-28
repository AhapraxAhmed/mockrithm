import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import { Toaster } from "sonner";

import AuthLayout from "@/components/Authlayout";
import FooterWrapper from "@/components/shared/FooterWrapper";
import { getCurrentUser } from "@/lib/actions/auth.action";

import "./globals.css";

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mockrithm",
  description: "An AI-powered platform for mock interviews and admin control",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="dark">
      <body
        className={`${monaSans.className} bg-black text-white antialiased pattern`}
      >
        <AuthLayout initialUserId={user?.id} initialUserName={user?.name}>
          {children}
        </AuthLayout>
        <Toaster />
        <FooterWrapper />
      </body>
    </html>
  );
}

