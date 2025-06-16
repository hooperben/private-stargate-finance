import {
  createInputNote,
  createOutputNote,
  emptyInputNote,
  emptyOutputNote,
} from "@/helpers/formatting";
import { approve } from "@/helpers/functions/approve";
import { getDepositDetails } from "@/helpers/functions/deposit";
import { getNoteHash } from "@/helpers/functions/get-note-hash";
import { getNullifier } from "@/helpers/functions/get-nullifier";
import { getTransferDetails, transfer } from "@/helpers/functions/transfer";
import { getTestingAPI } from "@/helpers/get-testing-api";
import { PoseidonMerkleTree } from "@/helpers/poseidon-merkle-tree";
import { PrivateStargateFinance, USDC } from "@/typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { parseUnits } from "ethers";
import { ethers } from "hardhat";

describe("Testing Transfer functionality", () => {
  let Signers: HardhatEthersSigner[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let privateStargateFinance: PrivateStargateFinance;
  let tree: PoseidonMerkleTree;

  let usdcDeployment: USDC;

  beforeEach(async () => {
    Signers = await ethers.getSigners();
    ({ usdcDeployment, poseidonHash, privateStargateFinance, tree } =
      await getTestingAPI());
  });

  it("testing transfer functionality", async () => {
    const assetId = await usdcDeployment.getAddress();
    const assetAmount = BigInt("5");
    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const ownerSecret =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;
    const owner = BigInt((await poseidonHash([ownerSecret])).toString());

    // in order to transfer we need to first deposit
    const { proof: depositProof } = await getDepositDetails({
      assetId,
      assetAmount,
      secret,
      owner,
    });
    await approve(
      Signers[0],
      await usdcDeployment.getAddress(),
      await privateStargateFinance.getAddress(),
      parseUnits("5", 6),
    );
    await privateStargateFinance.deposit(
      assetId,
      assetAmount,
      depositProof.proof,
      depositProof.publicInputs,
      "0x",
    );
    await tree.insert(depositProof.publicInputs[0], 0);

    // now we have deposited we can spend
    // get the merkle proof to spend our input note
    const merkleProof = await tree.getProof(0);
    const leafIndex = 0n;

    // create the input note to spend
    const aliceInputNote = createInputNote(
      assetId,
      assetAmount,
      owner,
      ownerSecret,
      secret,
      leafIndex,
      merkleProof.siblings,
      merkleProof.indices,
    );

    const aliceInputNullifer = await getNullifier(
      leafIndex,
      owner,
      secret,
      assetId,
      assetAmount,
    );

    // ALICE CHANGE NOTE DETAILS
    const alice_owner = owner;
    const alice_amount = 3n;
    const alice_note_secret =
      19536471094918068928039225564664574556680178861106125446000998678966251111926n;

    const aliceOutputNote = createOutputNote(
      alice_owner,
      alice_note_secret,
      assetId,
      alice_amount,
    );
    const aliceOutputHash = await getNoteHash(aliceOutputNote);

    // BOB SEND NOTE DETAILS
    const bobOwnerSecret =
      6955001134965379637962992480442037189090898019061077075663294923529403402038n;
    const bobOwner = (await poseidonHash([bobOwnerSecret])).toString();
    const bobNoteSecret =
      3957740128091467064337395812164919758932045173069261808814882570720300029469n;
    const bobAmount = 2n;
    const bobOutputNote = createOutputNote(
      bobOwner,
      bobNoteSecret,
      assetId,
      bobAmount,
    );

    const bobOutputHash = await getNoteHash(bobOutputNote);

    const inputNotes = [aliceInputNote, emptyInputNote, emptyInputNote];
    const outputNotes = [aliceOutputNote, bobOutputNote, emptyOutputNote];
    const nullifiers = [aliceInputNullifer, 0n, 0n];
    const outputHashes = [aliceOutputHash, bobOutputHash, 0n];

    const { proof: transferProof } = await getTransferDetails(
      tree,
      inputNotes,
      nullifiers,
      outputNotes,
      outputHashes,
    );

    await transfer(privateStargateFinance, transferProof, Signers[10]);

    await tree.insert(aliceOutputHash.toString(), 1);
    await tree.insert(bobOutputHash.toString(), 2);

    // TODO add tree check
    const bobRoot = (await tree.getRoot()).toBigInt();
    const bobProof = await tree.getProof(2);
  });
});
