import { Card, CardDescription, CardTitle } from "@lottery/ui";

export function StatCard({
  label,
  value,
  caption
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-5 top-0 h-24 rounded-full bg-orange-100/70 blur-2xl" />
      <p className="relative text-sm uppercase tracking-[0.22em] text-stone-500">{label}</p>
      <CardTitle className="relative mt-4 text-4xl">{value}</CardTitle>
      <CardDescription className="relative mt-3">{caption}</CardDescription>
    </Card>
  );
}
