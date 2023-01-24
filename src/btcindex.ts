import * as _ from "lodash";
import { DB } from "./database";
import { callSignetChain } from "./node";
import * as btc from "bitcoinjs-lib";

interface Block {
  hash: string,
  height: number,
  nTx: number,
  tx: Tx[]
}
interface Tx {
  txid: string,
  hash: string,
  vout: [{
    scriptPubKey: {
      asm: string,
      hex: string
    }
  }]
}

export class BTCIndexer {
  private db = new DB();
  public currentBlock: number = 0;
  public blockHeight: number = 1;

  // This function will start indexing from the most recently indexed block (beginning of chain on program start)
  public async index() {
    this.currentBlock = await this.db.getLatestBlock() + 1 ?? 0;
    this.blockHeight = await this.getBlockHeight();
    while(this.currentBlock <= this.blockHeight) {
      console.log(`Indexing block ${this.currentBlock}...`);
      await this.db.storeErrorInBlock(this.currentBlock);
      try {
        await this.indexBlock(this.currentBlock);
        await this.db.clearErrorInBlock(this.currentBlock);
      } catch(error) {
        console.log(`Error in indexing block ${this.currentBlock}: ${error}`);
      }
      this.currentBlock += 1;
    }
    console.log(`Current node block = indexed block: ${this.blockHeight}`);
    await new Promise(resolve => setTimeout(async () => {
      await this.indexErroredBlocks();
      resolve(this.index());
    }, 10000));
  }

  public async indexErroredBlocks() {
    const erroredBlocks = await this.db.getErroredBlocks() as Array<number>;
    if (erroredBlocks.length === 0) return;
    for (const block of erroredBlocks) {
      try {
        await this.indexBlock(block);
        await this.db.clearErrorInBlock(block);
        console.log(`Re-indexed errored block ${block}`);
      } catch(error) {
        console.log(`Error in re-indexing block ${block}: ${error}`);
      }
    }
  }

  public async indexBlock(block: number) {
    try {
      const blockInfo = await this.getBlockAtHeight(block);
      await this.indexTxns(blockInfo.tx, blockInfo.hash, blockInfo.height);
    } catch(error) {
      console.log(`Got Error in indexBlock: ${error}`);
      throw error;
    }
  }

  public async indexTxns(txns: Tx[], blockhash: string, height: number) {
    for (const txn of txns) {
      await this.indexTxn(txn, blockhash, height);
    }
  }

  public async indexTxn(txn: Tx, blockhash: string, height: number) {
    const metadata = await this.extractMetadata(txn);
    for (const data of metadata) {
      await this.db.saveOpData(height, blockhash, data as Buffer, txn.txid);
    }
  }

  public async extractMetadata(txn: Tx) {
    const scriptPubKeys = txn.vout.map(obj => obj.scriptPubKey);
    const metadata = scriptPubKeys.map((script) => {
      const hex = Buffer.from(script.hex, 'hex');
      return this.extractOpreturnFromMeta(hex);
    });
    return metadata.filter(d => d);
  }

  public extractOpreturnFromMeta(scriptHex: Buffer) {
    // We only care about txns that have populated OP_RETURN code
    if (scriptHex.length <= 2 || scriptHex[0] != 0x6a || scriptHex[1] == 0) return;
    // Make sure length is 83 when size > 80 for decompiling with bitcoinjs
    const scriptTotal = scriptHex.length > 80 ? Buffer.concat([scriptHex, Buffer.from(scriptHex.length === 81 ? '0000' : '00', 'hex')]) : scriptHex;
    const chunks = btc.script.decompile(scriptTotal);
    // Not OP_RETURN code if decompile is unsuccessful
    if (!chunks) return;
    // Gets data buffer
    const data = chunks.find(c => Buffer.isBuffer(c) && c.length > 1) as Buffer;
    return (scriptHex.length > 80 && scriptHex.length < 83) ? data.slice(0, data.length - (83 - scriptHex.length)) : data;
  }

  public async getBlockAtHeight(height: number) {
    const blockhash = await callSignetChain('getblockhash', [height]) as string;
    const block = await callSignetChain('getblock', [blockhash, 2]) as Block;
    return block;
  }

  public async getBlockLastIndexed() {
    const blockNumber = await this.db.getLatestBlock();
    return !!blockNumber ? blockNumber : 0;
  }

  public async getBlockHeight() {
    const info = await callSignetChain('getblockchaininfo') as {blocks: number};
    return info.blocks;
  }

  public async updateValues() {
    this.currentBlock = await this.getBlockLastIndexed() ?? 0;
    this.blockHeight = await this.getBlockHeight();
  }
}