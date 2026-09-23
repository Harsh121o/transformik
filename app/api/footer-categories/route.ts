// app/api/footer-categories/route.ts
import { NextResponse } from "next/server";
import { SupabaseCache } from "@/utils/supabaseOptimized";

export async function GET() {
  try {
    const categories = await SupabaseCache.getUniqueCategories();
    // Return top 15 categories for footer
    return NextResponse.json({ categories: categories.slice(0, 15) });
  } catch (error) {
    console.error("Error in /api/footer-categories:", error);
    return NextResponse.json(
      { categories: [], error: "Failed to fetch footer categories" },
      { status: 500 }
    );
  }
}
