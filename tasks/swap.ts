import { Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { struct, u8 } from '@solana/buffer-layout';
import { publicKey } from '@solana/buffer-layout-utils';
import { Connection, clusterApiUrl, Account, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CurveType, Numberu64, TokenSwap, TOKEN_SWAP_PROGRAM_ID } from '@solana/spl-token-swap';

const payer = Keypair.generate();
const mintAuthority = Keypair.generate();

const tokenSwapAccount = Keypair.generate();

const connection = new Connection(clusterApiUrl('testnet'), 'confirmed');

const SWAP_PROGRAM_OWNER_FEE_ADDRESS =
  process.env.SWAP_PROGRAM_OWNER_FEE_ADDRESS;

// Pool fees
const TRADING_FEE_NUMERATOR = 25;
const TRADING_FEE_DENOMINATOR = 10000;
const OWNER_TRADING_FEE_NUMERATOR = 5;
const OWNER_TRADING_FEE_DENOMINATOR = 10000;
const OWNER_WITHDRAW_FEE_NUMERATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 1;
const OWNER_WITHDRAW_FEE_DENOMINATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 6;
const HOST_FEE_NUMERATOR = 20;
const HOST_FEE_DENOMINATOR = 100;


async function createToken() {

  const mint = await createMint(
    connection,
    payer,
    mintAuthority.publicKey,
    null,
    9
  );
  return mint
}

const main = async () => {
  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL,
  );
  await connection.confirmTransaction(airdropSignature);

  const tokenA = await createToken();
  const tokenB = await createToken();

  const tokenAccountA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenA,
    payer.publicKey
  )
  
  const tokenAccountB = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenB,
    payer.publicKey
  )
  console.log(`Token A: ${tokenA}`)
  console.log(`Token B: ${tokenB}`)

  console.log(`Token account A: ${tokenAccountA.address.toBase58()}`)
  console.log(`Token account B: ${tokenAccountB.address.toBase58()}`)


  const [authority, bumpSeed] = await PublicKey.findProgramAddress(
    [tokenSwapAccount.publicKey.toBuffer()],
    TOKEN_SWAP_PROGRAM_ID,
  );


  const tokenPool = await createMint(connection, payer, authority, null, 2);

  const feeAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenPool,
    payer.publicKey
  );

  const swapPayer = Keypair.generate();
  await connection.confirmTransaction(await connection.requestAirdrop(swapPayer.publicKey, 1000000000));

  await new Promise(r => setTimeout(r, 2000));

  await TokenSwap.createTokenSwap(
    connection,
    new Account(swapPayer.secretKey),
    new Account(tokenSwapAccount.secretKey),
    authority,
    tokenAccountA.address,
    tokenAccountB.address,
    tokenPool,
    tokenA,
    tokenB,
    feeAccount.address,
    feeAccount.address,
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
    new Account(swapPayer.secretKey)
  );


}


main()