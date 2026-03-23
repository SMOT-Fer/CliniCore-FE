import { Metadata } from 'next';
import SuperadminDashboardClient from './dashboard.client';

export const metadata: Metadata = {
  title: 'Panel SuperAdmin',
  description: 'Gestión de clínicas y suscripciones'
};

export default function SuperAdminPage() {
  return <SuperadminDashboardClient />;
}
