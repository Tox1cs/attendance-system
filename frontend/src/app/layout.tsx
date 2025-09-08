import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // This imports Tailwind CSS

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Attendance System",
  description: "Full-Stack Attendance App",
};

// This is the Root Layout for the entire application
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 text-gray-900`}>
        {/* All pages will be rendered inside the 'children' prop */}
        {children}
      </body>
    </html>
  );
}