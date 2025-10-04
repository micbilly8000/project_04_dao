// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Token.sol";

contract DAO {
    address public owner;
    Token public token;
    uint256 public quorum;

    enum VoteType { Absent, For, Against }

    struct Proposal {
        uint256 id;
        string name;
        uint256 amount;
        address payable recipient;
        uint256 votesFor;
        uint256 votesAgainst;
        bool finalized;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public votesCast;

    event Propose(
        uint256 id,
        uint256 amount,
        address recipient,
        address creator,
        string name
    );
    event VoteCast(uint256 id, address voter, VoteType voteType, uint256 weight);
    event Finalize(uint256 id, bool passed);

    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, "DAO: must be token holder");
        _;
    }

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }

    // Allow contract to receive Ether
    receive() external payable {}

    function createProposal(
        string memory _name,
        uint256 _amount,
        address payable _recipient
    ) external onlyInvestor {
        require(address(this).balance >= _amount, "DAO: insufficient balance");

        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            name: _name,
            amount: _amount,
            recipient: _recipient,
            votesFor: 0,
            votesAgainst: 0,
            finalized: false
        });

        emit Propose(proposalCount, _amount, _recipient, msg.sender, _name);
    }

    /// @notice Cast a vote: For or Against
    function vote(uint256 _id, VoteType voteType) external onlyInvestor {
        Proposal storage proposal = proposals[_id];

        require(!proposal.finalized, "DAO: proposal already finalized");
        require(!votesCast[msg.sender][_id], "DAO: already voted");
        require(
            voteType == VoteType.For || voteType == VoteType.Against,
            "DAO: invalid vote type"
        );

        uint256 weight = token.balanceOf(msg.sender);
        require(weight > 0, "DAO: no voting weight");

        votesCast[msg.sender][_id] = true;

        if (voteType == VoteType.For) {
            proposal.votesFor += weight;
        } else {
            // voteType == Against
            proposal.votesAgainst += weight;
        }

        emit VoteCast(_id, msg.sender, voteType, weight);
    }

    function finalizeProposal(uint256 _id) external onlyInvestor {
        Proposal storage proposal = proposals[_id];
        require(!proposal.finalized, "DAO: already finalized");

        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        require(totalVotes >= quorum, "DAO: quorum not reached");

        proposal.finalized = true;

        bool passed = false;
        if (proposal.votesFor > proposal.votesAgainst) {
            passed = true;
            require(
                address(this).balance >= proposal.amount,
                "DAO: insufficient balance to transfer"
            );
            (bool sent, ) = proposal.recipient.call{value: proposal.amount}("");
            require(sent, "DAO: transfer failed");
        }

        emit Finalize(_id, passed);
    }

    /// @notice Returns vote counts and finalization status for a proposal.
    function getProposalVotes(uint256 _id)
        external
        view
        returns (
            uint256 forVotes,
            uint256 againstVotes,
            bool isFinalized
        )
    {
        Proposal storage p = proposals[_id];
        forVotes = p.votesFor;
        againstVotes = p.votesAgainst;
        isFinalized = p.finalized;
    }
}
