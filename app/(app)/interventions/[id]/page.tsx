import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function InterventionDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/interventions/${id}/map`);
}
