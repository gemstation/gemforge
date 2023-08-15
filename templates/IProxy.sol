// SPDX-License-Identifier: __SOLC_SPDX__
pragma solidity >=__SOLC_VERSION__;

import { IDiamondCut } from "lib/diamond-2-hardhat/contracts/interfaces/IDiamondCut.sol";
import { IDiamondLoupe } from "lib/diamond-2-hardhat/contracts/interfaces/IDiamondLoupe.sol";
import { IERC173 } from "lib/diamond-2-hardhat/contracts/interfaces/IERC173.sol";
import { IERC165 } from "lib/diamond-2-hardhat/contracts/interfaces/IERC165.sol";

interface IProxy is
    IERC173,
    IERC165,
    IDiamondCut,
    IDiamondLoupe
{
  __METHODS__
}
