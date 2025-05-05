

function calculateSolarGeneration(panelEfficiency: number, panelArea: number, date: Date): number {
  const dayOfYear = (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24);
  const baseGeneration = panelEfficiency * panelArea;
  const seasonalModifier = 1 + Math.sin(2 * Math.PI * dayOfYear / 365) / 2;

  return baseGeneration * seasonalModifier;
}

function getChargingAdvice(batteryLevel: number, timeOfDay: string): string {
  if (timeOfDay === 'night' && batteryLevel < 30) {
    return 'It is recommended to charge your battery overnight.';
  } else if (timeOfDay === 'day' && batteryLevel > 70) {
    return 'Your battery is doing great. Consider charging during the day.';
  } else {
    return 'Your battery level seems fine. Keep monitoring it.';
  }
}

export default function Home() {
  return <div>Home {calculateSolarGeneration(50, 50, new Date())}{getChargingAdvice(50, 'night')}</div>;
}