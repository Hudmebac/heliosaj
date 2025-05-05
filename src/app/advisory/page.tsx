
import { calculateSolarGeneration } from '../../lib/solar-calculations';

export default function Advisory() {
  return <div>Advisory {calculateSolarGeneration(50, 50, new Date())}</div>;
}
