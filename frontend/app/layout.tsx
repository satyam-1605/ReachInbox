import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReachInbox Scheduler | Delayed Email Delivery System',
  description:
    'Production email job scheduler built with Express, BullMQ, Redis, PostgreSQL, and Elasticsearch.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased selection:bg-primary-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
