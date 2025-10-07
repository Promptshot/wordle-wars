import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WordleEscrow } from "../target/types/wordle_escrow";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

describe("wordle-escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.WordleEscrow as Program<WordleEscrow>;
  const provider = anchor.getProvider();

  // Test accounts
  let creator: Keypair;
  let opponent: Keypair;
  let gameAccount: Keypair;
  let escrowAccount: Keypair;

  before(async () => {
    // Generate keypairs
    creator = Keypair.generate();
    opponent = Keypair.generate();
    gameAccount = Keypair.generate();
    escrowAccount = Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(creator.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(opponent.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  });

  it("Creates a game", async () => {
    const wagerAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);

    const tx = await program.methods
      .createGame(wagerAmount)
      .accounts({
        creator: creator.publicKey,
        gameAccount: gameAccount.publicKey,
        escrowAccount: escrowAccount.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator, gameAccount, escrowAccount])
      .rpc();

    console.log("Create game transaction signature:", tx);

    // Fetch the created game account
    const gameData = await program.account.gameAccount.fetch(gameAccount.publicKey);
    console.log("Game data:", gameData);
  });

  it("Joins a game", async () => {
    const tx = await program.methods
      .joinGame()
      .accounts({
        opponent: opponent.publicKey,
        gameAccount: gameAccount.publicKey,
        escrowAccount: escrowAccount.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([opponent])
      .rpc();

    console.log("Join game transaction signature:", tx);

    // Fetch the updated game account
    const gameData = await program.account.gameAccount.fetch(gameAccount.publicKey);
    console.log("Updated game data:", gameData);
  });

  it("Settles a game", async () => {
    const tx = await program.methods
      .settleGame(creator.publicKey)
      .accounts({
        gameAccount: gameAccount.publicKey,
        escrowAccount: escrowAccount.publicKey,
        creator: creator.publicKey,
        opponent: opponent.publicKey,
      })
      .rpc();

    console.log("Settle game transaction signature:", tx);

    // Fetch the final game account
    const gameData = await program.account.gameAccount.fetch(gameAccount.publicKey);
    console.log("Final game data:", gameData);
  });
});

