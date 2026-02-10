import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QuadraticVoting } from "../target/types/quadratic_voting";
import { expect } from "chai";
import {
    createMint,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    mintTo,
} from "@solana/spl-token";

describe("quadratic-voting", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.quadraticVoting as Program<QuadraticVoting>;
    const connection = provider.connection;
    const wallet = provider.wallet.publicKey;

    let daoPda: anchor.web3.PublicKey;
    let proposalPda: anchor.web3.PublicKey;
    let votePda: anchor.web3.PublicKey;

    let mint: anchor.web3.PublicKey;
    let creatorTokenAccount: anchor.web3.PublicKey;

    const daoName = "test-dao";
    const metadata = "proposal-1";
    const mintAmount = 10_000; // sqrt(10_000) = 100

    before(async () => {
        await connection.requestAirdrop(wallet, 2 * anchor.web3.LAMPORTS_PER_SOL);
        await new Promise((r) => setTimeout(r, 500));

        // create mint + ATA for creator
        mint = await createMint(connection, provider.wallet.payer, wallet, null, 0);
        creatorTokenAccount = getAssociatedTokenAddressSync(mint, wallet);

        const createAtaIx = createAssociatedTokenAccountInstruction(
            wallet,
            creatorTokenAccount,
            wallet,
            mint,
        );
        const tx = new anchor.web3.Transaction().add(createAtaIx);
        await provider.sendAndConfirm(tx);

        await mintTo(
            connection,
            provider.wallet.payer,
            mint,
            creatorTokenAccount,
            provider.wallet.payer,
            mintAmount,
        );
    });

    it("init_dao", async () => {
        [daoPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("dao"), wallet.toBuffer(), Buffer.from(daoName)],
            program.programId,
        );

        const tx = await program.methods
            .initDao(daoName)
            .accountsStrict({
                creator: wallet,
                daoAccount: daoPda,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        expect(tx).to.be.ok;

        const dao = await program.account.dao.fetch(daoPda);
        expect(dao.name).to.eq(daoName);
        expect(dao.authority.toBase58()).to.eq(wallet.toBase58());
        expect(dao.proposalCount.toNumber()).to.eq(0);
    });

    it("init_proposal", async () => {
        const daoBefore = await program.account.dao.fetch(daoPda);

        [proposalPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("proposal"),
                daoPda.toBuffer(),
                daoBefore.proposalCount.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
        );

        const tx = await program.methods
            .initProposal(metadata)
            .accountsStrict({
                creator: wallet,
                daoAccount: daoPda,
                proposal: proposalPda,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        expect(tx).to.be.ok;

        const proposal = await program.account.proposal.fetch(proposalPda);
        expect(proposal.metadata).to.eq(metadata);
        expect(proposal.authority.toBase58()).to.eq(wallet.toBase58());

        const daoAfter = await program.account.dao.fetch(daoPda);
        expect(daoAfter.proposalCount.toNumber()).to.eq(daoBefore.proposalCount.toNumber() + 1);
    });

    it("cast_vote", async () => {
        [votePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("vote"), wallet.toBuffer(), proposalPda.toBuffer()],
            program.programId,
        );

        const voteType = 1; // yes
        const tx = await program.methods
            .castVote(voteType)
            .accountsStrict({
                voter: wallet,
                daoAccount: daoPda,
                proposal: proposalPda,
                voteAccount: votePda,
                creatorTokenAccount,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        expect(tx).to.be.ok;

        const vote = await program.account.vote.fetch(votePda);
        expect(vote.authority.toBase58()).to.eq(wallet.toBase58());
        expect(vote.voteType).to.eq(voteType);
        expect(vote.voteCredits.toNumber()).to.eq(Math.floor(Math.sqrt(mintAmount)));
    });
});
