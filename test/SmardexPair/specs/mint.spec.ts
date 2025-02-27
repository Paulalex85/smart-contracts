import { parseEther } from "ethers/lib/utils";
import { expect } from "chai";
import { MAX_UINT128, MINIMUM_LIQUIDITY } from "../../constants";
import { BigNumber, constants } from "ethers";
import { mintAndCheck, secondMintAndCheck, sendTokensToPair } from "../utils";

export function shouldBehaveLikeMint(): void {
  const mintTestCases: BigNumber[][] = [
    [1, 4, 2],
    ["1013000", "1013000", "1013000"],
    [155, 1550, "490153037326098796459"],
  ].map(a => a.map(n => (typeof n === "string" ? BigNumber.from(n) : parseEther(String(n)))));
  mintTestCases.forEach((mintTestCase, i) => {
    it(`simple first mint ${i + 1}`, async function () {
      const [token0Amount, token1Amount, expectedLiquidity] = mintTestCase;

      await mintAndCheck(this.contracts, this.signers.admin, token0Amount, token1Amount, expectedLiquidity);
    });
  });

  interface DoubleMint {
    firstMintToken0: BigNumber;
    firstMintToken1: BigNumber;
    firstMintLP: BigNumber;
    secondMintToken0: BigNumber;
    secondMintToken1: BigNumber;
    secondMintLP: BigNumber;
  }

  const mintDoubleTestCases: DoubleMint[] = [
    {
      firstMintToken0: parseEther("155"),
      firstMintToken1: parseEther("1550"),
      firstMintLP: parseEther("490.153037326098796459"),
      secondMintToken0: parseEther("15.5"),
      secondMintToken1: parseEther("155"),
      secondMintLP: parseEther("49.015303732609879645"),
    },
    {
      firstMintToken0: parseEther("155"),
      firstMintToken1: parseEther("1550"),
      firstMintLP: parseEther("490.153037326098796459"),
      secondMintToken0: parseEther("155"),
      secondMintToken1: parseEther("155"),
      secondMintLP: parseEther("49.015303732609879645"),
    },
    {
      firstMintToken0: parseEther("155"),
      firstMintToken1: parseEther("1550"),
      firstMintLP: parseEther("490.153037326098796459"),
      secondMintToken0: parseEther("15.5"),
      secondMintToken1: parseEther("1550"),
      secondMintLP: parseEther("49.015303732609879645"),
    },
    {
      firstMintToken0: BigNumber.from("1013000"),
      firstMintToken1: BigNumber.from("1013000"),
      firstMintLP: BigNumber.from("1013000"),
      secondMintToken0: BigNumber.from("1013000"),
      secondMintToken1: BigNumber.from("1013000"),
      secondMintLP: BigNumber.from("1013000"),
    },
  ];
  mintDoubleTestCases.forEach((mintDoubleTestCase, i) => {
    it(`double mint ${i + 1}`, async function () {
      const { firstMintToken0, firstMintToken1, firstMintLP, secondMintToken0, secondMintToken1, secondMintLP } =
        mintDoubleTestCase;

      await mintAndCheck(this.contracts, this.signers.admin, firstMintToken0, firstMintToken1, firstMintLP);

      //second mint
      await secondMintAndCheck(
        this.contracts,
        this.signers.admin,
        firstMintToken0,
        firstMintToken1,
        firstMintLP,
        secondMintToken0,
        secondMintToken1,
        secondMintLP,
      );
    });
  });

  it("mint should revert when no liquidity provided", async function () {
    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        0,
        0,
        this.signers.admin.address,
      ),
    ).to.be.reverted;
  });

  it("call mint directly in pair contract should revert", async function () {
    await sendTokensToPair(this.contracts, parseEther("1"), parseEther("1"));
    await expect(
      this.contracts.smardexPair.mint(
        this.signers.admin.address,
        parseEther("1"),
        parseEther("1"),
        this.signers.admin.address,
      ),
    ).to.be.reverted;
  });

  it("mint should revert when no liquidity provided", async function () {
    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        MINIMUM_LIQUIDITY.add(1),
        MINIMUM_LIQUIDITY,
        this.signers.admin.address,
      ),
    ).to.be.revertedWith("SmarDex: INSUFFICIENT_LIQUIDITY_MINTED");
  });

  it("mint by providing just enough liquidity", async function () {
    await this.contracts.smardexRouterTest.mint(
      this.contracts.smardexPair.address,
      this.signers.admin.address,
      MINIMUM_LIQUIDITY.add(1),
      MINIMUM_LIQUIDITY.add(1),
      this.signers.admin.address,
    );
    expect(await this.contracts.smardexPair.balanceOf(this.signers.admin.address)).to.eq(constants.One);
  });

  it("mint should revert when providing too much liquidity", async function () {
    await this.contracts.smardexRouterTest.mint(
      this.contracts.smardexPair.address,
      this.signers.admin.address,
      MAX_UINT128.div(2),
      MAX_UINT128.div(2),
      this.signers.admin.address,
    );

    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        MAX_UINT128.mul(2),
        MAX_UINT128.mul(2),
        this.signers.admin.address,
      ),
    ).to.be.revertedWith("SmarDex: OVERFLOW");
  });

  it("mint by providing the max liquidity possible", async function () {
    await expect(
      this.contracts.smardexRouterTest.mint(
        this.contracts.smardexPair.address,
        this.signers.admin.address,
        MAX_UINT128.add(1),
        MAX_UINT128.add(1),
        this.signers.admin.address,
      ),
    ).to.be.reverted;

    await this.contracts.smardexRouterTest.mint(
      this.contracts.smardexPair.address,
      this.signers.admin.address,
      MAX_UINT128,
      MAX_UINT128,
      this.signers.admin.address,
    );
    expect(await this.contracts.smardexPair.balanceOf(this.signers.admin.address)).to.eq(
      MAX_UINT128.sub(MINIMUM_LIQUIDITY),
    );
  });
}
