// app/api/search/route.ts
import { NextResponse } from "next/server";
import { SupabaseCache } from "@/utils/supabaseOptimized";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query || query.length < 2) {
    return NextResponse.json({ tools: [], blogs: [] });
  }

  try {
    const results = await SupabaseCache.getSearchData(query);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in /api/search:", error);
    return NextResponse.json(
      { tools: [], blogs: [], error: "Failed to search" },
      { status: 500 }
    );
  }
}
