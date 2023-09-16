module.exports = {
  "version": 2,
  "solc": {
    "license": "MIT",
    "version": "0.8.21"
  },
  "commands": {
    "build": "forge build"
  },
  "paths": {
    "artifacts": "out",
    "src": {
      "facets": [
        "src/facets/*Facet.sol"
      ]
    },
    "generated": {
      "solidity": "src/generated",
      "support": ".gemforge",
      "deployments": "gemforge.deployments.json"
    },
    "lib": {
      "diamond": "lib/diamond-2-hardhat"
    }
  },
  "artifacts": {
    "format": "foundry"
  },
  "generator": {
    "proxyInterface": {
      "imports": []
    }
  },
  "diamond": {
    "publicMethods": false,
    "coreFacets": [
      "OwnershipFacet",
      "DiamondCutFacet",
      "DiamondLoupeFacet"
    ]
  },
  "hooks": {
    "preBuild": "",
    "postBuild": "",
    "preDeploy": "",
    "postDeploy": ""
  },
  "wallets": {
    "wallet1": {
      "type": "mnemonic",
      "config": {
        "words": "test test test test test test test test test test test junk",
        "index": 0
      }
    },
  },
  "networks": {
    "local": {
      "rpcUrl": "http://localhost:58545"
    },
  },
  "targets": {
    "local": {
      "network": "local",
      "wallet": "wallet1",
      "initArgs": []
    },
  }
}