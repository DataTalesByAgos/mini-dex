const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...");

  // 1. Deploy TokenA
  const TokenA = await hre.ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log(`TokenA deployed to: ${tokenAAddress}`);

  // 2. Deploy TokenB
  const TokenB = await hre.ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log(`TokenB deployed to: ${tokenBAddress}`);

  // 3. Deploy Exchange
  const Exchange = await hre.ethers.getContractFactory("Exchange");
  const exchange = await Exchange.deploy(tokenAAddress, tokenBAddress);
  await exchange.waitForDeployment();
  const exchangeAddress = await exchange.getAddress();
  console.log(`Exchange deployed to: ${exchangeAddress}`);

  // 4. Seed Exchange with Liquidity
  console.log("Seeding Exchange with initial liquidity...");
  const decimals = 18;
  const liquidityAmount = hre.ethers.parseUnits("500000", decimals); // 500k tokens

  // Transfer Token A liquidity to Exchange
  const txA = await tokenA.transfer(exchangeAddress, liquidityAmount);
  await txA.wait();
  console.log("Transferred 500,000 Token A liquidity to Exchange.");

  // Transfer Token B liquidity to Exchange
  const txB = await tokenB.transfer(exchangeAddress, liquidityAmount);
  await txB.wait();
  console.log("Transferred 500,000 Token B liquidity to Exchange.");

  // 5. Generate frontend config file with addresses and ABIs
  const configDir = path.join(__dirname, "..", "frontend");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, "config.js");
  
  // Extract minimal ABIs needed for the frontend
  const tokenAArtifact = require("../artifacts/contracts/TokenA.sol/TokenA.json");
  const tokenBArtifact = require("../artifacts/contracts/TokenB.sol/TokenB.json");
  const exchangeArtifact = require("../artifacts/contracts/Exchange.sol/Exchange.json");

  const configContent = `// Auto-generated deployment config. Do not edit manually.
const CONTRACT_ADDRESSES = {
  tokenA: "${tokenAAddress}",
  tokenB: "${tokenBAddress}",
  exchange: "${exchangeAddress}"
};

const TOKEN_ABI = ${JSON.stringify(tokenAArtifact.abi, null, 2)};
const EXCHANGE_ABI = ${JSON.stringify(exchangeArtifact.abi, null, 2)};
`;

  fs.writeFileSync(configPath, configContent);
  console.log(`Frontend config written to: ${configPath}`);

  console.log("Deployment and configuration completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
