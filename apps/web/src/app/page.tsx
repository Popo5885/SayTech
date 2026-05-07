import { SiteLanding } from "../components/site-landing";
import { getSiteContent } from "../lib/site-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LandingPage() {
  const content = await getSiteContent();

  return <SiteLanding content={content} />;
}
