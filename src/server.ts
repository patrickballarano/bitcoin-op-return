import express from "express";
import { callSignetChain } from "./node";
import { BTCIndexer } from "./btcindex";
import { DB } from "./database";
import dotenv from "dotenv";
dotenv.config();
const server = express();
const indexer = new BTCIndexer();
const db = new DB();

// This endpoint takes in a hex string, then searches the blockchain for occurrences of matching OP_RETURN data
server.get('/opreturn/:opReturnData', async (req, res) => {
  const query = req.params.opReturnData;
  console.log(`GET /opreturn/${query}`);
  let data;
  try {
    data = await db.getOpDataTxns(query);
  } catch(error) {
    res.json(error);
  }
  res.json(data);
});

// This endpoint takes in a string, hex encodes it, then searches the blockchain for occurrences of matching OP_RETURN data
server.get('/opreturn/text/:opReturnText', async (req, res) => {
  const query = req.params.opReturnText;
  console.log(`GET /opreturn/text/${query}`);
  let data, hex = '';
  for (let i = 0; i < query.length; i++) {
    hex += query.charCodeAt(i).toString(16);
  }
  try {
    data = await db.getOpDataTxns(hex);
  } catch(error) {
    res.json(error);
  }
  res.json(data);
});

// This endpoint takes in a transaction hash string, then returns OP_RETURN data of the txn if any exists.
server.get('/opreturn/txn/:opReturnTxn', async (req, res) => {
  const query = req.params.opReturnTxn;
  console.log(`GET /opreturn/txn/${query}`);
  let data;
  try {
    const opData = await db.getTxnOpData(query) as Array<string>;
    if (opData.length === 0) {
      res.json(`No OP_RETURN data found for transaction ${query}`);
      return;
    }
    data = [];
    for (const d of opData) {
      const stringData = Buffer.from(d, 'hex');
      data.push({
        opReturnData: d,
        opReturnDataAsString: stringData.toString()
      });
    }
  } catch(error) {
    res.json(error);
  }
  res.json(data);
});

// This endpoint takes in a block number, then returns all OP_RETURN transactions with data for the block if any exists.
server.get('/opreturn/block/:opReturnBlockNumber', async (req, res) => {
  const query = req.params.opReturnBlockNumber;
  console.log(`GET /opreturn/block/${query}`);
  let data;
  interface TxnData {
    tx_hash: string,
    block_hash: string,
    op_return: string
  }
  try {
    const block = parseInt(query);
    const txnData = await db.getBlockOpData(block) as Array<TxnData>;
    if (txnData.length === 0) {
      res.json(`No OP_RETURN transactions found for block ${query}`);
      return;
    }
    data = [];
    for (const d of txnData) {
      const stringData = Buffer.from(d.op_return, 'hex');
      data.push({
        tx_hash: d.tx_hash,
        block_hash: d.block_hash,
        opReturnData: d.op_return,
        opReturnDataAsString: stringData.toString()
      });
    }
  } catch(error) {
    res.json(error);
  }
  res.json(data);
});

// This endpoint will give info about your blockchain node
server.get('/node-status', async (req, res) => {
  console.log('GET /node-status');
  let status;
  try {
    status = await callSignetChain('getblockchaininfo');
  } catch(error) {
    status = error;
  }
  res.json(status);
});

// This endpoint will give stats of last indexed block and current chain block height
server.get('/indexing-status', async (req, res) => {
  console.log('GET /indexing-status');
  let status;
  try {
    await indexer.updateValues();
    status = {
      lastIndexedBlock: indexer.currentBlock,
      chainBlockHeight: indexer.blockHeight
    }
  } catch(error) {
    status = error;
  }
  res.json(status);
});

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running on ${process.env.SERVER_PORT}`);
});