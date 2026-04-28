import { ContactsSyncCard } from "../../../components/contacts-sync-card";
import { getContactsOverview } from "../../../lib/live-store";

export default async function ContactsPage() {
  const overview = await getContactsOverview();

  return <ContactsSyncCard {...overview} />;
}
