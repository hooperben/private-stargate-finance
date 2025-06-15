import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";

import depositCircuit from "../../circuits/deposit/target/deposit.json";
import transferCircuit from "../../circuits/transfer/target/transfer.json";
import withdrawCircuit from "../../circuits/withdraw/target/withdraw.json";

export const getNoirClasses = async () => {
  // @ts-expect-error no idea
  const depositNoir = new Noir(depositCircuit);
  const depositBackend = new UltraHonkBackend(depositCircuit.bytecode);

  // @ts-expect-error no idea
  const transferNoir = new Noir(transferCircuit);
  const transferBackend = new UltraHonkBackend(transferCircuit.bytecode);

  // @ts-expect-error no idea
  const withdrawNoir = new Noir(withdrawCircuit);
  const withdrawBackend = new UltraHonkBackend(transferCircuit.bytecode);

  return {
    depositNoir,
    depositBackend,
    transferNoir,
    transferBackend,
    withdrawNoir,
    withdrawBackend,
  };
};
