import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThinkRevise AI | Academic Writing Revision Coach",
  description: "Practise academic English, revise your writing and reflect on your learning with carefully bounded AI support.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
