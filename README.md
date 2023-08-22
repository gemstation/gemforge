<p align="center">
  <img width="256" height="256" src="https://raw.githubusercontent.com/gemstation/gemforge/master/assets/logo.png">
</p>

# Gemforge

[![Build](https://github.com/gemstation/gemforge/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/gemstation/gemforge/actions/workflows/ci.yml)
[![NPM module](https://badge.fury.io/js/gemforge.svg)](https://badge.fury.io/js/gemforge)

> Command-line tool for building, deploying and upgrading Diamond Standard contracts on EVM chains.

## Why

The [Diamond Standard (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535) is one of _the_ best ways to build and deploy [infinite sized, upgradeable contracts](https://twitter.com/hiddentao/status/1692567215059407048).

But utilizing the standard involves having to write a lot of boilerplate code, including but not limited to the core diamond proxy contract, interface code to enable easy access for dapps, deployment code which calculates what facets to add and remove in each upgrade, etc.

**Gemforge** to the rescue!

By automating almost all aspects of this boilerplate code whilst still remaining highly configurable, Gemforge lessens the workload and saves time when developing with Diamond Standard.

## Features

* Auto-generates Diamond proxy code.
* Auto-generates deployment code for Foundry tests.
* Auto-calculates facet deployment and upgrades accurately and efficiently.
* Records diamond addresses to JSON file for history tracking.
* Pre- and post- hooks for both build and deploy steps.
* Generates [Foundry](https://github.com/gemstation/contracts-foundry/) and [Hardhat](https://github.com/gemstation/contracts-hardhat/) scaffolding.
* Highly configurable per project.
* _Coming soon: Extensive documentation_

## Installation

_[Node.js](https://nodejs.org/) 16+ is required to run Gemforge. We recommend using [nvm](https://github.com/nvm-sh/nvm) to handle different Node versions._

We recommend installing `gemforge` globally:

* pnpm: `pnpm add --global gemforge`
* npm: `npm install --global gemforge`
* yarn: `yarn global add gemforge`

## Usage

_NOTE: Full documentation is coming soon_.

### The basics

You can use `gemforge --help` to see what commands are available:

```
Usage: gemforge [options] [command]

Options:
  -V, --version               output the version number
  -h, --help                  display help for command

Commands:
  init [options]              Initialize a new project, generating necessary config files.
  scaffold [options]          Generate diamond smart contract project scaffolding.
  build [options]             Build a project.
  deploy [options] [network]  Deploy the diamond to a network.
  help [command]              display help for command
```

And use`gemforge <command> --help` to help for a specific command. E.g, for `gemforge init --help`:

```
Usage: gemforge deploy [options] [network]

Deploy the diamond to a network.

Arguments:
  network                network to deploy to (default: "local")

Options:
  -v, --verbose          verbose logging output
  -q, --quiet            disable logging output
  -f, --folder <folder>  folder to run gemforge in (default: ".")
  -c, --config <config>  gemforge config file to use (default: "gemforge.config.cjs")
  -n, --new              do a fresh deployment, ignoring any existing one
  -h, --help             display help for command
```

### gemforge init

This command will initialize a new Gemforge project by creating a Gemforge config file.

If using Gemforge with an existing smart contract project then this command is the first one to use.

```
> gemforge init

GEMFORGE: Working folder: /Users/ram/dev/gemstation/contracts
GEMFORGE: Initializing for foundry ...
GEMFORGE: Writing config file...
GEMFORGE: Wrote config file: /Users/ram/dev/gemstation/contracts/gemforge.config.cjs
GEMFORGE: Please edit the config file to your liking!
GEMFORGE: All done.
```

### gemforge scaffold

This command will clone the [Gemforge Foundry example repository](https://github.com/gemstation/contracts-foundry/) locally and set up all of its dependencies locally. 

If you're not sure about how to configure Gemforge and use it with your own contracts then use this command to see a working example. This example repository contains the bare minimum code and is a great starting point for your own smart contract projects.

```
> gemforge scaffold --folder ./tmp

GEMFORGE: Working folder: /Users/ram/dev/gemstation/contracts/tmp1
GEMFORGE: Checking Node.js version...
GEMFORGE: Ensuring folder is empty...
GEMFORGE: Checking that foundry is installed...
GEMFORGE: Generating Foundry scaffolding...
GEMFORGE: Clone git@github.com:gemstation/contracts-foundry.git...
...
GEMFORGE: All done.
```

To use the [Hardhat example repo](https://github.com/gemstation/contracts-hardhat/) use the `--hardhat` CLI option.

### gemforge build

This command builds the given smart contract project using Gemforge. 

Gemforge will first load the Gemforge config file for the given project and use it to work out all the other information it needs. Gemforge will auto-generate all necessary files to enable you to either test/deploy your code as the next step.

```
> gemforge build

GEMFORGE: Working folder: /Users/ram/dev/gemstation/contracts
GEMFORGE: Checking diamond folder lib path...
GEMFORGE: Creating folder for solidity output...
GEMFORGE: Generating DiamondProxy.sol...
GEMFORGE: Generating IDiamondProxy.sol...
GEMFORGE: Generating LibDiamondHelper.sol ...
GEMFORGE: Creating folder for support output...
GEMFORGE: Generating facets.json...
GEMFORGE: Running build...
...
GEMFORGE: All done.
```

### gemforge deploy

This command deploys the built code to either a local test network or the named network.

All network and deployment wallet information is loaded from the Gemforge config file. All created contracts will have their creation information placed into a generated JSON file, allowing you to save this information in youre repo and/or use it for other purposes.

```
> gemforge deploy

GEMFORGE: Working folder: /Users/ram/dev/gemstation/contracts
GEMFORGE: Selected network: local
GEMFORGE: Setting up network connection...
GEMFORGE:    Network chainId: 31337
GEMFORGE: Setting up wallet "wallet1" ...
GEMFORGE: Wallet deployer address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
GEMFORGE: Load existing deployment ...
GEMFORGE:    No existing deployment found.
GEMFORGE: Deploying diamond...
GEMFORGE:    DiamondProxy deployed at: 0xCD8a1C3ba11CF5ECfa6267617243239504a98d90
GEMFORGE: Loading facet artifacts...
GEMFORGE:    1 facets found.
GEMFORGE: Resolving what changes need to be applied ...
GEMFORGE:    1 facets need to be deployed.
GEMFORGE:    1 facet cuts need to be applied.
GEMFORGE: Deploying facets...
GEMFORGE:    Deploying ERC20Facet ...
GEMFORGE:    Deployed ERC20Facet at: 0x82e01223d51Eb87e16A03E24687EDF0F294da6f1
GEMFORGE: Deploying initialization contract: InitDiamond ...
GEMFORGE:    Initialization contract deployed at: 0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3
GEMFORGE: Calling diamondCut() on the proxy...
GEMFORGE: Deployments took place, saving info...
GEMFORGE: Running post-deploy hook...
GEMFORGE: All done.
```

## Development

Building the tool:

```
> pnpm build
```

Watching for changes and re-building:

```
> pnpm dev
```

Publishing a new release:

```
> pnpm release
```

## Contributing

Issues and PRs are welcome. Please read the [contributing guidelines](CONTRIBUTING.md).

## License

MIT - see [LICENSE.md](LICENSE.md)