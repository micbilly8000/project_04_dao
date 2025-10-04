const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const NAME = "Dapp University";
  const SYMBOL = "DAPP";
  const MAX_SUPPLY = "1000000";

  // Deploy Token
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(NAME, SYMBOL, MAX_SUPPLY);
  await token.deployed();
  console.log(`Token deployed to: ${token.address}`);

  // Deploy DAO, with the token address and your quorum parameter
  const DAO = await hre.ethers.getContractFactory("DAO");
  // Here the second parameter is your quorum (in wei). You passed a big number string before.
  const dao = await DAO.deploy(token.address, "500000000000000000000001");
  await dao.deployed();
  console.log(`DAO deployed to: ${dao.address}`);

  // Optionally: update config.json with these deployed addresses
  const configPath = path.resolve(__dirname, "../src/config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  // Assumes config has an entry under this chainId
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  // Overwrite addresses
  config[chainId] = {
    token: {
      address: token.address
    },
    dao: {
      address: dao.address
    }
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Updated config.json with deployed addresses.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
