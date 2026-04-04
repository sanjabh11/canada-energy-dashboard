import { energyDataManager } from './src/lib/dataManager';

async function run() {
  try {
    const data = await energyDataManager.loadData('ontario_demand', { forceStream: false });
    console.log("Loaded:", data.length, data.slice(0, 1));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
