// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "../libs/LibAppStorage.sol";

/**
 * This is a simple facet example which exports a single function.
 */
contract ExampleFacet {
  function getInt1() external view returns (uint) {
    AppStorage storage s = LibAppStorage.diamondStorage();
    return s.data.i1;
  }

  function setInt1(uint i) external {
    AppStorage storage s = LibAppStorage.diamondStorage();
    s.data.i1 = i;
  }
}
