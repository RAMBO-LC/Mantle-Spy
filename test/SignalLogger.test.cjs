const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SignalLogger", function () {
  let logger, owner, agent, stranger;

  beforeEach(async () => {
    [owner, agent, stranger] = await ethers.getSigners();
    const SignalLogger = await ethers.getContractFactory("SignalLogger");
    logger = await SignalLogger.deploy();
  });

  it("deploys with owner as authorized agent", async () => {
    expect(await logger.owner()).to.equal(owner.address);
    expect(await logger.authorizedAgents(owner.address)).to.be.true;
  });

  it("owner can authorize and revoke agents", async () => {
    await logger.authorizeAgent(agent.address);
    expect(await logger.authorizedAgents(agent.address)).to.be.true;
    await logger.revokeAgent(agent.address);
    expect(await logger.authorizedAgents(agent.address)).to.be.false;
  });

  it("authorized agent can log a signal", async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('{"signal":"BUY","confidence":85}'));
    const tx = await logger.logSignal(hash, 2, 85, "0xabc123");
    const receipt = await tx.wait();

    expect(await logger.getSignalCount()).to.equal(1);

    const signal = await logger.getSignal(0);
    expect(signal.dataHash).to.equal(hash);
    expect(signal.confidence).to.equal(85);
    expect(signal.signalType).to.equal(2); // BUY
    expect(signal.txReference).to.equal("0xabc123");
  });

  it("emits SignalLogged event", async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(logger.logSignal(hash, 1, 60, "0xdef456"))
      .to.emit(logger, "SignalLogged")
      .withArgs(0, 1, 60, hash, "0xdef456", await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
  });

  it("rejects confidence > 100", async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(logger.logSignal(hash, 2, 101, "0x")).to.be.revertedWith(
      "Confidence must be 0-100"
    );
  });

  it("unauthorized address cannot log signals", async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(
      logger.connect(stranger).logSignal(hash, 2, 80, "0x")
    ).to.be.revertedWith("Not authorized agent");
  });

  it("getLatestSignals returns correct slice", async () => {
    const hash = (n) => ethers.keccak256(ethers.toUtf8Bytes(`signal-${n}`));
    for (let i = 0; i < 5; i++) {
      await logger.logSignal(hash(i), i % 4, 50 + i * 5, `0x${i}`);
    }
    const latest = await logger.getLatestSignals(3);
    expect(latest.length).to.equal(3);
    expect(latest[2].confidence).to.equal(70); // signal 4
  });

  it("getSignal reverts for non-existent id", async () => {
    await expect(logger.getSignal(99)).to.be.revertedWith("Signal does not exist");
  });
});
