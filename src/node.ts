import request from "request";
import * as _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

export const callSignetChain = (method: string, params:(string | number)[] = []) => {
  return new Promise((resolve, reject) => {
    const rpcAuthString = process.env.RPC_USER && process.env.RPC_PASSWORD ? `${process.env.RPC_USER}:${process.env.RPC_PASSWORD}@` : '';
    request.post(
      {
        url: `http://${rpcAuthString}${process.env.RPC_HOST}:${process.env.RPC_PORT}`,
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: params,
        },
        json: true,
      },
      (err, res, body) => {
        try {
          if (err) {
            throw err;
          } else {
            const data = typeof body === 'string' ? JSON.parse(body) : body;
            resolve(data.result);
          }
        } catch(error) {
          console.log(`Got Error in JSON RPC call for ${method}: ${error}`);
          reject(error);
        }
      }
    );
  });
}