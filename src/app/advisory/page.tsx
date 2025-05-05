
import { calculateSolarGeneration } from '../../lib/solar-calculations';

import { calculateSolarGeneration } from '../../lib/solar-calculations';

export default function Advisory() {
  calculateSolarGeneration(50, 50, new Date());
  return <div>Advisory</div>;
}
