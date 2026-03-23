import { redirect } from 'next/navigation';

type PageProps = {
  params: { empresa: string };
};
export default async function EmpresaTipoRedirectPage({ params }: PageProps) {
  redirect(`/clinica/${params.empresa}`);
}
