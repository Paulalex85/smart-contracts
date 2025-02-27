// eslint-disable @typescript-eslint/no-explicit-any
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import type { Contracts, IFarming, Misc, Signers } from "./types";

/// This is run at the beginning of each suite of tests: 2e2, integration and unit.
export function baseContext(description: string, hooks: () => void): void {
  describe(description, function () {
    before(async function () {
      this.contracts = {} as Contracts;
      this.signers = {} as Signers;
      this.misc = {} as Misc;
      this.farming = {} as IFarming;

      const signers: SignerWithAddress[] = await ethers.getSigners();
      this.signers.admin = signers[0];
      this.signers.user = signers[1];
      this.signers.feeTo = signers[2];
    });

    hooks();
  });
}
