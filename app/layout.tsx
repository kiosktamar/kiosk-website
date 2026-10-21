import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiosk Tamar',
  description: 'מערכת הזמנות קיוסק תמר',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
