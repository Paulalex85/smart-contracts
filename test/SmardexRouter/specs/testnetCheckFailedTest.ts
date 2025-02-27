import { expect } from "chai";
import { constants, providers } from "ethers";
import { deployERC20Test, deploySmardexPairTest } from "../../deployers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { Contracts, Signers } from "../../types";
import { GetAmountTrade } from "../../SmardexLibrary/utils";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getImpersonatedSigner } from "@nomiclabs/hardhat-ethers/internal/helpers";
import hre, { ethers } from "hardhat";
import {
  SmardexFactory__factory,
  SmardexPair__factory,
  SmardexRouter__factory,
  SmardexToken__factory,
} from "../../../typechain";
import { FEES_BASE, FEES_POOL } from "../../constants";

export function shouldBehaveLikeCheckFailedTest(): void {
  it("try revert case", async function () {
    const data: GetAmountTrade = {
      reserveToken0: parseEther("10.647726201504724974"),
      reserveToken1: parseEther("10725.399831"),
      fictiveReserveToken0: parseEther("3.812907415989527051"),
      fictiveReserveToken1: parseEther("2264.013573"),
      priceAverageToken0: parseEther("7.379104380048765348"),
      priceAverageToken1: parseEther("3649.906646"),

      amountInToken0: parseEther("0.382501826275633381"),
      amountOutToken1: parseEther("213.0"),

      expectedReserveToken0: parseEther("0"),
      expectedReserveToken1: parseEther("0"),
      expectedFictiveReserveToken0: parseEther("0"),
      expectedFictiveReserveToken1: parseEther("0"),
    };
    const WETHPartner = await deployERC20Test(parseEther("10000000"));

    this.contracts.smardexPairTest = await deploySmardexPairTest(
      this.contracts.smardexFactoryTest,
      this.contracts.WETH,
      WETHPartner,
    );
    const token0InPair = await this.contracts.smardexPairTest.token0();

    await WETHPartner.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);
    // await this.contracts.token1.approve(this.contracts.routerForPairTest.address, constants.MaxUint256);

    await setupPair(this.contracts, this.signers, data, token0InPair === this.contracts.WETH.address);

    await expect(
      this.contracts.routerForPairTest.swapETHForExactTokens(
        data.amountOutToken1,
        [this.contracts.WETH.address, WETHPartner.address],
        this.signers.admin.address,
        constants.MaxUint256,
        {
          value: data.amountInToken0,
        },
      ),
    ).to.not.be.reverted;
  });

  it.skip("try revert case at a fixed block", async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.URL_MUMBAI,
            blockNumber: 32289916,
          },
        },
      ],
    });

    const impersonatedSigner = await getImpersonatedSigner(hre, "0x845141d5e379170afc736e19d834182c3cae93a4");

    const routerContract = SmardexRouter__factory.connect(
      "0xfea8bdb813ea9c9af45d3dd389abbed8fdb4ff12",
      impersonatedSigner,
    );

    const result = await routerContract
      .connect(impersonatedSigner)
      .swapExactETHForTokens(
        318910845,
        ["0xD9f382B51Ed89A85171FB6A584e4940D1CaBE538", "0xEc1e8a6cE865C50f956ca922C3DE8F3242B2c17B"],
        impersonatedSigner.address,
        1677071309,
        {
          value: parseEther("0.5"),
        },
      );
    console.log(result);
    const receipt = await result.wait();
    console.log(receipt);
    await expect(result).to.not.be.reverted;
  });

  it.skip("check fees on snap", async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.URL_MUMBAI,
            blockNumber: 32656578,
          },
        },
      ],
    });

    const impersonatedSigner = await getImpersonatedSigner(hre, "0xe109801d56ffb86322a637f9260ffcd101c2fe9d");

    const tokenSDEX = SmardexToken__factory.connect("0x3B20f0064eb855eECC7f3f7Da58c282C38e02607", impersonatedSigner);
    const tokenUSDT = SmardexToken__factory.connect("0xEc1e8a6cE865C50f956ca922C3DE8F3242B2c17B", impersonatedSigner);
    const routerContract = SmardexRouter__factory.connect(
      "0x3c7f9da73afe76f70324abba7fe924d5c8e81308",
      impersonatedSigner,
    );
    const factoryContract = SmardexFactory__factory.connect(await routerContract.factory(), impersonatedSigner);
    const pairAddress = await factoryContract.getPair(tokenSDEX.address, tokenUSDT.address);
    console.log(pairAddress);
    const pair = SmardexPair__factory.connect(pairAddress, impersonatedSigner);

    // const amountUSDT = parseUnits("100000", 6);
    const amountSmardex = parseEther("100000");

    const feesBefore = await pair.getFees();
    const reservesBefore = await pair.getReserves();

    console.log(await ethers.provider.getBlockNumber());

    const balanceUSDTBefore = await tokenUSDT.balanceOf(impersonatedSigner.address);
    let result = await routerContract
      .connect(impersonatedSigner)
      .swapTokensForExactTokens(
        "100000000000000000000000",
        26226898441,
        [tokenUSDT.address, tokenSDEX.address],
        impersonatedSigner.address,
        1677850602,
        {
          gasLimit: 139898,
        },
      );
    await result.wait();
    await expect(result).to.not.be.reverted;

    const usdtPaid = balanceUSDTBefore.sub(await tokenUSDT.balanceOf(impersonatedSigner.address));

    result = await routerContract
      .connect(impersonatedSigner)
      .swapExactTokensForTokens(
        "100000000000000000000000",
        26151072198,
        [tokenSDEX.address, tokenUSDT.address],
        impersonatedSigner.address,
        1677850636,
        {
          gasLimit: 136517,
        },
      );
    await result.wait();
    await expect(result).to.not.be.reverted;

    console.log(await ethers.provider.getBlockNumber());

    const reservesAfter = await pair.getReserves();
    const feesAfter = await pair.getFees();

    console.log(reservesBefore.reserve0_);
    console.log(reservesAfter.reserve0_);
    console.log(reservesBefore.reserve1_);
    console.log(reservesAfter.reserve1_);

    console.log(await factoryContract.feeTo());

    console.log(feesBefore.fees0_);
    console.log(feesAfter.fees0_);
    console.log(feesBefore.fees1_);
    console.log(feesAfter.fees1_);

    //token0 = SDEX
    expect(feesAfter.fees0_).to.be.eq(feesBefore.fees0_.add(amountSmardex.mul(FEES_POOL).div(FEES_BASE)));
    expect(feesAfter.fees1_).to.be.eq(feesBefore.fees1_.add(usdtPaid.mul(FEES_POOL).div(FEES_BASE)));
  });

  async function setupPair(
    contracts: Contracts,
    signers: Signers,
    getAmountTestCase: GetAmountTrade,
    isSwapToken0ToToken1: boolean,
  ) {
    await contracts.routerForPairTest.mint(
      contracts.smardexPairTest.address,
      signers.admin.address,
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken1 : getAmountTestCase.reserveToken0,
      signers.admin.address,
      { value: isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1 },
    );

    const reserves = await contracts.smardexPairTest.getReserves();
    await expect(reserves.reserve0_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken0 : getAmountTestCase.reserveToken1,
    );
    await expect(reserves.reserve1_).to.be.eq(
      isSwapToken0ToToken1 ? getAmountTestCase.reserveToken1 : getAmountTestCase.reserveToken0,
    );

    await contracts.smardexPairTest.setFictivePoolValues(
      isSwapToken0ToToken1 ? getAmountTestCase.fictiveReserveToken0 : getAmountTestCase.fictiveReserveToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.fictiveReserveToken1 : getAmountTestCase.fictiveReserveToken0,
    );
    const currentTimestamp = await time.latest();
    await contracts.smardexPairTest.setPriceAverage(
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken0 : getAmountTestCase.priceAverageToken1,
      isSwapToken0ToToken1 ? getAmountTestCase.priceAverageToken1 : getAmountTestCase.priceAverageToken0,
      currentTimestamp + 2 - 251, //add 2, so in the next block it will be the same timestamp
    );
  }
}
