import { Options } from "@layerzerolabs/lz-v2-utilities";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { parseUnits } from "ethers";
import {
  createInputNote,
  createOutputNote,
  emptyInputNote,
  emptyOutputNote,
} from "../helpers/formatting";
import { approve } from "../helpers/functions/approve";
import { getDepositDetails } from "../helpers/functions/deposit";
import { getNoteHash } from "../helpers/functions/get-note-hash";
import { getNullifier } from "../helpers/functions/get-nullifier";
import { getTransferDetails } from "../helpers/functions/transfer";
import { getWarpDetails } from "../helpers/functions/warp";
import { getTestingAPI } from "../helpers/get-testing-api";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";
import { REMOTE_EID } from "../helpers/test-suite/deploy-mock-tokens";
import { LZOFT, PrivateStargateFinance, USDC } from "../typechain-types";

describe("Testing Warp functionality", () => {
  let Signers: HardhatEthersSigner[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let privateStargateFinance: PrivateStargateFinance;
  let tree: PoseidonMerkleTree;

  let lzOFTDeploymentBase: LZOFT;
  let lzOFTDeploymentRemote: LZOFT;

  beforeEach(async () => {
    ({
      Signers,
      lzOFTDeploymentBase,
      lzOFTDeploymentRemote,
      poseidonHash,
      privateStargateFinance,
      tree,
    } = await getTestingAPI());
  });

  it("testing warp functionality", async () => {
    const assetId = await lzOFTDeploymentBase.getAddress();
    const assetAmount = BigInt("5");
    const secret =
      2389312107716289199307843900794656424062350252250388738019021107824217896920n;
    const owner_secret =
      10036677144260647934022413515521823129584317400947571241312859176539726523915n;
    const owner = BigInt((await poseidonHash([owner_secret])).toString());

    // in order to transfer we need to first deposit
    const { proof: depositProof } = await getDepositDetails({
      assetId,
      assetAmount,
      secret,
      owner,
    });
    await approve(
      Signers[0],
      await lzOFTDeploymentBase.getAddress(),
      await privateStargateFinance.getAddress(),
      parseUnits(assetAmount.toString(), 18),
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
    const merkleProof = await tree.getProof(0);
    const leafIndex = 0n;

    // create the input note to spend
    const alice_input_note = createInputNote(
      assetId,
      assetAmount,
      owner,
      owner_secret,
      secret,
      leafIndex,
      merkleProof.siblings,
      merkleProof.indices,
    );

    const alice_input_nullifer = await getNullifier(
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
    const alice_output_note = createOutputNote(
      alice_owner,
      alice_note_secret,
      assetId,
      alice_amount,
    );
    const alice_output_hash = await getNoteHash(alice_output_note);

    // BOB SEND NOTE DETAILS
    const bob_owner_secret =
      6955001134965379637962992480442037189090898019061077075663294923529403402038n;
    const bob_owner = await poseidonHash([bob_owner_secret]);
    const bob_note_secret =
      3957740128091467064337395812164919758932045173069261808814882570720300029469n;
    const bob_amount = 2n;
    const bobOutputNote = createOutputNote(
      bob_owner.toString(),
      bob_note_secret,
      assetId,
      bob_amount,
    );

    const bob_output_hash = await getNoteHash(bobOutputNote);

    const inputNotes = [alice_input_note, emptyInputNote, emptyInputNote];
    const outputNotes = [alice_output_note, bobOutputNote, emptyOutputNote];
    const nullifiers = [BigInt(alice_input_nullifer.toString()), 0n, 0n];
    const outputHashes = [
      BigInt(alice_output_hash.toString()),
      BigInt(bob_output_hash.toString()),
      0n,
    ];

    const { proof: transferProof } = await getTransferDetails(
      tree,
      inputNotes,
      nullifiers,
      outputNotes,
      outputHashes,
    );

    // submit the transfer TX (as relayer)
    await privateStargateFinance
      .connect(Signers[10])
      .transfer(transferProof.proof, transferProof.publicInputs);

    await tree.insert(alice_output_hash.toString(), 1);
    await tree.insert(bob_output_hash.toString(), 2);

    // NOW BOB IS GOING TO WARP 1 OF HIS TOKENS REMOTE_EID
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
    const bobInputNullifier = await getNullifier(
      bobInputNote.leaf_index,
      bobInputNote.owner,
      bobInputNote.secret,
      bobInputNote.asset_id,
      bobInputNote.asset_amount,
    );

    // BOB FIRST NOTE
    const bobOutputNote1 = createOutputNote(
      BigInt(bob_owner.toString()),
      20692543145395281049201570311039088439241217488240697505239066711129161561961n,
      BigInt(assetId),
      1n,
    );
    const bobOutputNote1Hash = await getNoteHash(bobOutputNote1);

    // BOB SECOND NOTE
    const bobOutputNote2 = createOutputNote(
      BigInt(bob_owner.toString()),
      19367321191663727441411635172708374860517590059336496178869629509133908474360n,
      BigInt(assetId),
      1n,
    );
    const bobOutputNote2Hash = await getNoteHash(bobOutputNote2);

    const options = Options.newOptions()
      .addExecutorLzReceiveOption(600000, 0)
      .toHex()
      .toString();

    const [nativeFee] = await privateStargateFinance.quote(
      REMOTE_EID,
      [bobOutputNote1Hash, bobOutputNote2Hash],
      options,
      false,
    );

    const { proof: warpProof } = await getWarpDetails(
      bobRoot,
      [bobInputNote, emptyInputNote, emptyInputNote],
      [bobOutputNote1, bobOutputNote2, emptyOutputNote],
      ["0x" + bobInputNullifier.toString(16), "0", "0"],
      [
        "0x" + bobOutputNote1Hash.toString(16),
        "0x" + bobOutputNote2Hash.toString(16),
        "0",
      ],
      ["0", "0x" + BigInt(bobOutputNote2.asset_id).toString(16), "0"],
      ["0", "0x" + BigInt(bobOutputNote2.asset_amount).toString(16), "0"],
    );

    const warpTx = await privateStargateFinance.warp(
      REMOTE_EID,
      warpProof.proof,
      warpProof.publicInputs,
      options,
      {
        value: nativeFee * 3n,
      },
    );
  });
});
