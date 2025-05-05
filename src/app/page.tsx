

import { calculateSolarGeneration } from '../lib/solar-calculations';
import { getChargingAdvice } from '../lib/charging-advice';


export default function Home() {
  import { calculateSolarGeneration } from '../lib/solar-calculations';
  import { getChargingAdvice } from '../lib/charging-advice';
  
  calculateSolarGeneration(50, 50, new Date());
  getChargingAdvice(50, 'night')
  return <div>Home</div>;
}