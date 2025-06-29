/* eslint-disable @typescript-eslint/no-unused-vars */
import { Keypair, PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import IDL from "../../target/idl/vesting.json";
import { Program } from "@coral-xyz/anchor";
import { Vesting } from "../../target/types/vesting";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

describe("Vesting smart contract tests", () => {
    let companyName = "company name";
    let beneficiary: Keypair;
    let provider: anchor.AnchorProvider;
    let program: Program<Vesting>;
    let connection: Connection;
    let employer: Keypair;
    let mint: PublicKey;
    let beneficiaryProvider: anchor.AnchorProvider;
    let program2: Program<Vesting>;
    let vestingAccountKey: PublicKey;
    let treasuryTokenAccount: PublicKey;
    let employeeAccount: PublicKey;

    beforeAll(async () => {
        // Use local validator instead of bankrun
        connection = new Connection("http://127.0.0.1:8899", "confirmed");
        
        // Create keypairs
        beneficiary = new anchor.web3.Keypair();
        employer = new anchor.web3.Keypair();

        // Airdrop SOL to accounts
        const employerAirdrop = await connection.requestAirdrop(employer.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        const beneficiaryAirdrop = await connection.requestAirdrop(beneficiary.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);
        
        // Wait for airdrops to confirm
        await connection.confirmTransaction(employerAirdrop);
        await connection.confirmTransaction(beneficiaryAirdrop);

        // Create wallet and provider
        const wallet = new anchor.Wallet(employer);
        provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: "confirmed"
        });

        anchor.setProvider(provider);

        // Initialize program
        program = new Program(IDL as Vesting, provider);

        // Create mint
        mint = await createMint(
            connection,
            employer,
            employer.publicKey,
            null,
            2
        );

        // Create beneficiary provider
        const beneficiaryWallet = new anchor.Wallet(beneficiary);
        beneficiaryProvider = new anchor.AnchorProvider(connection, beneficiaryWallet, {
            commitment: "confirmed"
        });

        program2 = new Program(IDL as Vesting, beneficiaryProvider);

        // Generate PDAs
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
                vestingAccountKey.toBuffer()
            ],
            program.programId
        );
    });

    it("should create a vesting account", async () => {
        try {
            const tx = await program.methods
                .createVestingAccount(companyName)
                .accounts({
                    signer: employer.publicKey,
                    mint,
                    tokenProgram: TOKEN_PROGRAM_ID
                })
                .rpc({
                    commitment: "confirmed"
                });
            
            const vestingAccountData = await program.account.vestingAccount.fetch(
                vestingAccountKey, 
                "confirmed"
            );
            
            console.log("vesting account data:", vestingAccountData);
            console.log("creating vesting account:", tx);
            
            expect(vestingAccountData).toBeDefined();
        } catch (error) {
            console.error("Test failed:", error);
            throw error;
        }
    });
});