import { describe, expect, test } from "@jest/globals";
import { callSignetChain } from "../src/node";

describe('Test successful connection to bitcoin signet node', () => {
  test('Should connect to local node and make successful rpc call', async () => {
    const rpcRes: any = await callSignetChain('getblockchaininfo');
    expect(rpcRes).toBeDefined();
    expect(rpcRes.chain).toBe('signet');
    return true;
  });
});