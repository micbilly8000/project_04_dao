// scripts/seed.js

const hre = require("hardhat");
const config = require('../src/config.json');
const { ethers } = hre;

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether');
};
const ether = tokens;

async function main() {
  console.log(`Fetching accounts & network...\n`);

  const accounts = await ethers.getSigners();
  const investor1 = accounts[1];
  const investor2 = accounts[2];
  const investor3 = accounts[3];
  const recipient = accounts[4];

  // Fetch network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Connected to chainId: ${chainId}\n`);

  console.log(`Fetching token contract...\n`);
  const token = await ethers.getContractAt(
    'Token',
    config[chainId].token.address
  );
  console.log(`Token fetched at: ${token.address}\n`);

  // Dynamically find which account is the funder (i.e. holds tokens)
  let funder = null;
  for (const acct of accounts) {
    const bal = await token.balanceOf(acct.address);
    if (!bal.isZero()) {
      funder = acct;
      console.log("Found funder:", acct.address, "balance:", ethers.utils.formatUnits(bal, 18));
      break;
    }
  }
  if (!funder) {
    console.error("ERROR: No account holds any tokens. Cannot proceed.");
    process.exit(1);
  }

  console.log(`Transferring tokens to investors...\n`);
  try {
    let tx = await token.connect(funder).transfer(investor1.address, tokens(200000));
    await tx.wait();
    console.log("Transferred to investor1");
  } catch (err) {
    console.error("Transfer to investor1 failed:", err);
    throw err;
  }

  try {
    let tx = await token.connect(funder).transfer(investor2.address, tokens(200000));
    await tx.wait();
    console.log("Transferred to investor2");
  } catch (err) {
    console.error("Transfer to investor2 failed:", err);
    throw err;
  }

  try {
    let tx = await token.connect(funder).transfer(investor3.address, tokens(200000));
    await tx.wait();
    console.log("Transferred to investor3");
  } catch (err) {
    console.error("Transfer to investor3 failed:", err);
    throw err;
  }

  console.log(`Fetching DAO contract...\n`);
  const dao = await ethers.getContractAt(
    'DAO',
    config[chainId].dao.address
  );
  console.log(`DAO fetched at: ${dao.address}\n`);

  console.log(`Funding DAO treasury with ETH...\n`);
  try {
    let tx = await funder.sendTransaction({
      to: dao.address,
      value: ether(1000),
    });
    await tx.wait();
    console.log("Sent ETH to DAO treasury");
  } catch (err) {
    console.error("Funding DAO treasury failed:", err);
    throw err;
  }

  console.log(`Creating & voting on proposals...\n`);
  for (let i = 0; i < 3; i++) {
    // Create Proposal
    try {
      let tx = await dao.connect(investor1).createProposal(
        `Proposal ${i + 1}`,
        ether(100),
        recipient.address
      );
      await tx.wait();
      console.log(`Proposal ${i + 1} created`);
    } catch (err) {
      console.error(`Failed to create proposal ${i + 1}:`, err);
      throw err;
    }

    // Vote: all investors vote FOR (voteType = 1)
    const proposalId = i + 1;

    try {
      let tv = await dao.connect(investor1).vote(proposalId, 1);
      await tv.wait();
      console.log(`Investor1 voted FOR on proposal ${proposalId}`);
    } catch (err) {
      console.error(`Investor1 vote failed on proposal ${proposalId}:`, err);
      throw err;
    }

    try {
      let tv = await dao.connect(investor2).vote(proposalId, 1);
      await tv.wait();
      console.log(`Investor2 voted FOR on proposal ${proposalId}`);
    } catch (err) {
      console.error(`Investor2 vote failed on proposal ${proposalId}:`, err);
      throw err;
    }

    try {
      let tv = await dao.connect(investor3).vote(proposalId, 1);
      await tv.wait();
      console.log(`Investor3 voted FOR on proposal ${proposalId}`);
    } catch (err) {
      console.error(`Investor3 vote failed on proposal ${proposalId}:`, err);
      throw err;
    }

    // Finalize
    try {
      let tv = await dao.connect(investor1).finalizeProposal(proposalId);
      await tv.wait();
      console.log(`Proposal ${proposalId} finalized`);
    } catch (err) {
      console.error(`Finalize failed for proposal ${proposalId}:`, err);
      throw err;
    }

    console.log(`Completed cycle for proposal ${proposalId}\n`);
  }

  console.log(`Creating one additional proposal without full votes...\n`);
  // Proposal 4
  try {
    let tx = await dao.connect(investor1).createProposal(
      `Proposal 4`,
      ether(100),
      recipient.address
    );
    await tx.wait();
    console.log("Proposal 4 created");
  } catch (err) {
    console.error("Failed to create proposal 4:", err);
    throw err;
  }

  // Only investors 2 and 3 vote FOR on proposal 4
  try {
    let tv = await dao.connect(investor2).vote(4, 1);
    await tv.wait();
    console.log("Investor2 voted FOR on proposal 4");
  } catch (err) {
    console.error("Investor2 vote failed on proposal 4:", err);
    throw err;
  }

  try {
    let tv = await dao.connect(investor3).vote(4, 1);
    await tv.wait();
    console.log("Investor3 voted FOR on proposal 4");
  } catch (err) {
    console.error("Investor3 vote failed on proposal 4:", err);
    throw err;
  }

  console.log(`Seeding complete.\n`);
}

main().catch((error) => {
  console.error("Script failed with error:", error);
  process.exitCode = 1;
});
