import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Vesting } from "../../target/types/vesting";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
// @ts-ignore
import { createMint, mintTo } from "spl-token-bankrun";

import IDL from "../../target/idl/vesting.json";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BanksClient, Clock, ProgramTestContext } from "solana-bankrun";

describe("vesting", () => {
  let companyName = "company";
  let beneficiary: Keypair;
  let context: ProgramTestContext;
  let provider: BankrunProvider;
  let program: Program<Vesting>;
  let banksClient: BanksClient;
  let employer: Keypair;
  let mint: PublicKey;
  let beneficiaryProvider: BankrunProvider;
  let program2: Program<Vesting>;
  let vestingAccountKey: PublicKey;
  let treasuryTokenAccount: PublicKey;
  let employeeAccount: PublicKey;

  beforeAll(async () => {
    beneficiary = Keypair.generate();
    context = await startAnchor(
      "",
      [
        {
          name: "vesting",
          programId: new PublicKey(IDL.address),
        },
      ],
      [
        {
          address: beneficiary.publicKey,
          info: {
            lamports: 1_000_000_000,
            data: new Uint8Array(0), // Fixed: Changed from Buffer.alloc(0)
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
      ]
    );

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = new Program<Vesting>(IDL as Vesting, provider);

    banksClient = context.banksClient;

    employer = provider.wallet.payer;

    // @ts-ignore - Type error in spl-token-bankrun dependency
    mint = await createMint(banksClient, employer, employer.publicKey, null, 2);

    beneficiaryProvider = new BankrunProvider(context);
    beneficiaryProvider.wallet = new NodeWallet(beneficiary);
    program2 = new Program<Vesting>(IDL as Vesting, beneficiaryProvider);

    [vestingAccountKey] = PublicKey.findProgramAddressSync(
      [Buffer.from(companyName)],
      program.programId
    );

    [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vesting_treasury"), Buffer.from(companyName)],
      program.programId
    );

    [employeeAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("employee_vesting"),
        beneficiary.publicKey.toBuffer(),
        vestingAccountKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("should create a vesting account", async () => {
    const tx = await program.methods
      .createVestingAccount(companyName)
      .accounts({
        signer: employer.publicKey,
        mint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed" });

    const vestingAccountData = await program.account.vestingAccount.fetch(
      vestingAccountKey,
      "confirmed"
    );

    console.log("vestingAccountData", vestingAccountData);
    console.log("Create vesting account", tx);
  });

  it("should fund the treasury token account", async () => {
    const amount = 10_000 * 10 ** 9;

    // @ts-ignore - Type error in spl-token-bankrun dependency
    const mintTx = await mintTo(
      banksClient,
      employer,
      mint,
      treasuryTokenAccount,
      employer,
      amount
    );

    console.log("mintTx", mintTx);
  });

  it("should create an employee vesting account", async () => {
    // Fixed: Check your IDL for the correct method name
    // Common alternatives: createEmployeeAccount, addEmployee, etc.
    const tx2 = await program.methods
      .createEmployeeAccount(new BN(0), new BN(100), new BN(100), new BN(0)) // Changed method name
      .accounts({
        beneficiary: beneficiary.publicKey,
        vestingAccount: vestingAccountKey,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    console.log("Create Employee Account Transaction Signature:", tx2);
    console.log("Employee account", employeeAccount.toBase58());
  });

  it("should claim tokens", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const currentClock = await banksClient.getClock();
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(1000)
      )
    );

    const tx = await program2.methods
      .claimTokens(companyName)
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: "confirmed" });

    console.log("Claim tokens tx", tx);
  });
});