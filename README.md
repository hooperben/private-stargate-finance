# private-stargate-finance

This repository contains the contracts and circuits required to facilitate private, cross chain transfers of ERC20 tokens, by utilising the stargate.finance OFT contracts to manage liqudity on supported networks.

### Repository Structure

#### `contracts/`

`contracts/` contains the hardhat project that handles all of the smart contracts for private stargate finance

#### `circuits/`

`circuits/` contains the noir circuits that power all of the privacy enchancing features of this protocol

have a look at this excalidraw for a more indepth, slightly rambling explanation of how this all works:

[https://link.excalidraw.com/l/5BJ6ZosQeYI/8CgytajWHYz
](https://link.excalidraw.com/l/5BJ6ZosQeYI/8CgytajWHYz)

# versions

versions used of noir and bb:

```bash
% nargo --version
nargo version = 1.0.0-beta.6
noirc version = 1.0.0-beta.6+e796dfd67726cbc28eb9991782533b211025928d
(git version hash: e796dfd67726cbc28eb9991782533b211025928d, is dirty: false)
% bb --version
v0.84.0
```
