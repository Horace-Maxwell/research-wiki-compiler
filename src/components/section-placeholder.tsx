import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionPlaceholderProps = {
  section: string;
  description: string;
  milestone: string;
};

export function SectionPlaceholder({
  section,
  description,
  milestone,
}: SectionPlaceholderProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>{section}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm leading-7 text-muted-foreground">
        Reserved for {milestone}. The navigation is stable now so later milestones can
        plug into a real product shell instead of replacing a temporary demo surface.
      </CardContent>
    </Card>
  );
}

