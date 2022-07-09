import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { ItPubToken } from "../target/types/it_pub_token";

describe("it_pub_token", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ItPubToken as Program<ItPubToken>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
