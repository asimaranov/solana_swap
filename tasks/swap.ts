import { Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { struct, u8 } from '@solana/buffer-layout';
import { publicKey } from '@solana/buffer-layout-utils';
import { Connection, clusterApiUrl, Account, PublicKey } from '@solana/web3.js';
import { approve, createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CurveType, Numberu64, TokenSwap, TOKEN_SWAP_PROGRAM_ID } from '@solana/spl-token-swap';

const payer = Keypair.generate();

const tokenSwapAccount = Keypair.generate();

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

const SWAP_PROGRAM_OWNER_FEE_ADDRESS =
  process.env.SWAP_PROGRAM_OWNER_FEE_ADDRESS;

const TRADING_FEE_NUMERATOR = 25;
const TRADING_FEE_DENOMINATOR = 10000;
const OWNER_TRADING_FEE_NUMERATOR = 5;
const OWNER_TRADING_FEE_DENOMINATOR = 10000;
const OWNER_WITHDRAW_FEE_NUMERATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 1;
const OWNER_WITHDRAW_FEE_DENOMINATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 6;
const HOST_FEE_NUMERATOR = 20;
const HOST_FEE_DENOMINATOR = 100;


const main = async () => {
  await connection.confirmTransaction(await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL,
  ));

  // Token A, B mints. Mint authority is owner
  const tokenA = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    9
  );

  const tokenB = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    9
  );

  console.log(`Token A mint: ${tokenA}`);
  console.log(`Token B mint: ${tokenB}`);

  // PDA of tokenSwapAccount for token swap program
  const [authority, bumpSeed] = await PublicKey.findProgramAddress(
    [tokenSwapAccount.publicKey.toBuffer()],
    TOKEN_SWAP_PROGRAM_ID,
  );

  // Mint for token pool. Owner is authority
  const tokenPool = await createMint(connection, payer, authority, null, 2);

  const feeAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenPool,
    payer.publicKey
  );

  const tokenAccountPool = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenPool,
    payer.publicKey
  );

  // Token A, B accounts. For swap to store tokens. Owner is authority

  const tokenAccountA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenA,
    authority,
    true
  );

  const tokenAccountB = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenB,
    authority,
    true
  );

  console.log(`Swap token account A: ${tokenAccountA.address.toBase58()}`);
  console.log(`Swap token account B: ${tokenAccountB.address.toBase58()}`);

  await mintTo(connection, payer, tokenA, tokenAccountA.address, payer, 1_000_000);
  await mintTo(connection, payer, tokenB, tokenAccountB.address, payer, 1_000_000);

  await TokenSwap.createTokenSwap(
    connection,
    new Account(payer.secretKey),
    new Account(tokenSwapAccount.secretKey),
    authority,
    tokenAccountA.address,
    tokenAccountB.address,
    tokenPool,
    tokenA,
    tokenB,
    feeAccount.address,
    tokenAccountPool.address,
    TOKEN_SWAP_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    TRADING_FEE_NUMERATOR,
    TRADING_FEE_DENOMINATOR,
    OWNER_TRADING_FEE_NUMERATOR,
    OWNER_TRADING_FEE_DENOMINATOR,
    OWNER_WITHDRAW_FEE_NUMERATOR,
    OWNER_WITHDRAW_FEE_DENOMINATOR,
    HOST_FEE_NUMERATOR,
    HOST_FEE_DENOMINATOR,
    CurveType.ConstantPrice,
    new Numberu64(1),
  );

  const fetchedTokenSwap = await TokenSwap.loadTokenSwap(
    connection,
    tokenSwapAccount.publicKey,
    TOKEN_SWAP_PROGRAM_ID,
    new Account(payer.secretKey)
  );


  const user = Keypair.generate()

  await connection.confirmTransaction(await connection.requestAirdrop(
    user.publicKey,
    LAMPORTS_PER_SOL,
  ));

  // User A, B, accounts. For swap to store tokens. Owner is owner

  const userAccountA = await getOrCreateAssociatedTokenAccount(
    connection,
    user,
    tokenA,
    user.publicKey,
    true
  );

  const userAccountB = await getOrCreateAssociatedTokenAccount(
    connection,
    user,
    tokenB,
    user.publicKey,
    true
  );

  const tokensToMintToUser = 10_000;
  const AtokensToSwap = 5000;
  const minBTokensToReceive = 4000;

  await mintTo(connection, user, tokenA, userAccountA.address, payer, tokensToMintToUser);

  console.log(`User account A: ${userAccountA.address.toBase58()}`);
  console.log(`User account B: ${userAccountB.address.toBase58()}`);

 const swapTransaction = await fetchedTokenSwap.swap(userAccountA.address, tokenAccountA.address, tokenAccountB.address, userAccountB.address, feeAccount.address, new Account(user.secretKey), AtokensToSwap, minBTokensToReceive);
 console.log(swapTransaction);
}


main()