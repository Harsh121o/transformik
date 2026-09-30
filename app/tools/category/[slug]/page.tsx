// app/tools/category/[slug]/page.tsx
import { SupabaseCache } from "@/utils/supabaseOptimized";
import { ToolsContent } from "@/app/tools/ToolsContent";
import type { Metadata } from "next";

export const revalidate = 43200; // Cache for 12 hours

const slugToTitle = (slug: string) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// Resolve the category name from its slug (provider-aware, never throws)
async function getCategoryNameFromSlug(slug: string): Promise<string> {
  const all = await SupabaseCache.getAllCategoryCounts();
  return all.find((c) => c.slug === slug)?.name || slugToTitle(slug);
}

// Random categories excluding the current one
async function getRandomCategories(
  excludeCategoryName: string,
  limit: number = 6
): Promise<{ name: string; slug: string; count: number }[]> {
  const all = await SupabaseCache.getAllCategoryCounts();
  const filtered = all.filter((c) => c.name !== excludeCategoryName);
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  return filtered.slice(0, limit);
}

// Generate static paths at build time
export async function generateStaticParams() {
  const slugs = await SupabaseCache.getAllCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const data = await SupabaseCache.getCategoryDetails(slug);

  const categoryName = data?.name || slug.replace(/-/g, " ");
  const title = data?.meta_title || `${categoryName} AI Tools | Transformik AI`;
  const description =
    data?.meta_description ||
    `Browse ${categoryName} AI tools and resources. Find the best AI tools for ${categoryName.toLowerCase()}.`;

  if (!data) {
    return {
      title: `${categoryName} AI Tools | Transformik AI`,
      description: `Browse ${categoryName} AI tools and resources. Find the best AI tools for ${categoryName.toLowerCase()}.`,
      alternates: {
        canonical: `https://www.transformik.com/tools/category/${slug}`,
      },
    };
  }

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.transformik.com/tools/category/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.transformik.com/tools/category/${slug}`,
    },
  };
}

export default async function ToolsByCategory({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    page?: string | string[];
    search?: string | string[];
    price?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) || {};

  // Extract query parameters
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const rawSearch = Array.isArray(sp.search) ? sp.search[0] : sp.search;
  const rawPrice = Array.isArray(sp.price) ? sp.price[0] : sp.price;

  const currentPage = rawPage ? Math.max(parseInt(rawPage, 10) || 1, 1) : 1;
  const searchQuery = rawSearch || "";
  const priceFilter = rawPrice || "all";

  // Fetch category metadata (meta_title, description, faqs) server-side from categories_details
  const catMeta = await SupabaseCache.getCategoryDetails(slug);

  // Get the actual category name by matching slug with real category names
  const categoryName = catMeta?.name || (await getCategoryNameFromSlug(slug));

  // Fetch tools for this specific category with pagination (15 per page)
  const result = await SupabaseCache.getToolsByCategory({
    categoryName,
    page: currentPage,
    pageSize: 15,
  });

  // Get random categories excluding the current category
  const randomCategories = await getRandomCategories(categoryName, 6);

  // Get all categories for the filter
  const categories = await SupabaseCache.getUniqueCategories();

  return (
    <ToolsContent
      tools={result.tools}
      categories={categories}
      categorySlug={slug}
      categoryMeta={catMeta ?? null}
      initialPage={currentPage}
      similarCategories={randomCategories}
      totalPages={result.totalPages}
      totalTools={result.total}
      initialSearch={searchQuery}
      initialPriceFilter={priceFilter}
    />
  );
}
