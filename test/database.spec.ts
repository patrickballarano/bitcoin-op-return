import { describe, expect, test } from "@jest/globals";
import { DB } from "../src/database"

describe('Test successful connection to postgres database', () => {
  test('Should connect to local database and make successful query', async () => {
    const dbRes: any = await new DB().connection();
    expect(dbRes).toBeDefined();
    expect(dbRes).toContain('op_return');
    return true;
  });
});