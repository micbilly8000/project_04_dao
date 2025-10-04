import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import { ethers } from 'ethers'
import { VoteType, VoteTypeLabel } from '../utils/constants'
import { useState } from 'react'

const Proposals = ({ provider, dao, proposals, quorum, setIsLoading }) => {
  // We need a local selected vote per proposal (or a shared state)
  const [selectedVotes, setSelectedVotes] = useState({})

  const voteHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const voteType = selectedVotes[id]
      if (voteType === undefined) {
        window.alert("Please select a vote option (For/Against).")
        return
      }
      const transaction = await dao.connect(signer).vote(id, voteType)
      await transaction.wait()
    } catch (err) {
      console.error("voteHandler error:", err)
      window.alert('User rejected or transaction reverted')
    }
    setIsLoading(true)
  }

  const finalizeHandler = async (id) => {
    try {
      const signer = await provider.getSigner()
      const transaction = await dao.connect(signer).finalizeProposal(id)
      await transaction.wait()
    } catch (err) {
      console.error("finalizeHandler error:", err)
      window.alert('User rejected or transaction reverted')
    }
    setIsLoading(true)
  }

  const onChangeVoteOption = (id, voteType) => {
    setSelectedVotes(prev => ({
      ...prev,
      [id]: voteType
    }))
  }

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>#</th>
          <th>Proposal Name</th>
          <th>Recipient Address</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Votes For</th>
          <th>Votes Against</th>
          <th>Cast Vote</th>
          <th>Finalize</th>
        </tr>
      </thead>
      <tbody>
        {proposals.map((proposal, index) => (
          <tr key={index}>
            <td>{proposal.id.toString()}</td>
            <td>{proposal.name}</td>
            <td>{proposal.recipient}</td>
            <td>{ethers.utils.formatUnits(proposal.amount, "ether")} ETH</td>
            <td>{proposal.finalized ? 'Finalized' : 'In Progress'}</td>
            <td>{proposal.votesFor}</td>
            <td>{proposal.votesAgainst}</td>
            <td>
              {!proposal.finalized && (
                <div>
                  <label style={{ marginRight: '8px' }}>
                    <input
                      type="radio"
                      name={`voteOption-${proposal.id}`}
                      value={VoteType.For}
                      checked={selectedVotes[proposal.id] === VoteType.For}
                      onChange={() => onChangeVoteOption(proposal.id, VoteType.For)}
                    />
                    {VoteTypeLabel[VoteType.For]}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`voteOption-${proposal.id}`}
                      value={VoteType.Against}
                      checked={selectedVotes[proposal.id] === VoteType.Against}
                      onChange={() => onChangeVoteOption(proposal.id, VoteType.Against)}
                    />
                    {VoteTypeLabel[VoteType.Against]}
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => voteHandler(proposal.id)}
                    style={{ marginLeft: '10px' }}
                  >
                    Cast Vote
                  </Button>
                </div>
              )}
            </td>
            <td>
              {!proposal.finalized && (
                // finalization is allowed only if total votes (for + against) exceed quorum
                // i.e. proposals[index].votesFor + proposals[index].votesAgainst > quorum
                (Number(proposal.votesFor) + Number(proposal.votesAgainst) > quorum) && (
                  <Button
                    variant="primary"
                    style={{ width: '100%' }}
                    onClick={() => finalizeHandler(proposal.id)}
                  >
                    Finalize
                  </Button>
                )
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export default Proposals
