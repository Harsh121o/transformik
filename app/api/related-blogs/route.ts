// app/api/related-blogs/route.ts
import { NextResponse } from "next/server";
import { SupabaseCache } from "@/utils/supabaseOptimized";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currentBlogId = searchParams.get("currentBlogId") || "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 3;

  try {
    const blogs = await SupabaseCache.getRelatedBlogs(currentBlogId, limit);
    return NextResponse.json({ blogs });
  } catch (error) {
    console.error("Error in /api/related-blogs:", error);
    return NextResponse.json(
      { blogs: [], error: "Failed to fetch related blogs" },
      { status: 500 }
    );
  }
}
