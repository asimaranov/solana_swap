import { Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { struct, u8 } from '@solana/buffer-layout';
import { publicKey } from '@solana/buffer-layout-utils';
import { Connection, clusterApiUrl, Account, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CurveType, Numberu64, TokenSwap, TOKEN_SWAP_PROGRAM_ID } from '@solana/spl-token-swap';

const payer = Keypair.generate();
const owner = Keypair.generate();

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
  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL,
  );
  await connection.confirmTransaction(airdropSignature);

  // Token A, B mints. Mint authority is owner
  const tokenA = await createMint(
    connection,
    payer,
    owner.publicKey,
    null,
    9
  );

  const tokenB = await createMint(
    connection,
    payer,
    owner.publicKey,
    null,
    9
  );

  console.log(`Token A mint: ${tokenA}`)
  console.log(`Token B mint: ${tokenB}`)


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
    owner.publicKey
  );

  const tokenAccountPool = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenPool,
    owner.publicKey
  );


  // Token A, B accounts. For swap to store tokens. Owner is authority

  const tokenAccountA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenA,
    authority,
    true
  )

  const tokenAccountB = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenB,
    authority,
    true
  )

  console.log(`Swap token account A: ${tokenAccountA.address.toBase58()}`)
  console.log(`Swap token account B: ${tokenAccountB.address.toBase58()}`)

  await mintTo(connection, payer, tokenA, tokenAccountA.address, owner, 1_000_000);
  await mintTo(connection, payer, tokenB, tokenAccountB.address, owner, 1_000_000);


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
  )

  const fetchedTokenSwap = await TokenSwap.loadTokenSwap(
    connection,
    tokenSwapAccount.publicKey,
    TOKEN_SWAP_PROGRAM_ID,
    new Account(payer.secretKey)
  );



  // Token A, B, accounts. For swap to store tokens. Owner is authority

  const userAccountA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenA,
    authority,
    true
  )

  const userAccountB = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenB,
    authority,
    true
  )

  await mintTo(connection, payer, tokenA, userAccountA.address, owner, 10_000);

  console.log(`User account A: ${userAccountA.address.toBase58()}`)
  console.log(`User account B: ${userAccountB.address.toBase58()}`)

  const depositorPoolAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenPool,
    owner.publicKey,
    true
  )

  const userTransferAuthority = Keypair.generate();

  fetchedTokenSwap.swap(userAccountA.address, tokenAccountA.address, tokenAccountB.address, userAccountB.address, tokenAccountPool.address, new Account(userTransferAuthority.secretKey), 5000, 5000)
    

}


main()