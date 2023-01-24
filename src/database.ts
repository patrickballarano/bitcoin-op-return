import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export class DB {
  private database = new Pool({
    connectionString: process.env.PG_URL
  });

  public async connection() {
    const columns = await this.database.query("SELECT column_name FROM information_schema.columns WHERE table_name like 'op_return' ORDER BY column_name asc;");
    return columns.rows.map(value => value.column_name);
  }

  public async getLatestBlock() {
    try {
      const res = await this.database.query('SELECT * FROM btc_index ORDER BY height desc LIMIT 1;');
      if (res.rows.length < 1) return 0;
      return res.rows[0].height;
    } catch(error) {
      console.log(`Got Error in getLatestBlock: ${error}`);
      return;
    }
  }

  public async storeErrorInBlock(block: number) {
    try {
      await this.database.query(`INSERT INTO btc_index(height, updated_at, errored) values(${block}, now(), 1) ON CONFLICT(height) DO UPDATE SET updated_at = now();`);
    } catch(error) {
      console.log(`Got Error in storeErrorInBlock: ${error}`);
    }
  }

  public async clearErrorInBlock(block: number) {
    try {
      await this.database.query(`UPDATE btc_index SET (errored, updated_at) = (0, now()) WHERE height = ${block};`);
    } catch(error) {
      console.log(`Got Error in clearErrorInBlock: ${error}`);
    }
  }

  public async getErroredBlocks() {
    try {
      const erroredBlocks = await this.database.query(`SELECT height from btc_index WHERE errored = 1 ORDER BY height asc;`);
      if (erroredBlocks.rowCount == 0) return [];
      return erroredBlocks.rows.map(block => block.height);
    } catch(error) {
      console.log(`Got Error in clearErrorInBlock: ${error}`);
    }
  }

  public async saveOpData(height: number, blockhash: string, data: Buffer, tx: string) {
    try {
      const d= data.toString('hex');
      await this.database.query(`INSERT INTO op_return(op_return, tx_hash, block_hash, block_number) values('${d}', '${tx}', '${blockhash}', ${height}) ON CONFLICT(tx_hash,op_return) DO UPDATE SET op_return = EXCLUDED.op_return;`);
    } catch(error) {
      console.log(`Got Error in saveOpData: ${error}`);
    }
  }

  public async getOpDataTxns(data: string) {
    try {
      const txns = await this.database.query(`SELECT tx_hash, block_hash from op_return WHERE op_return = '${data}' ORDER BY block_number asc;`);
      if (txns.rowCount === 0) return `No transactions found with data ${data}`;
      return txns.rows;
    } catch(error) {
      console.log(`Got Error in getOpDataTxns: ${error}`);
      return error;
    }
  }

  public async getTxnOpData(tx_hash: string) {
    try {
      const txns = await this.database.query(`SELECT op_return from op_return WHERE tx_hash = '${tx_hash}' ORDER BY block_number asc;`);
      if (txns.rowCount === 0) return [];
      return txns.rows.map(data => data.op_return);
    } catch(error) {
      console.log(`Got Error in getTxnOpData: ${error}`);
      return error;
    }
  }

  public async getBlockOpData(block: number) {
    try {
      const txns = await this.database.query(`SELECT tx_hash, block_hash, op_return from op_return WHERE block_number = ${block} ORDER BY tx_hash asc;`);
      if (txns.rowCount === 0) return [];
      return txns.rows;
    } catch(error) {
      console.log(`Got Error in getTxnOpData: ${error}`);
      return error;
    }
  }
}