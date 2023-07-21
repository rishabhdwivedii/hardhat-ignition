/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";

/**
 * A run that deploys a contract times out
 */
describe("execution - rerun a deploy that timed out", () => {
  useFileIgnitionProject("minimal-new-api", "rerun-a-deploy-that-timed-out", {
    transactionTimeoutInterval: 400,
  });

  it("should error naming timed out transactions", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = defineModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    // Deploying the module that uses accounts[2], but force timeout,
    // by not processing any blocks
    await assert.isRejected(
      this.deploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for the deploy transaction to hit the memory pool,
        // but then never mine the block that will complete it.
        await c.waitForPendingTxs(1);
      })
    );

    const result = await this.deploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // Mine the block, confirming foo
        await c.mineBlock(1);
      }
    );

    assert.isDefined(result);
    assert.equal(await result.foo.x(), Number(1));
  });
});