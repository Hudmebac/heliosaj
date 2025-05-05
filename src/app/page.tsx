

import { calculateSolarGeneration } from '../lib/solar-calculations';
import { getChargingAdvice } from '../lib/charging-advice';

export default function Home() {
  return <div>Home {calculateSolarGeneration(50, 50, new Date())}{getChargingAdvice(50, 'night')}</div>;
}