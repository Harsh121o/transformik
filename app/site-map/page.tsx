import { SupabaseCache } from "@/utils/supabaseOptimized";
import { SitemapContent } from "./SitemapContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Map | Find All Pages - Transformik AI",
  description:
    "Browse all pages and content on Transformik AI. Find tools, blog posts, categories, and resources easily.",
  alternates: {
    canonical: "https://www.transformik.com/site-map",
  },
};

export const revalidate = 86400; // Revalidate every 24 hours

interface BlogSummary {
  id: string;
  title: string;
  slug: string;
  created_at: string;
}

interface ToolSummary {
  id: string;
  tool_name: string;
  slug: string;
}

async function getBlogs(): Promise<BlogSummary[]> {
  try {
    const data = await SupabaseCache.getAllBlogs();
    return (data || []).map(
      (blog: {
        id: string | number;
        title: string;
        slug: string;
        created_at: string;
      }) => ({
        id: String(blog.id),
        title: blog.title,
        slug: blog.slug,
        created_at: blog.created_at,
      })
    );
  } catch (err) {
    console.error("Error fetching blogs:", err);
    return [];
  }
}

async function getTools(): Promise<ToolSummary[]> {
  try {
    const data = await SupabaseCache.getAllTools();
    return (data || []).map(
      (tool: { id: string | number; tool_name: string; slug: string }) => ({
        id: String(tool.id),
        tool_name: tool.tool_name,
        slug: tool.slug,
      })
    );
  } catch (err) {
    console.error("Error fetching tools:", err);
    return [];
  }
}

export default async function SitemapPage() {
  const blogs = await getBlogs();
  const tools = await getTools();

  return <SitemapContent blogs={blogs} tools={tools} />;
}
