import './globals.css';

export const metadata = {
  title: 'Hotelier Portal | Direct Booking Engine',
  description: 'Manage hotel direct reservations, rates, and inventory',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}