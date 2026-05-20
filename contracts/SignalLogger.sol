// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SignalLogger {
    struct Signal {
        bytes32 dataHash;    // hash of the signal JSON
        uint8 signalType;    // 0=WATCH, 1=SELL, 2=BUY, 3=IGNORE
        uint8 confidence;    // 0-100
        string txReference;  // Reference transaction hash on Mantle
        uint256 timestamp;
        address triggeredBy;
    }

    address public owner;
    mapping(address => bool) public authorizedAgents;
    Signal[] public signals;

    event SignalLogged(
        uint256 indexed id,
        uint8 indexed signalType,
        uint8 confidence,
        bytes32 dataHash,
        string txReference,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender], "Not authorized agent");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedAgents[msg.sender] = true;
    }

    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
    }

    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
    }

    function logSignal(
        bytes32 dataHash,
        uint8 signalType,
        uint8 confidence,
        string calldata txReference
    ) external onlyAuthorizedAgent {
        require(confidence <= 100, "Confidence must be 0-100");
        
        signals.push(Signal({
            dataHash: dataHash,
            signalType: signalType,
            confidence: confidence,
            txReference: txReference,
            timestamp: block.timestamp,
            triggeredBy: msg.sender
        }));

        emit SignalLogged(
            signals.length - 1,
            signalType,
            confidence,
            dataHash,
            txReference,
            block.timestamp
        );
    }

    function getSignalCount() external view returns (uint256) {
        return signals.length;
    }

    function getSignal(uint256 index) external view returns (
        bytes32 dataHash,
        uint8 signalType,
        uint8 confidence,
        string memory txReference,
        uint256 timestamp,
        address triggeredBy
    ) {
        require(index < signals.length, "Signal does not exist");
        Signal storage sig = signals[index];
        return (
            sig.dataHash,
            sig.signalType,
            sig.confidence,
            sig.txReference,
            sig.timestamp,
            sig.triggeredBy
        );
    }

    function getLatestSignals(uint256 count) external view returns (Signal[] memory) {
        uint256 total = signals.length;
        uint256 start = total > count ? total - count : 0;
        uint256 size = total - start;

        Signal[] memory result = new Signal[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = signals[start + i];
        }
        return result;
    }
}
