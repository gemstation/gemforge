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
* [Clean](https://gemforge.xyz/commands/deploy/#fresh-deployments) existing deployments.
* Records diamond addresses to JSON file for history tracking.
* Pre- and post- hooks for both build and deploy steps.
* Generates [Foundry](https://github.com/gemstation/contracts-foundry/) and [Hardhat](https://github.com/gemstation/contracts-hardhat/) scaffolding.
* Highly configurable per project.
* [Fully documented](https://gemforge.xyz)

## Installation

_[Node.js](https://nodejs.org/) 16+ is required to run Gemforge. We recommend using [nvm](https://github.com/nvm-sh/nvm) to handle different Node versions._

We recommend installing `gemforge` globally:

* pnpm: `pnpm add --global gemforge`
* npm: `npm install --global gemforge`
* yarn: `yarn global add gemforge`

## Usage

You can use `gemforge --help` to see what commands are available:

```
Usage: gemforge [options] [command]

Options:
  -V, --version               output the version number
  -h, --help                  display help for command

Commands:
  init [options]              Initialize a gemforge config file for an existing project.
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

**Full documentation is available at https://gemforge.xyz.**

## Development

_Note: This section is only relevant for those wishing to work on the Gemforge tool itself. To use Gemforge with your project please read the [official documentation](https://gemforge.xyz)._

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