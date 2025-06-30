// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import vestingIDL from '../target/idl/vesting.json'
import type { Vesting } from '../target/types/vesting'

// Re-export the generated IDL and type
export { Vesting, vestingIDL }

// The programId is imported from the program IDL.
export const VESTING_PROGRAM_ID = new PublicKey(vestingIDL.address)


export function getVestingProgram(provider: AnchorProvider, address?: PublicKey): Program<Vesting> {
  return new Program({ ...vestingIDL, address: address ? address.toBase58() : vestingIDL.address } as Vesting, provider)
}


export function getVestingProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'testnet':
        return new PublicKey('6Q5NBNNJNukLLYqdMKtM6nv359wSXQ1h1HRk67mS1jMW')
    case 'devnet':
    return new PublicKey('6Q5NBNNJNukLLYqdMKtM6nv359wSXQ1h1HRk67mS1jMW')
    case 'mainnet-beta':
    default:
      return VESTING_PROGRAM_ID
  }
}
