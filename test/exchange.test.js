const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange", function () {
  let TokenA, TokenB, Exchange;
  let tokenA, tokenB, exchange;
  let owner, user1, user2;
  const decimals = 18;

  beforeEach(async function () {
    // Get accounts
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy TokenA
    TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();
    await tokenA.waitForDeployment();

    // Deploy TokenB
    TokenB = await ethers.getContractFactory("TokenB");
    tokenB = await TokenB.deploy();
    await tokenB.waitForDeployment();

    // Deploy Exchange
    Exchange = await ethers.getContractFactory("Exchange");
    exchange = await Exchange.deploy(await tokenA.getAddress(), await tokenB.getAddress());
    await exchange.waitForDeployment();

    // Seed Exchange with 10,000 Token A and 10,000 Token B for liquidity
    const seedAmount = ethers.parseUnits("10000", decimals);
    await tokenA.transfer(await exchange.getAddress(), seedAmount);
    await tokenB.transfer(await exchange.getAddress(), seedAmount);
  });

  describe("Deployment", function () {
    it("Should set the correct token addresses", async function () {
      expect(await exchange.tokenA()).to.equal(await tokenA.getAddress());
      expect(await exchange.tokenB()).to.equal(await tokenB.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await exchange.owner()).to.equal(owner.address);
    });
  });

  describe("Swap Logic - A for B", function () {
    const swapAmountA = ethers.parseUnits("100", decimals); // 100 Token A
    // 0.3% fee = 0.3 Token A. Net A = 99.7 Token A.
    // At 1:2 rate, expected B = 99.7 * 2 = 199.4 Token B.
    const expectedFeeA = ethers.parseUnits("0.3", decimals);
    const expectedB = ethers.parseUnits("199.4", decimals);

    beforeEach(async function () {
      // Mint 100 Token A to user1
      await tokenA.faucet(user1.address, swapAmountA);
      // Approve Exchange to spend user1's Token A
      await tokenA.connect(user1).approve(await exchange.getAddress(), swapAmountA);
    });

    it("Should execute swap A for B correctly", async function () {
      const user1InitialA = await tokenA.balanceOf(user1.address);
      const user1InitialB = await tokenB.balanceOf(user1.address);
      const exchangeInitialA = await tokenA.balanceOf(await exchange.getAddress());
      const exchangeInitialB = await tokenB.balanceOf(await exchange.getAddress());

      // Perform swap
      const tx = await exchange.connect(user1).swapAForB(swapAmountA);
      await tx.wait();

      // Check user1 balances
      expect(await tokenA.balanceOf(user1.address)).to.equal(user1InitialA - swapAmountA);
      expect(await tokenB.balanceOf(user1.address)).to.equal(user1InitialB + expectedB);

      // Check exchange balances
      expect(await tokenA.balanceOf(await exchange.getAddress())).to.equal(exchangeInitialA + swapAmountA);
      expect(await tokenB.balanceOf(await exchange.getAddress())).to.equal(exchangeInitialB - expectedB);
    });

    it("Should emit Swap event", async function () {
      await expect(exchange.connect(user1).swapAForB(swapAmountA))
        .to.emit(exchange, "Swap")
        .withArgs(user1.address, swapAmountA, expectedB);
    });
  });

  describe("Swap Logic - B for A", function () {
    const swapAmountB = ethers.parseUnits("200", decimals); // 200 Token B
    // 0.3% fee = 0.6 Token B. Net B = 199.4 Token B.
    // At 2:1 rate, expected A = 199.4 / 2 = 99.7 Token A.
    const expectedFeeB = ethers.parseUnits("0.6", decimals);
    const expectedA = ethers.parseUnits("99.7", decimals);

    beforeEach(async function () {
      // Mint 200 Token B to user1
      await tokenB.faucet(user1.address, swapAmountB);
      // Approve Exchange to spend user1's Token B
      await tokenB.connect(user1).approve(await exchange.getAddress(), swapAmountB);
    });

    it("Should execute swap B for A correctly", async function () {
      const user1InitialA = await tokenA.balanceOf(user1.address);
      const user1InitialB = await tokenB.balanceOf(user1.address);
      const exchangeInitialA = await tokenA.balanceOf(await exchange.getAddress());
      const exchangeInitialB = await tokenB.balanceOf(await exchange.getAddress());

      // Perform swap
      const tx = await exchange.connect(user1).swapBForA(swapAmountB);
      await tx.wait();

      // Check user1 balances
      expect(await tokenB.balanceOf(user1.address)).to.equal(user1InitialB - swapAmountB);
      expect(await tokenA.balanceOf(user1.address)).to.equal(user1InitialA + expectedA);

      // Check exchange balances
      expect(await tokenB.balanceOf(await exchange.getAddress())).to.equal(exchangeInitialB + swapAmountB);
      expect(await tokenA.balanceOf(await exchange.getAddress())).to.equal(exchangeInitialA - expectedA);
    });

    it("Should emit Swap event", async function () {
      await expect(exchange.connect(user1).swapBForA(swapAmountB))
        .to.emit(exchange, "Swap")
        .withArgs(user1.address, expectedA, swapAmountB); // Note: event expects amountA, amountB
    });
  });

  describe("Error Handling", function () {
    it("Should reject swap if amount is zero", async function () {
      await expect(exchange.connect(user1).swapAForB(0)).to.be.revertedWith("Amount must be greater than 0");
      await expect(exchange.connect(user1).swapBForA(0)).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject swap if user lacks balance", async function () {
      const swapAmount = ethers.parseUnits("100", decimals);
      // Approve but do not mint
      await tokenA.connect(user1).approve(await exchange.getAddress(), swapAmount);
      
      // TransferFrom will fail due to ERC20InsufficientBalance
      await expect(exchange.connect(user1).swapAForB(swapAmount)).to.be.reverted;
    });

    it("Should reject swap if user has balance but lacks allowance", async function () {
      const swapAmount = ethers.parseUnits("100", decimals);
      await tokenA.faucet(user1.address, swapAmount);
      
      // Try swap without approval
      await expect(exchange.connect(user1).swapAForB(swapAmount)).to.be.reverted;
    });

    it("Should reject swap if Exchange contract lacks liquidity", async function () {
      const hugeAmount = ethers.parseUnits("20000", decimals); // Exceeds contract 10k balance
      await tokenA.faucet(user1.address, hugeAmount);
      await tokenA.connect(user1).approve(await exchange.getAddress(), hugeAmount);

      await expect(exchange.connect(user1).swapAForB(hugeAmount))
        .to.be.revertedWith("Insufficient Exchange liquidity");
    });
  });

  describe("Liquidity Management", function () {
    it("Should allow the owner to withdraw liquidity/fees", async function () {
      const withdrawAmount = ethers.parseUnits("500", decimals);
      const ownerInitialA = await tokenA.balanceOf(owner.address);

      await exchange.connect(owner).withdrawToken(await tokenA.getAddress(), withdrawAmount);

      expect(await tokenA.balanceOf(owner.address)).to.equal(ownerInitialA + withdrawAmount);
    });

    it("Should reject liquidity withdrawals by non-owners", async function () {
      const withdrawAmount = ethers.parseUnits("500", decimals);
      await expect(
        exchange.connect(user1).withdrawToken(await tokenA.getAddress(), withdrawAmount)
      ).to.be.reverted; // Reverts with OwnableUnauthorizedAccount
    });
  });
});
