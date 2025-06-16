import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { parseUnits } from "ethers";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";
import {
  createInputNote,
  createOutputNote,
  emptyInputNote,
  emptyOutputNote,
} from "../helpers/formatting";
import { approve } from "../helpers/functions/approve";
import { getTestingAPI } from "../helpers/get-testing-api";
import { PrivateStargateFinance, USDC } from "../typechain-types";

describe("Testing Withdraw functionality", () => {
  let Signers: HardhatEthersSigner[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let depositNoir: Noir;
  let depositBackend: UltraHonkBackend;

  let transferNoir: Noir;
  let transferBackend: UltraHonkBackend;

  let withdrawNoir: Noir;
  let withdrawBackend: UltraHonkBackend;

  let privateStargateFinance: PrivateStargateFinance;
  let tree: PoseidonMerkleTree;

  let usdcDeployment: USDC;

  beforeEach(async () => {
    ({
      Signers,
      usdcDeployment,
      poseidonHash,
      depositNoir,
      depositBackend,
      transferNoir,
      transferBackend,
      withdrawNoir,
      withdrawBackend,
      privateStargateFinance,
      tree,
    } = await getTestingAPI());
  });

  const getNullifier = async (
    leafIndex: bigint,
    owner: bigint,
    secret: bigint,
    assetId: bigint,
    amount: bigint,
  ) => {
    const nullifier = await poseidonHash([
      leafIndex,
      owner,
      secret,
      assetId,
      amount,
    ]);

    return nullifier;
  };

  const getOutputHash = async (
    owner: bigint,
    secret: bigint,
    assetId: bigint,
    amount: bigint,
  ) => {
    const noteHash = await poseidonHash([assetId, amount, owner, secret]);
    return noteHash;
  };

  it("testing withdraw functionality", async () => {
    const assetId = await usdcDeployment.getAddress();
    const amount = BigInt("5");
    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const owner_secret =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;
    const owner = BigInt((await poseidonHash([owner_secret])).toString());

    const assetIdBigInt = BigInt(assetId);
    const note = await poseidonHash([assetIdBigInt, amount, owner, secret]);

    const { witness } = await depositNoir.execute({
      hash: BigInt(note.toString()).toString(),
      asset_id: assetIdBigInt.toString(),
      asset_amount: amount.toString(),
      owner: owner.toString(),
      secret: secret.toString(),
    });

    const depositProof = await depositBackend.generateProof(witness, {
      keccak: true,
    });

    await approve(
      Signers[0],
      await usdcDeployment.getAddress(),
      await privateStargateFinance.getAddress(),
      parseUnits("5", 6),
    );

    // deposit the tokens into the pool
    await privateStargateFinance.deposit(
      assetId,
      amount,
      depositProof.proof,
      depositProof.publicInputs,
      "0x",
    );

    // update our tree
    await tree.insert(depositProof.publicInputs[0], 0);

    // get the merkle proof to spend our input note
    const merkleProof = await tree.getProof(0);
    const leafIndex = 0n;

    // create the input note to spend
    const alice_input_note = createInputNote(
      BigInt(assetId),
      amount,
      owner,
      owner_secret,
      secret,
      leafIndex,
      merkleProof.siblings.map((item) => item.toBigInt()),
      merkleProof.indices.map((item) => BigInt(item)),
    );

    const alice_input_nullifer = await getNullifier(
      leafIndex,
      owner,
      secret,
      BigInt(assetId),
      amount,
    );

    // ALICE CHANGE
    const alice_owner_secret = owner_secret;
    const alice_owner = owner;
    const alice_amount = 3n;
    const alice_note_secret =
      19536471094918068928039225564664574556680178861106125446000998678966251111926n;

    // BOB RECEIVES
    const bob_owner_secret =
      6955001134965379637962992480442037189090898019061077075663294923529403402038n;
    const bob_owner = await poseidonHash([bob_owner_secret]);
    const bob_note_secret =
      3957740128091467064337395812164919758932045173069261808814882570720300029469n;
    const bob_amount = 2n;

    // OUTPUT NOTES
    const alice_output_note = createOutputNote(
      alice_owner,
      alice_note_secret,
      BigInt(assetId),
      alice_amount,
    );
    const alice_output_hash = await getOutputHash(
      BigInt(alice_output_note.owner),
      BigInt(alice_output_note.secret),
      BigInt(alice_output_note.asset_id),
      BigInt(alice_output_note.asset_amount),
    );

    const bobOutputNote = createOutputNote(
      BigInt(bob_owner.toString()),
      bob_note_secret,
      BigInt(assetId),
      bob_amount,
    );
    const bob_output_hash = await getOutputHash(
      BigInt(bobOutputNote.owner),
      BigInt(bobOutputNote.secret),
      BigInt(bobOutputNote.asset_id),
      BigInt(bobOutputNote.asset_amount),
    );

    const inputNotes = [alice_input_note, emptyInputNote, emptyInputNote];
    const outputNotes = [alice_output_note, bobOutputNote, emptyOutputNote];
    const nullifiers = [alice_input_nullifer, 0n, 0n];
    const outputHashes = [alice_output_hash, bob_output_hash, 0n];

    const root = await tree.getRoot();

    const { witness: transferWitness } = await transferNoir.execute({
      root: root.toBigInt().toString(),
      input_notes: inputNotes,
      output_notes: outputNotes,
      nullifiers: nullifiers.map((item) => item.toString()),
      output_hashes: outputHashes.map((item) => item.toString()),
    });

    const transferProof = await transferBackend.generateProof(transferWitness, {
      keccak: true,
    });

    // submit the transfer TX (as relayer)
    await privateStargateFinance
      .connect(Signers[10])
      .transfer(transferProof.proof, transferProof.publicInputs);

    await tree.insert(transferProof.publicInputs[4], 1);
    await tree.insert(transferProof.publicInputs[5], 2);

    const bobRoot = (await tree.getRoot()).toBigInt();
    const bobProof = await tree.getProof(2);

    const bobInputNote = createInputNote(
      BigInt(assetId),
      bob_amount,
      BigInt(bob_owner.toString()),
      bob_owner_secret,
      bob_note_secret,
      2n,
      bobProof.siblings.map((item) => item.toBigInt()),
      bobProof.indices.map((item) => BigInt(item)),
    );

    const bob_input_nullifer = await getNullifier(
      BigInt(bobInputNote.leaf_index),
      BigInt(bobInputNote.owner),
      BigInt(bobInputNote.secret),
      BigInt(assetId),
      BigInt(bobInputNote.asset_amount),
    );

    const { witness: withdrawWitness } = await withdrawNoir.execute({
      root: "0x" + bobRoot.toString(16),
      input_notes: [
        {
          asset_id: "0x" + BigInt(bobInputNote.asset_id).toString(16),
          asset_amount: "0x" + BigInt(bobInputNote.asset_amount).toString(16),
          owner: "0x" + BigInt(bobInputNote.owner).toString(16),
          owner_secret: "0x" + BigInt(bobInputNote.owner_secret).toString(16),
          secret: "0x" + BigInt(bobInputNote.secret).toString(16),
          leaf_index: "0x02",
          path: bobInputNote.path.map(
            (item) => "0x" + BigInt(item).toString(16),
          ),
          path_indices: bobInputNote.path_indices.map(
            (item) => "0x" + BigInt(item).toString(16),
          ),
        },
        emptyInputNote,
        emptyInputNote,
      ],
      nullifiers: [
        "0x" + BigInt(bob_input_nullifer.toString()).toString(16),
        "0",
        "0",
      ],
      exit_assets: [assetId, "0", "0"],
      exit_amounts: [
        "0x" + BigInt(bobInputNote.asset_amount).toString(16),
        "0",
        "0",
      ],
      exit_addresses: [Signers[9].address, "0", "0"],
      exit_address_hashes: [
        (await poseidonHash([BigInt(Signers[9].address)])).toString(),
        "0",
        "0",
      ],
    });

    const withdrawProof = await withdrawBackend.generateProof(withdrawWitness, {
      keccak: true,
    });

    const usdcBalanceBefore = await usdcDeployment.balanceOf(
      Signers[9].address,
    );

    await privateStargateFinance.withdraw(
      withdrawProof.proof,
      withdrawProof.publicInputs,
    );

    const usdcBalanceAfter = await usdcDeployment.balanceOf(Signers[9].address);

    expect(usdcBalanceAfter > usdcBalanceBefore).to.be.true;
  });
});
