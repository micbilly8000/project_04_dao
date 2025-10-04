import { useEffect, useState } from 'react'
import { Container } from 'react-bootstrap'
import { ethers } from 'ethers'

// Components
import Navigation from './Navigation'
import Create from './Create'
import Proposals from './Proposals'
import Loading from './Loading'

// ABIs: Import your contract ABIs here
import DAO_ABI from '../abis/DAO.json'

// Config: Import your network config here
import config from '../config.json'

function App() {
  const [provider, setProvider] = useState(null)
  const [dao, setDao] = useState(null)
  const [treasuryBalance, setTreasuryBalance] = useState("0")

  const [account, setAccount] = useState(null)

  const [proposals, setProposals] = useState([])
  // quorum is stored as string (or BigNumber) to avoid overflow
  const [quorum, setQuorum] = useState("0")

  const [isLoading, setIsLoading] = useState(true)

  const loadBlockchainData = async () => {
    // set up provider
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    // instantiate DAO with signer for write operations
    const dao = new ethers.Contract(
      config[31337].dao.address,
      DAO_ABI,
      provider.getSigner()
    )
    setDao(dao)

    // fetch treasury balance
    let balance = await provider.getBalance(dao.address)
    balance = ethers.utils.formatUnits(balance, 18)
    setTreasuryBalance(balance)

    // fetch account
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })
    const accountAddr = ethers.utils.getAddress(accounts[0])
    setAccount(accountAddr)

    // fetch proposals count
    const countBN = await dao.proposalCount()
    const count = countBN.toNumber()  // this is safe since number of proposals is small
    const items = []
    for (let i = 0; i < count; i++) {
      const prop = await dao.proposals(i + 1)
      const voteCounts = await dao.getProposalVotes(i + 1)
      const forVotesBN = voteCounts[0]
      const againstVotesBN = voteCounts[1]
      const isFinalized = voteCounts[2]

      items.push({
        id: prop.id.toNumber(),
        name: prop.name,
        amount: prop.amount.toString(),   // raw wei as string
        recipient: prop.recipient,
        finalized: isFinalized,
        votesFor: forVotesBN.toString(),
        votesAgainst: againstVotesBN.toString()
      })
    }
    setProposals(items)

    // fetch quorum, but avoid overflow
    const quorumBN = await dao.quorum()
    setQuorum(quorumBN.toString())

    setIsLoading(false)
  }

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData()
    }
  }, [isLoading])

  return (
    <Container>
      <Navigation account={account} />

      <h1 className="my-4 text-center">Welcome to our DAO!</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Create
            provider={provider}
            dao={dao}
            setIsLoading={setIsLoading}
          />

          <hr />

          <p className="text-center">
            <strong>Treasury Balance:</strong> {treasuryBalance} ETH
          </p>

          <hr />

          <Proposals
            provider={provider}
            dao={dao}
            proposals={proposals}
            quorum={quorum}
            setIsLoading={setIsLoading}
          />
        </>
      )}
    </Container>
  )
}

export default App
