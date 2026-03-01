import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Superadmin',
  description: 'Panel de administración StarMOT para control operativo.',
};

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
