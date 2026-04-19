import { TopicPortfolioView } from "@/features/topics/components/topic-portfolio-view";
import { readRequestLocale } from "@/lib/app-locale-server";
import { getTopicPortfolioOverview } from "@/server/services/topic-portfolio-service";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const locale = await readRequestLocale();
  const portfolio = await getTopicPortfolioOverview();

  return <TopicPortfolioView locale={locale} portfolio={portfolio} />;
}
