import { TopicPortfolioView } from "@/features/topics/components/topic-portfolio-view";
import { getTopicPortfolioOverview } from "@/server/services/topic-portfolio-service";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const portfolio = await getTopicPortfolioOverview();

  return <TopicPortfolioView portfolio={portfolio} />;
}
