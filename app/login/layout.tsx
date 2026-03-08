import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Acceso seguro a CliniCore.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
