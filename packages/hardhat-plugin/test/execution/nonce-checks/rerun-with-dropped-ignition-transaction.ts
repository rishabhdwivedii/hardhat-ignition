/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { clearPendingTransactionsFromMemoryPool, mineBlock } from "../helpers";

import {
  TestChainHelper,
  useDeploymentDirectory,
} from "./useDeploymentDirectory";

/**
 * Run an initial deploy, that starts but does not finish an on-chain
 * transaction. The transaction is dropped from the memory pool. On rerun
 * the transaction should be resubmitted.
 */
describe("execution - rerun with dropped ignition transactions", () => {
  useDeploymentDirectory(
    "minimal-new-api",
    "rerun-with-dropped-ignition-transactions"
  );

  it("should deploy successfully on second run", async function () {
    const moduleDefinition = defineModule("FooModule", (m) => {
      const foo = m.contract("Foo", []);

      return {
        foo,
      };
    });

    // Start the deploy
    await this.deploy(moduleDefinition, async (c: TestChainHelper) => {
      // Wait for the submission of foo to mempool
      await c.waitForPendingTxs(1);

      // kill the deployment before confirming foo
      c.exitDeploy();
    });

    // remove the submitted foo deploy from mempool
    await clearPendingTransactionsFromMemoryPool(this.hre);

    // Further blocks with no pending transactions
    await mineBlock(this.hre);
    await mineBlock(this.hre);

    // Rerun the deployment
    const result = await this.deploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // this block shound include deployment of foo via resend
        await c.mineBlock(1);
      }
    );

    assert.equal(await result.foo.x(), Number(1));
  });
});
