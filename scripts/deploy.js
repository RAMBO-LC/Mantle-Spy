const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`\n🚀 Deploying SignalLogger to ${network}`);
  console.log(`   Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`   Balance:  ${hre.ethers.formatEther(balance)} MNT\n`);

  const SignalLogger = await hre.ethers.getContractFactory("SignalLogger");
  const logger = await SignalLogger.deploy();
  await logger.waitForDeployment();

  const address = await logger.getAddress();
  console.log(`✅ SignalLogger deployed at: ${address}`);

  const explorerBase =
    network === "mantle"
      ? "https://mantlescan.xyz/address"
      : "https://sepolia.mantlescan.xyz/address";

  console.log(`   Explorer: ${explorerBase}/${address}\n`);
  console.log(`📋 Add to your .env:`);
  console.log(`   SIGNAL_LOGGER_ADDRESS=${address}\n`);

  // Verify on explorer (may need API key)
  if (process.env.ETHERSCAN_API_KEY || process.env.MANTLE_EXPLORER_API_KEY) {
    console.log("🔍 Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified!");
    } catch (e) {
      console.log("⚠️  Verification failed (may already be verified):", e.message);
    }
  } else {
    console.log("ℹ️  Set ETHERSCAN_API_KEY or MANTLE_EXPLORER_API_KEY in .env to auto-verify.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
