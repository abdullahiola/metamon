import "./globals.css";

export const metadata = {
  title: "Metamon メタモン — The Self-Rewriting Program",
  description:
    "A program that rewrites its own source code to become whatever you want. Watch the transformation in real time.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
