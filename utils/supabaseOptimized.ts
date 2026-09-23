// utils/supabaseOptimized.ts - Cached queries with dual-provider support (Neon & Supabase)
import { supabaseServer } from "./supabaseServer";
import { cache } from "@/lib/cache";
import { isNeonProvider, getNeonSql } from "./db";

export class SupabaseCache {
  // Get all tools with caching
  static async getAllTools(): Promise<any[]> {
    const cacheKey = "all_tools";
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log("✓ Tools served from cache");
      return cached as any[];
    }

    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT * FROM tools_summary ORDER BY tool_name ASC
        `) as any[];
        cache.set(cacheKey, rows || [], 1440);
        console.log(`✓ Cached ${rows?.length || 0} tools (Neon)`);
        return rows || [];
      }

      let allTools: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseServer
          .from("tools_summary")
          .select("*")
          .order("tool_name", { ascending: true })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allTools = [...allTools, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      cache.set(cacheKey, allTools, 1440);
      console.log(`✓ Cached ${allTools.length} tools (Supabase)`);
      return allTools;
    } catch (error) {
      console.error("Error fetching tools:", error);
      return [];
    }
  }

  // Get all blogs with caching
  static async getAllBlogs(): Promise<any[]> {
    const cacheKey = "all_blogs";
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log("✓ Blogs served from cache");
      return cached as any[];
    }

    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT * FROM blogs_summary ORDER BY created_at DESC
        `) as any[];
        cache.set(cacheKey, rows || [], 1440);
        console.log(`✓ Cached ${rows?.length || 0} blogs (Neon)`);
        return rows || [];
      }

      const { data, error } = await supabaseServer
        .from("blogs_summary")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      cache.set(cacheKey, data || [], 1440);
      console.log(`✓ Cached ${data?.length || 0} blogs (Supabase)`);
      return data || [];
    } catch (error) {
      console.error("Error fetching blogs:", error);
      return [];
    }
  }

  // Get latest tools with caching
  static async getLatestTools(limit = 6): Promise<any[]> {
    const cacheKey = `latest_tools_${limit}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log("✓ Latest tools served from cache");
      return cached as any[];
    }

    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT id, tool_name, slug, one_line_description, pricing_model, url, logo, category
          FROM tools_summary
          ORDER BY created_at DESC
          LIMIT ${limit}
        `) as any[];
        cache.set(cacheKey, rows || [], 720);
        console.log(`✓ Cached ${rows?.length || 0} latest tools (Neon)`);
        return rows || [];
      }

      const { data, error } = await supabaseServer
        .from("tools_summary")
        .select(
          "id, tool_name, slug, one_line_description, pricing_model, url, logo, category"
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      cache.set(cacheKey, data || [], 720);
      console.log(`✓ Cached ${data?.length || 0} latest tools (Supabase)`);
      return data || [];
    } catch (error) {
      console.error("Error fetching latest tools:", error);
      return [];
    }
  }

  // Get latest blogs with caching
  static async getLatestBlogs(limit = 5): Promise<any[]> {
    const cacheKey = `latest_blogs_${limit}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log("✓ Latest blogs served from cache");
      return cached as any[];
    }

    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT id, title, slug, excerpt, featured_image
          FROM blogs_summary
          ORDER BY created_at DESC
          LIMIT ${limit}
        `) as any[];
        cache.set(cacheKey, rows || [], 720);
        console.log(`✓ Cached ${rows?.length || 0} latest blogs (Neon)`);
        return rows || [];
      }

      const { data, error } = await supabaseServer
        .from("blogs_summary")
        .select("id, title, slug, excerpt, featured_image")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      cache.set(cacheKey, data || [], 720);
      console.log(`✓ Cached ${data?.length || 0} latest blogs (Supabase)`);
      return data || [];
    } catch (error) {
      console.error("Error fetching latest blogs:", error);
      return [];
    }
  }

  // Get sitemap data with caching
  static async getSitemapData(): Promise<any> {
    const cacheKey = "sitemap_data";
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log("✓ Sitemap data served from cache");
      return cached;
    }

    try {
      console.log("Starting to fetch sitemap data...");

      if (isNeonProvider()) {
        const sql = getNeonSql();
        const [categoriesData, blogsData, toolsData] = await Promise.all([
          sql`SELECT category FROM tools_summary WHERE category IS NOT NULL` as Promise<any[]>,
          sql`SELECT slug, created_at FROM blogs_summary ORDER BY created_at DESC` as Promise<any[]>,
          sql`SELECT slug, created_at FROM tools_summary ORDER BY created_at DESC` as Promise<any[]>,
        ]);

        const allCategories: string[] = [];
        (categoriesData || []).forEach((item: any) => {
          if (item.category) {
            if (Array.isArray(item.category)) {
              allCategories.push(...item.category);
            } else if (typeof item.category === "string") {
              allCategories.push(item.category);
            }
          }
        });

        const uniqueCategories = Array.from(new Set(allCategories))
          .filter((category) => category && category.trim())
          .map((category) =>
            category
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)+/g, "")
          );

        const sitemapData = {
          categories: uniqueCategories,
          blogs: blogsData || [],
          tools: toolsData || [],
        };

        cache.set(cacheKey, sitemapData, 1440);
        console.log(
          `✓ Cached sitemap data (Neon): ${uniqueCategories.length} categories, ${blogsData?.length || 0} blogs, ${toolsData?.length || 0} tools`
        );
        return sitemapData;
      }

      // Supabase implementation
      let allCategoriesData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseServer
          .from("tools_summary")
          .select("category")
          .not("category", "is", null)
          .range(from, from + batchSize - 1);

        if (error) break;

        if (data && data.length > 0) {
          allCategoriesData = [...allCategoriesData, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const allCategories: string[] = [];
      allCategoriesData.forEach((item) => {
        if (item.category) {
          if (Array.isArray(item.category)) {
            allCategories.push(...item.category);
          } else if (typeof item.category === "string") {
            allCategories.push(item.category);
          }
        }
      });

      const uniqueCategories = Array.from(new Set(allCategories))
        .filter((category) => category && category.trim())
        .map((category) =>
          category
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "")
        );

      const { data: blogs } = await supabaseServer
        .from("blogs_summary")
        .select("slug, created_at")
        .order("created_at", { ascending: false });

      let allTools: any[] = [];
      from = 0;
      hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseServer
          .from("tools_summary")
          .select("slug, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) break;

        if (data && data.length > 0) {
          allTools = [...allTools, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const sitemapData = {
        categories: uniqueCategories,
        blogs: blogs || [],
        tools: allTools,
      };

      cache.set(cacheKey, sitemapData, 1440);
      return sitemapData;
    } catch (error) {
      console.error("Error fetching sitemap data:", error);
      return { categories: [], blogs: [], tools: [] };
    }
  }

  // Get paginated and filtered tools
  static async getFilteredTools({
    page = 1,
    pageSize = 15,
    search = "",
    category = "all",
    priceFilter = "all",
  }: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    priceFilter?: string;
  }) {
    try {
      const from = (page - 1) * pageSize;

      if (isNeonProvider()) {
        const sql = getNeonSql();
        const searchPattern = search ? `%${search}%` : null;
        const categoryPattern =
          category && category !== "all" ? `%${category}%` : null;
        const targetPrice =
          priceFilter && priceFilter !== "all" ? priceFilter : null;

        const rows = (await sql`
          SELECT *, COUNT(*) OVER() as total_count
          FROM tools_summary
          WHERE (${searchPattern}::text IS NULL OR tool_name ILIKE ${searchPattern})
            AND (${categoryPattern}::text IS NULL OR category::text ILIKE ${categoryPattern})
            AND (${targetPrice}::text IS NULL OR pricing_model = ${targetPrice})
          ORDER BY tool_name ASC
          LIMIT ${pageSize} OFFSET ${from}
        `) as any[];

        const totalCount = rows && rows.length > 0 ? Number(rows[0].total_count) : 0;
        const uniqueTools = Array.from(
          new Map((rows || []).map((tool: any) => [tool.id, tool])).values()
        );

        return {
          tools: uniqueTools,
          total: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }

      // Supabase implementation
      let query = supabaseServer
        .from("tools_summary")
        .select("*", { count: "exact" })
        .order("tool_name", { ascending: true });

      if (search) {
        query = query.ilike("tool_name", `%${search}%`);
      }

      if (category && category !== "all") {
        query = query.contains("category", [category]);
      }

      if (priceFilter && priceFilter !== "all") {
        query = query.eq("pricing_model", priceFilter);
      }

      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const uniqueTools = data
        ? Array.from(new Map(data.map((tool) => [tool.id, tool])).values())
        : [];

      return {
        tools: uniqueTools,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error("Error fetching filtered tools:", error);
      return {
        tools: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Get tools by category with pagination
  static async getToolsByCategory({
    categoryName,
    page = 1,
    pageSize = 15,
  }: {
    categoryName: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      const from = (page - 1) * pageSize;

      if (isNeonProvider()) {
        const sql = getNeonSql();
        const categoryPattern = `%${categoryName}%`;

        const rows = (await sql`
          SELECT *, COUNT(*) OVER() as total_count
          FROM tools_summary
          WHERE category::text ILIKE ${categoryPattern}
          ORDER BY tool_name ASC
          LIMIT ${pageSize} OFFSET ${from}
        `) as any[];

        const totalCount = rows && rows.length > 0 ? Number(rows[0].total_count) : 0;

        return {
          tools: rows || [],
          total: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }

      const { data, error, count } = await supabaseServer
        .from("tools_summary")
        .select("*", { count: "exact" })
        .contains("category", [categoryName])
        .order("tool_name", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      return {
        tools: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error("Error fetching tools by category:", error);
      return {
        tools: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Get unique categories
  static async getUniqueCategories(): Promise<string[]> {
    const cacheKey = "unique_categories";
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log("✓ Categories served from cache");
      return cached as string[];
    }

    try {
      let allCategoriesData: any[] = [];

      if (isNeonProvider()) {
        const sql = getNeonSql();
        allCategoriesData = (await sql`
          SELECT category FROM tools_summary WHERE category IS NOT NULL
        `) as any[];
      } else {
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabaseServer
            .from("tools_summary")
            .select("category")
            .not("category", "is", null)
            .range(from, from + batchSize - 1);

          if (error) break;

          if (data && data.length > 0) {
            allCategoriesData = [...allCategoriesData, ...data];
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
      }

      const allCategories: string[] = [];
      allCategoriesData.forEach((item) => {
        if (item.category) {
          if (Array.isArray(item.category)) {
            allCategories.push(...item.category.filter(Boolean));
          } else if (typeof item.category === "string") {
            allCategories.push(item.category);
          }
        }
      });

      const uniqueCategories = Array.from(new Set(allCategories))
        .filter((cat) => cat && cat.trim())
        .sort();

      cache.set(cacheKey, uniqueCategories, 1440);
      console.log(`✓ Cached ${uniqueCategories.length} unique categories`);

      return uniqueCategories;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }

  // Get filtered free tools
  static async getFilteredFreeTools({
    page = 1,
    pageSize = 9,
    search = "",
    category = "all",
    sortMode = "alpha-asc",
  }: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    sortMode?: string;
  }) {
    try {
      const from = (page - 1) * pageSize;

      if (isNeonProvider()) {
        const sql = getNeonSql();
        const searchPattern = search ? `%${search}%` : null;
        const categoryPattern =
          category && category !== "all" ? `%${category}%` : null;

        const rows = (sortMode === "alpha-desc"
          ? await sql`
              SELECT id, tool_name, slug, one_line_description, pricing_model, url, logo, category, COUNT(*) OVER() as total_count
              FROM tools_summary
              WHERE pricing_model = 'Free'
                AND (${searchPattern}::text IS NULL OR tool_name ILIKE ${searchPattern})
                AND (${categoryPattern}::text IS NULL OR category::text ILIKE ${categoryPattern})
              ORDER BY tool_name DESC
              LIMIT ${pageSize} OFFSET ${from}
            `
          : await sql`
              SELECT id, tool_name, slug, one_line_description, pricing_model, url, logo, category, COUNT(*) OVER() as total_count
              FROM tools_summary
              WHERE pricing_model = 'Free'
                AND (${searchPattern}::text IS NULL OR tool_name ILIKE ${searchPattern})
                AND (${categoryPattern}::text IS NULL OR category::text ILIKE ${categoryPattern})
              ORDER BY tool_name ASC
              LIMIT ${pageSize} OFFSET ${from}
            `) as any[];

        const totalCount = rows && rows.length > 0 ? Number(rows[0].total_count) : 0;
        const uniqueTools = Array.from(
          new Map((rows || []).map((tool: any) => [tool.id, tool])).values()
        );

        return {
          tools: uniqueTools,
          total: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }

      let query = supabaseServer
        .from("tools_summary")
        .select(
          "id,tool_name,slug,one_line_description,pricing_model,url,logo,category",
          { count: "exact" }
        )
        .eq("pricing_model", "Free");

      if (search) {
        query = query.ilike("tool_name", `%${search}%`);
      }

      if (category && category !== "all") {
        query = query.contains("category", [category]);
      }

      if (sortMode === "alpha-desc") {
        query = query.order("tool_name", { ascending: false });
      } else {
        query = query.order("tool_name", { ascending: true });
      }

      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const uniqueTools = data
        ? Array.from(new Map(data.map((tool) => [tool.id, tool])).values())
        : [];

      return {
        tools: uniqueTools,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error("Error fetching free tools:", error);
      return {
        tools: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Get free tool categories
  static async getFreeToolCategories(): Promise<string[]> {
    const cacheKey = "free_tool_categories";
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached as string[];
    }

    try {
      let data: any[] = [];
      if (isNeonProvider()) {
        const sql = getNeonSql();
        data = (await sql`
          SELECT category FROM tools_summary WHERE pricing_model = 'Free' AND category IS NOT NULL
        `) as any[];
      } else {
        const res = await supabaseServer
          .from("tools_summary")
          .select("category")
          .eq("pricing_model", "Free")
          .not("category", "is", null);
        data = res.data || [];
      }

      const allCategories: string[] = [];
      data?.forEach((item) => {
        if (item.category) {
          if (Array.isArray(item.category)) {
            allCategories.push(...item.category.filter(Boolean));
          } else if (typeof item.category === "string") {
            allCategories.push(item.category);
          }
        }
      });

      const uniqueCategories = Array.from(new Set(allCategories))
        .filter((cat) => cat && cat.trim())
        .sort();

      cache.set(cacheKey, uniqueCategories, 1440);
      return uniqueCategories;
    } catch (error) {
      console.error("Error fetching free tool categories:", error);
      return [];
    }
  }

  // Get top categories
  static async getTopCategories(limit = 6): Promise<string[]> {
    const cacheKey = `top_categories_${limit}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      return cached as string[];
    }

    try {
      let data: any[] = [];
      if (isNeonProvider()) {
        const sql = getNeonSql();
        data = (await sql`
          SELECT category FROM tools_summary WHERE category IS NOT NULL LIMIT 1000
        `) as any[];
      } else {
        const res = await supabaseServer
          .from("tools_summary")
          .select("category")
          .not("category", "is", null)
          .limit(1000);
        data = res.data || [];
      }

      const categoryCount: { [key: string]: number } = {};

      data?.forEach((item) => {
        if (item.category) {
          const categories = Array.isArray(item.category)
            ? item.category
            : [item.category];

          categories.forEach((cat: string) => {
            if (cat && cat.trim()) {
              categoryCount[cat] = (categoryCount[cat] || 0) + 1;
            }
          });
        }
      });

      const topCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([category]) => category);

      cache.set(cacheKey, topCategories, 720);
      return topCategories;
    } catch (error) {
      console.error("Error fetching top categories:", error);
      return [];
    }
  }

  // Get filtered blogs with pagination
  static async getFilteredBlogs({
    page = 1,
    pageSize = 8,
    sortOption = "date-desc",
  }: {
    page?: number;
    pageSize?: number;
    sortOption?: string;
  }) {
    try {
      const from = (page - 1) * pageSize;

      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (sortOption === "date-asc"
          ? await sql`
              SELECT *, COUNT(*) OVER() as total_count
              FROM blogs_summary
              ORDER BY created_at ASC
              LIMIT ${pageSize} OFFSET ${from}
            `
          : await sql`
              SELECT *, COUNT(*) OVER() as total_count
              FROM blogs_summary
              ORDER BY created_at DESC
              LIMIT ${pageSize} OFFSET ${from}
            `) as any[];

        const totalCount = rows && rows.length > 0 ? Number(rows[0].total_count) : 0;
        return {
          blogs: rows || [],
          total: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }

      let query = supabaseServer
        .from("blogs_summary")
        .select("*", { count: "exact" });

      if (sortOption === "date-asc") {
        query = query.order("created_at", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        blogs: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error("Error fetching blogs:", error);
      return {
        blogs: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Single item helper: Get tool summary by slug
  static async getToolSummaryBySlug(slug: string): Promise<any> {
    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT id, tool_name, slug, one_line_description, pricing_model, url, logo, category, created_at
          FROM tools_summary
          WHERE slug = ${slug}
          LIMIT 1
        `) as any[];
        return rows && rows.length > 0 ? rows[0] : null;
      }

      const { data, error } = await supabaseServer
        .from("tools_summary")
        .select(
          "id, tool_name, slug, one_line_description, pricing_model, url, logo, category, created_at"
        )
        .eq("slug", slug)
        .single();

      if (error) return null;
      return data;
    } catch (err) {
      console.error("Error fetching tool summary by slug:", err);
      return null;
    }
  }

  // Single item helper: Get tool details by ID
  static async getToolDetailsById(id: string | number): Promise<any> {
    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT * FROM tools_details WHERE id = ${id} LIMIT 1
        `) as any[];
        return rows && rows.length > 0 ? rows[0] : null;
      }

      const { data, error } = await supabaseServer
        .from("tools_details")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;
      return data;
    } catch (err) {
      console.error("Error fetching tool details by ID:", err);
      return null;
    }
  }

  // Single item helper: Get blog summary by slug
  static async getBlogSummaryBySlug(slug: string): Promise<any> {
    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT * FROM blogs_summary WHERE slug = ${slug} LIMIT 1
        `) as any[];
        return rows && rows.length > 0 ? rows[0] : null;
      }

      const { data, error } = await supabaseServer
        .from("blogs_summary")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) return null;
      return data;
    } catch (err) {
      console.error("Error fetching blog summary by slug:", err);
      return null;
    }
  }

  // Single item helper: Get blog details by ID
  static async getBlogDetailsById(id: string | number): Promise<any> {
    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT * FROM blogs_details WHERE id = ${id} LIMIT 1
        `) as any[];
        return rows && rows.length > 0 ? rows[0] : null;
      }

      const { data, error } = await supabaseServer
        .from("blogs_details")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;
      return data;
    } catch (err) {
      console.error("Error fetching blog details by ID:", err);
      return null;
    }
  }

  // Helper: Get related tools
  static async getRelatedTools(
    currentToolId: string | number,
    categories: string[],
    limit = 4
  ): Promise<any[]> {
    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const primaryCategory = categories && categories.length > 0 ? `%${categories[0]}%` : null;

        const rows = (await sql`
          SELECT id, tool_name, slug, one_line_description, logo, category, pricing_model, url
          FROM tools_summary
          WHERE id::text != ${String(currentToolId)}
            AND (${primaryCategory}::text IS NULL OR category::text ILIKE ${primaryCategory})
          ORDER BY tool_name ASC
          LIMIT ${limit}
        `) as any[];
        return rows || [];
      }

      let query = supabaseServer
        .from("tools_summary")
        .select("id, tool_name, slug, one_line_description, logo, category, pricing_model, url")
        .neq("id", currentToolId);

      if (categories && categories.length > 0) {
        query = query.contains("category", [categories[0]]);
      }

      const { data } = await query.order("tool_name", { ascending: true }).limit(limit);
      return data || [];
    } catch (err) {
      console.error("Error fetching related tools:", err);
      return [];
    }
  }

  // Helper: Get related blogs
  static async getRelatedBlogs(currentBlogId: string | number, limit = 3): Promise<any[]> {
    try {
      if (isNeonProvider()) {
        const sql = getNeonSql();
        const rows = (await sql`
          SELECT id, title, slug, excerpt, featured_image
          FROM blogs_summary
          WHERE id::text != ${String(currentBlogId)}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `) as any[];
        return rows || [];
      }

      const { data } = await supabaseServer
        .from("blogs_summary")
        .select("id, title, slug, excerpt, featured_image")
        .neq("id", currentBlogId)
        .limit(limit);

      return data || [];
    } catch (err) {
      console.error("Error fetching related blogs:", err);
      return [];
    }
  }

  // Helper: Get search suggestions (tools & blogs)
  static async getSearchData(query: string): Promise<{ tools: any[]; blogs: any[] }> {
    if (!query || query.length < 2) {
      return { tools: [], blogs: [] };
    }

    try {
      const searchPattern = `%${query}%`;

      if (isNeonProvider()) {
        const sql = getNeonSql();
        const [tools, blogs] = await Promise.all([
          sql`
            SELECT id, tool_name, slug, one_line_description
            FROM tools_summary
            WHERE tool_name ILIKE ${searchPattern}
            LIMIT 3
          ` as Promise<any[]>,
          sql`
            SELECT id, title, slug, excerpt
            FROM blogs_summary
            WHERE title ILIKE ${searchPattern}
            LIMIT 3
          ` as Promise<any[]>,
        ]);
        return { tools: tools || [], blogs: blogs || [] };
      }

      const [toolRes, blogRes] = await Promise.all([
        supabaseServer
          .from("tools_summary")
          .select("id, tool_name, slug, one_line_description")
          .ilike("tool_name", searchPattern)
          .limit(3),
        supabaseServer
          .from("blogs_summary")
          .select("id, title, slug, excerpt")
          .ilike("title", searchPattern)
          .limit(3),
      ]);

      return {
        tools: toolRes.data || [],
        blogs: blogRes.data || [],
      };
    } catch (err) {
      console.error("Error in getSearchData:", err);
      return { tools: [], blogs: [] };
    }
  }

  // Helper: Get categories with counts (for /tools/category page)
  static async getAllCategoryCounts(): Promise<any[]> {
    try {
      let allTools: { category?: string | string[] | null }[] = [];

      if (isNeonProvider()) {
        const sql = getNeonSql();
        allTools = (await sql`
          SELECT category FROM tools_summary WHERE category IS NOT NULL
        `) as any[];
      } else {
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabaseServer
            .from("tools_summary")
            .select("category")
            .range(from, from + batchSize - 1);

          if (error) break;
          if (data && data.length > 0) {
            allTools = [...allTools, ...data];
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
      }

      const categoryCounts: { [key: string]: number } = {};

      allTools.forEach((tool) => {
        const cat = tool.category;
        if (Array.isArray(cat)) {
          cat.forEach((c) => {
            if (c && typeof c === "string" && c.trim()) {
              const clean = c.trim();
              categoryCounts[clean] = (categoryCounts[clean] || 0) + 1;
            }
          });
        } else if (typeof cat === "string" && cat.trim()) {
          const clean = cat.trim();
          categoryCounts[clean] = (categoryCounts[clean] || 0) + 1;
        }
      });

      const categories = Object.entries(categoryCounts).map(
        ([name, count]) => ({
          name,
          count,
          slug: name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, ""),
        })
      );

      categories.sort((a, b) => b.count - a.count);
      return categories;
    } catch (err) {
      console.error("Error fetching category counts:", err);
      return [];
    }
  }

  // Clear specific cache
  static clearCache(key: string) {
    cache.clear();
  }

  // Clear all cache
  static clearAllCache() {
    cache.clear();
  }
}
