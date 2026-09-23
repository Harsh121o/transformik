import { ToolCard } from "@/components/tools/ToolCard";
import { getPublicImageUrl } from "@/utils/getPublicImageUrl";
import { SupabaseCache } from "@/utils/supabaseOptimized";

interface RelatedToolsProps {
  currentToolId: number;
  categories: string[];
}

export async function RelatedTools({
  currentToolId,
  categories,
}: RelatedToolsProps) {
  const tools = await SupabaseCache.getRelatedTools(
    currentToolId,
    categories,
    4
  );

  const displayTools = tools.slice(0, 4);

  if (displayTools.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Related Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayTools.map((tool) => {
          const logoUrl = getPublicImageUrl(
            "Images",
            tool.logo ? `ToolLogos/${tool.logo}` : undefined
          );

          return (
            <ToolCard
              key={tool.id}
              tool={{
                tool_name: tool.tool_name,
                slug: tool.slug,
                one_line_description: tool.one_line_description,
                category: tool.category ?? undefined,
                pricing_model: tool.pricing_model as
                  | "Free"
                  | "Freemium"
                  | "Paid"
                  | "Free Trial"
                  | undefined,
                url: tool.url,
                logo: logoUrl,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
