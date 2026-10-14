import { HomePage } from "@/components/home-page";
import { daysUntilWedding } from "@/data/sample";

export default function Page() {
  return <HomePage days={daysUntilWedding(new Date())} />;
}
