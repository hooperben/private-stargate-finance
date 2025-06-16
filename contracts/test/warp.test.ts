import { Options } from "@layerzerolabs/lz-v2-utilities";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
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
import { getTransferDetails, transfer } from "../helpers/functions/transfer";
import { getWarpDetails } from "../helpers/functions/warp";
import { getTestingAPI } from "../helpers/get-testing-api";
import { PoseidonMerkleTree } from "../helpers/PoseidonMerkleTree";
import { REMOTE_EID } from "../helpers/test-suite/deploy-mock-tokens";
import { LZOFT, PrivateStargateFinance, USDC } from "../typechain-types";

describe("Testing Warp functionality", () => {
  let Signers: HardhatEthersSigner[];
  let poseidonHash: (inputs: bigint[]) => Promise<{ toString(): string }>;

  let privateStargateFinance: PrivateStargateFinance;
  let remotePSF: PrivateStargateFinance;
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
      remotePSF,
      tree,
    } = await getTestingAPI());
  });

  it("testing warp functionality", async () => {
    const assetId = await lzOFTDeploymentBase.getAddress();
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

    const aliceInputNullifier = await getNullifier(aliceInputNote);

    // ALICE CHANGE NOTE DETAILS
    const aliceOwner = owner;
    const aliceAmount = 3n;
    const aliceOutputNote = createOutputNote(
      aliceOwner,
      19536471094918068928039225564664574556680178861106125446000998678966251111926n,
      assetId,
      aliceAmount,
    );
    const aliceOutputHash = await getNoteHash(aliceOutputNote);

    // BOB SEND NOTE DETAILS
    const bobOwnerSecret =
      6955001134965379637962992480442037189090898019061077075663294923529403402038n;
    const bobOwner = (await poseidonHash([bobOwnerSecret])).toString();
    const bobAmount = 2n;
    const bobOutputNote = createOutputNote(
      bobOwner.toString(),
      3957740128091467064337395812164919758932045173069261808814882570720300029469n,
      assetId,
      bobAmount,
    );

    const bobOutputHash = await getNoteHash(bobOutputNote);

    const inputNotes = [aliceInputNote, emptyInputNote, emptyInputNote];
    const outputNotes = [aliceOutputNote, bobOutputNote, emptyOutputNote];
    const nullifiers = [BigInt(aliceInputNullifier.toString()), 0n, 0n];
    const outputHashes = [
      BigInt(aliceOutputHash.toString()),
      BigInt(bobOutputHash.toString()),
      0n,
    ];

    const { proof: transferProof } = await getTransferDetails(
      tree,
      inputNotes,
      nullifiers,
      outputNotes,
      outputHashes,
    );

    await transfer(privateStargateFinance, transferProof, Signers[0]);

    await tree.insert(aliceOutputHash.toString(), 1);
    await tree.insert(bobOutputHash.toString(), 2);

    // NOW BOB IS GOING TO WARP 1 OF HIS TOKENS REMOTE_EID
    const bobRoot = (await tree.getRoot()).toBigInt();
    const bobProof = await tree.getProof(2);

    const bobInputNote = createInputNote(
      BigInt(assetId),
      bobAmount,
      bobOwner,
      bobOwnerSecret,
      bobOutputNote.secret,
      2n,
      bobProof.siblings,
      bobProof.indices,
    );
    const bobInputNullifier = await getNullifier(bobInputNote);

    // BOB FIRST NOTE
    const bobOutputNote1 = createOutputNote(
      bobOwner,
      20692543145395281049201570311039088439241217488240697505239066711129161561961n,
      assetId,
      1n,
    );
    const bobOutputNote1Hash = await getNoteHash(bobOutputNote1);

    // BOB SECOND NOTE
    const bobOutputNote2 = createOutputNote(
      bobOwner,
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

    const lzOFTDeploymentRemoteBalanceBefore =
      await lzOFTDeploymentRemote.balanceOf(await remotePSF.getAddress());

    const warpTx = await privateStargateFinance.warp(
      REMOTE_EID,
      warpProof.proof,
      warpProof.publicInputs,
      options,
      {
        value: nativeFee * 3n, // TODO fix
      },
    );

    const lzOFTDeploymentRemoteBalanceAfter =
      await lzOFTDeploymentRemote.balanceOf(await remotePSF.getAddress());

    expect(lzOFTDeploymentRemoteBalanceBefore).eq(
      lzOFTDeploymentRemoteBalanceAfter -
        parseUnits(bobOutputNote2.asset_amount.toString(), 18),
    );
  });
});
