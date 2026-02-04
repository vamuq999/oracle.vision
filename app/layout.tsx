// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Oracle Vision Minter",
  description: "Mint Oracle Vision (VISION) on Ethereum Mainnet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
