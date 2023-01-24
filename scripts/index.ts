import { BTCIndexer } from "../src/btcindex";
const indexer = new BTCIndexer();

async function run() {
  await indexer.indexErroredBlocks();
  await indexer.index();
}
run();