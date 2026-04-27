import { NextResponse } from "next/server";
import { getPublicCampaign } from "../../../../lib/demo-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  return NextResponse.json(await getPublicCampaign(slug));
}
