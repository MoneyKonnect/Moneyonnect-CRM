import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient } from "@/actions/clients";
import { getFamilyGroupsForClient } from "@/actions/family";
import { ClientProfileHeader } from "@/components/clients/profile/client-profile-header";
import { ClientProfileTabs } from "@/components/clients/profile/client-profile-tabs";

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClientPageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) return { title: "Client Not Found" };
  return { title: client.fullName };
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { id } = await params;
  const [client, familyGroups] = await Promise.all([
    getClient(id),
    getFamilyGroupsForClient(id),
  ]);

  if (!client) notFound();

  return (
    <div className="flex flex-col min-h-full">
      <ClientProfileHeader client={client} />
      <div className="flex-1 px-6 pb-8">
        <ClientProfileTabs client={client} familyGroups={familyGroups} />
      </div>
    </div>
  );
}
