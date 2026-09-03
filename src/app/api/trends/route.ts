import { NextResponse } from "next/server";
import { getTrendingTopics } from "@/lib/trends";

export async function GET() {
  const result = await getTrendingTopics();
  return NextResponse.json(result);
}
