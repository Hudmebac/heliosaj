
function calculateSolarGeneration(panelEfficiency: number, panelArea: number, date: Date): number {
  const dayOfYear = (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24);
  const baseGeneration = panelEfficiency * panelArea;
  const seasonalModifier = 1 + Math.sin(2 * Math.PI * dayOfYear / 365) / 2;

  return baseGeneration * seasonalModifier;
}

export default function Advisory() {
  return <div>Advisory {calculateSolarGeneration(50, 50, new Date())}</div>;
}
