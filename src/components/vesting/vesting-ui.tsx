'use client'

import { PublicKey } from '@solana/web3.js'
import { useMemo, useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVestingProgram, useVestingProgramAccount } from './vesting-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useWallet } from '@solana/wallet-adapter-react'

export function VestingCreate() {
  const { createVestingAccount } = useVestingProgram()
  const [company, setCompany] = useState('')
  const [mint, setMint] = useState('')
  const { publicKey } = useWallet()

  const isFormValid = company.length > 0 && mint.length > 0

  const handleSubmit = async () => {
    if (publicKey) {
      await createVestingAccount.mutateAsync({ companyName: company, mint: mint })
      setCompany('')
      setMint('')
    }
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-md mb-8">
        <p className="mb-2 text-lg font-semibold text-gray-700">Connect your wallet</p>
        <span className="text-gray-500 text-sm">Please connect your Solana wallet to create a vesting account.</span>
      </div>
    )
  }

  return (
    <Card className="max-w-md mx-auto mb-8">
      <CardHeader>
        <CardTitle>Create New Vesting Account</CardTitle>
        <CardDescription>Enter company and mint address to create a vesting account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              placeholder="Company"
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mint Address</label>
            <input
              type="text"
              placeholder="Mint"
              value={mint}
              onChange={e => setMint(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={createVestingAccount.isPending || !isFormValid}
          >
            {createVestingAccount.isPending ? 'Creating...' : 'Create Vesting Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function VestingList() {
  const { accounts, getProgramAccount } = useVestingProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-6">
          {accounts.data?.map(account => (
            <VestingCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">No accounts</h2>
          <p className="text-gray-500">No accounts found. Create one above to get started.</p>
        </div>
      )}
    </div>
  )
}

function VestingCard({ account }: { account: PublicKey }) {
  const { accountQuery, CreateEmployeeVesting } = useVestingProgramAccount({
    account,
  })

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [cliffTime, setCliffTime] = useState('')
  const [beneficiary, setBeneficiary] = useState('')

  const companyName = useMemo(
    () => accountQuery.data?.companyName ?? '',
    [accountQuery.data?.companyName]
  )

  const isFormValid =
    startTime && endTime && totalAmount && cliffTime && beneficiary

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await CreateEmployeeVesting.mutateAsync({
      startTime: parseInt(startTime),
      endTime: parseInt(endTime),
      totalAmount: parseInt(totalAmount),
      cliffTime: parseInt(cliffTime),
      beneficiary,
    })
    setStartTime('')
    setEndTime('')
    setTotalAmount('')
    setCliffTime('')
    setBeneficiary('')
  }

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>{companyName}</CardTitle>
        <CardDescription>
          Account:{' '}
          <ExplorerLink
            path={`account/${account}`}
            label={ellipsify(account.toString())}
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Start Time (Unix)</label>
              <input
                type="number"
                placeholder="Start Time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End Time (Unix)</label>
              <input
                type="number"
                placeholder="End Time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Total Allocation</label>
              <input
                type="number"
                placeholder="Total Allocation"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cliff Time (Unix)</label>
              <input
                type="number"
                placeholder="Cliff Time"
                value={cliffTime}
                onChange={e => setCliffTime(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Beneficiary Wallet Address</label>
              <input
                type="text"
                placeholder="Beneficiary wallet address"
                value={beneficiary}
                onChange={e => setBeneficiary(e.target.value)}
                className="input input-bordered w-full"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={CreateEmployeeVesting.isPending || !isFormValid}
          >
            {CreateEmployeeVesting.isPending
              ? 'Creating Employee Vesting...'
              : 'Create Employee Vesting Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
