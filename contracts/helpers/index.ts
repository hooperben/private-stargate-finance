export const getRandomWithField = () =>
  BigInt(Math.ceil(Math.random() * 10 ** 96)) %
  BigInt("0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001");
