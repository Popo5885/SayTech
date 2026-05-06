import { NextResponse } from "next/server";
import { getPublicCampaign } from "../../../../lib/live-store";
import { clientIp, rateLimit, rateLimitResponse } from "../../../../lib/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  // SECURITY: rate-limit anonymous access — 30 hits / 10s is plenty for the
  // landing page poller while preventing scraping/enumeration storms.
  const limit = rateLimit({
    key: `public:${clientIp(request)}`,
    limit: 30,
    windowMs: 10_000
  });
  const tooMany = rateLimitResponse(limit);
  if (tooMany) return tooMany;

  const { slug } = await context.params;

  return NextResponse.json(await getPublicCampaign(slug));
}
