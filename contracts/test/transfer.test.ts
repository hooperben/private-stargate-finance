import { Noir } from "@noir-lang/noir_js";
import { getRandomWithField } from "../helpers";
import { getTestingAPI } from "../helpers/get-testing-api";

import { UltraHonkBackend } from "@aztec/bb.js";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";

const createInputNote = (
  assetId: bigint,
  amount: bigint,
  owner: bigint,
  owner_secret: bigint,
  secret: bigint,
  leaf_index: bigint,
  path: bigint[],
  path_indices: bigint[],
) => {
  return {
    asset_id: assetId.toString(),
    asset_amount: amount.toString(),
    owner: owner.toString(),
    owner_secret: owner_secret.toString(),
    secret: secret.toString(),
    leaf_index: leaf_index.toString(),
    path: path.map((item) => item.toString()),
    path_indices: path_indices.map((item) => item.toString()),
  };
};

const emptyInputNote = createInputNote(
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
  [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
);

const createOutputNote = (
  owner: bigint,
  secret: bigint,
  asset_id: bigint,
  asset_amount: bigint,
) => {
  return {
    owner: owner.toString(),
    secret: secret.toString(),
    asset_id: asset_id.toString(),
    asset_amount: asset_amount.toString(),
  };
};

const emptyOutputNote = createOutputNote(0n, 0n, 0n, 0n);

describe("Testing Transfer functionality", () => {
  let Signers: SignerWithAddress[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let circuitNoir: Noir;
  let circuitBackend: UltraHonkBackend;

  let transferNoir: Noir;
  let transferBackend: UltraHonkBackend;

  let privateStargateFinance: Contract;
  let tree: PoseidonMerkleTree;

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

  beforeEach(async () => {
    Signers = await ethers.getSigners();
    ({
      poseidonHash,
      circuitNoir,
      circuitBackend,
      transferNoir,
      transferBackend,
      privateStargateFinance,
      tree,
    } = await getTestingAPI());
  });

  it.only("testing transfer functionality", async () => {
    const assetId = "0xc026395860Db2d07ee33e05fE50ed7bD583189C7";
    const amount = BigInt("5");
    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const owner_secret =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;
    const owner = BigInt((await poseidonHash([owner_secret])).toString());
    const assetIdBigInt = BigInt(assetId);
    const note = await poseidonHash([assetIdBigInt, amount, owner, secret]);

    const { witness } = await circuitNoir.execute({
      hash: BigInt(note.toString()).toString(),
      asset_id: assetIdBigInt.toString(),
      asset_amount: amount.toString(),
      owner: owner.toString(),
      secret: secret.toString(),
    });

    const depositProof = await circuitBackend.generateProof(witness);

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
    const leaf = await tree.getLeafValue(0);
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

    const startTime = performance.now();
    const transferProof = await transferBackend.generateProof(transferWitness);
    const endTime = performance.now();
    console.log(`Time to generate proof: ${endTime - startTime}ms`);
    console.log(transferProof);

    await tree.insert(alice_output_hash.toString(), 1);
    await tree.insert(bob_output_hash.toString(), 2);

    const bobRoot = (await tree.getRoot()).toBigInt();
    console.log("bobRoot: ", bobRoot);

    const bobProof = await tree.getProof(2);
    console.log("bobProof: ", bobProof);

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

    // Wait for the transaction to be mined and get the receipt
    // const receipt = await depositTx.wait();

    // Find the LeafInserted event
    // const leafInsertedEvent = receipt.events?.find(
    //   (event: any) => event.event === "LeafInserted",
    // );

    // if (leafInsertedEvent) {
    //   console.log("LeafInserted event:");
    //   console.log("  leafIndex:", leafInsertedEvent.args.leafIndex.toString());
    //   console.log("  leafValue:", leafInsertedEvent.args.leafValue.toString());
    // } else {
    //   console.log("LeafInserted event not found");
    // }
  });
});
