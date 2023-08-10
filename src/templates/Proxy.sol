// SPDX-License-Identifier: MIT
pragma solidity >={SOLC_VERSION};

import { Diamond } from 'lib/diamond-2-hardhat/contracts/Diamond.sol';
import { LibDiamond } from 'lib/diamond-2-hardhat/contracts/libraries/LibDiamond.sol';
import { DiamondCutFacet } from 'lib/diamond-2-hardhat/contracts/facets/DiamondCutFacet.sol';
import { DiamondLoupeFacet } from 'lib/diamond-2-hardhat/contracts/facets/DiamondLoupeFacet.sol';
import { OwnershipFacet } from 'lib/diamond-2-hardhat/contracts/facets/OwnershipFacet.sol';
import { IDiamondCut } from 'lib/diamond-2-hardhat/contracts/interfaces/IDiamondCut.sol';
import { IDiamondLoupe } from 'lib/diamond-2-hardhat/contracts/interfaces/IDiamondLoupe.sol';
import { IERC165 } from 'lib/diamond-2-hardhat/contracts/interfaces/IERC165.sol';
import { IERC173 } from 'lib/diamond-2-hardhat/contracts/interfaces/IERC173.sol';
import { DiamondInit } from 'lib/diamond-2-hardhat/contracts/upgradeInitializers/DiamondInit.sol';
import { AppStorage, LibAppStorage } from '../libraries/LibAppStorage.sol';

contract Proxy is Diamond {
  constructor(address _contractOwner) payable Diamond(_contractOwner, address(new DiamondCutFacet())) {
    // add core facets
    _initCoreFacets();

    // setup ERC165 data
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
    ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
    ds.supportedInterfaces[type(IERC173).interfaceId] = true;

    // setup storage
    AppStorage storage s = LibAppStorage.diamondStorage();
  }

  // Internal

  function _initCoreFacets() private {
    // add basic facets
    IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](2);

    address _diamondLoupeFacet = address(new DiamondLoupeFacet());
    bytes4[] memory f1 = new bytes4[](4);
    f1[0] = IDiamondLoupe.facets.selector;
    f1[1] = IDiamondLoupe.facetFunctionSelectors.selector;
    f1[2] = IDiamondLoupe.facetAddresses.selector;
    f1[3] = IDiamondLoupe.facetAddress.selector;
    cut[0] = IDiamondCut.FacetCut({
      facetAddress: _diamondLoupeFacet,
      action: IDiamondCut.FacetCutAction.Add,
      functionSelectors: f1
    });

    address _ownershipFacet = address(new OwnershipFacet());
    bytes4[] memory f2 = new bytes4[](2);
    f2[0] = IERC173.owner.selector;
    f2[1] = IERC173.transferOwnership.selector;
    cut[1] = IDiamondCut.FacetCut({
      facetAddress: _ownershipFacet,
      action: IDiamondCut.FacetCutAction.Add,
      functionSelectors: f2
    });

    LibDiamond.diamondCut(cut, address(0), '');
  }
}
