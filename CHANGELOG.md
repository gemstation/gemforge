# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.6.5](https://github.com/gemstation/gemforge/compare/v2.6.4...v2.6.5) (2023-12-14)

### [2.6.4](https://github.com/gemstation/gemforge/compare/v2.6.3...v2.6.4) (2023-11-13)


### Bug Fixes

* abi output was missing function names ([69241e0](https://github.com/gemstation/gemforge/commit/69241e0e9f7cf0d2f1e0fe0abfb53b4af4bb3970))

### [2.6.3](https://github.com/gemstation/gemforge/compare/v2.6.2...v2.6.3) (2023-11-13)


### Bug Fixes

* ensure all events are unique in the generated abi ([bb4b7ed](https://github.com/gemstation/gemforge/commit/bb4b7ed9404fd7fa3bfc4881aa905dc2fc561b19))

### [2.6.2](https://github.com/gemstation/gemforge/compare/v2.6.1...v2.6.2) (2023-11-07)


### Bug Fixes

* ensure abi.json has no duplicate named fragment ([dba5b88](https://github.com/gemstation/gemforge/commit/dba5b88e62186ec890f9824ce350563c36539d44))

### [2.6.1](https://github.com/gemstation/gemforge/compare/v2.6.0...v2.6.1) (2023-10-30)

## [2.6.0](https://github.com/gemstation/gemforge/compare/v2.5.0...v2.6.0) (2023-10-25)


### Features

* LibDiamondHelper now replaces selectors that override core selectors ([#28](https://github.com/gemstation/gemforge/issues/28)) ([a412176](https://github.com/gemstation/gemforge/commit/a412176322a81b036afb5137d421bd9a80919861))

## [2.5.0](https://github.com/gemstation/gemforge/compare/v2.4.0...v2.5.0) (2023-10-24)


### Features

* allow core facets to be overridden ([#26](https://github.com/gemstation/gemforge/issues/26)) ([5dcead1](https://github.com/gemstation/gemforge/commit/5dcead17e6385664313cf6d014f1e8e2619fe8ef))
* pause and resume deployment cuts ([#27](https://github.com/gemstation/gemforge/issues/27)) ([d4c89ed](https://github.com/gemstation/gemforge/commit/d4c89ed00cc7f0ffc9a1363105673051a7e14a93))


### Bug Fixes

* error in gemforge.config.cjs template ([1441076](https://github.com/gemstation/gemforge/commit/14410768010ecd1c0a501845a969f352f4f9d526))

## [2.4.0](https://github.com/gemstation/gemforge/compare/v2.3.0...v2.4.0) (2023-10-01)


### Features

* generate abi.json - closes [#25](https://github.com/gemstation/gemforge/issues/25) ([6022386](https://github.com/gemstation/gemforge/commit/60223861a790a625a0887e71a5d62ae882d751ea))

## [2.3.0](https://github.com/gemstation/gemforge/compare/v2.2.0...v2.3.0) (2023-09-24)


### Features

* query() command ([#24](https://github.com/gemstation/gemforge/issues/24)) ([efd2dae](https://github.com/gemstation/gemforge/commit/efd2dae9a7c89b87dc9cb777f7c4b6dfef01e015)), closes [#12](https://github.com/gemstation/gemforge/issues/12) [#12](https://github.com/gemstation/gemforge/issues/12)

## [2.2.0](https://github.com/gemstation/gemforge/compare/v2.1.6...v2.2.0) (2023-09-22)


### Features

* dry run deployments - closes [#22](https://github.com/gemstation/gemforge/issues/22) ([#23](https://github.com/gemstation/gemforge/issues/23)) ([bc9ce38](https://github.com/gemstation/gemforge/commit/bc9ce3847132eb48e34bdbe497ae390e4e0afced))
* scaffold command checks for python existence, fixes [#19](https://github.com/gemstation/gemforge/issues/19) ([28c5ee2](https://github.com/gemstation/gemforge/commit/28c5ee220ec2844bb3fb880144a51b86381d990c))


### Bug Fixes

* stack too deep in LibDiamondHelper ([#21](https://github.com/gemstation/gemforge/issues/21)) ([277ffd7](https://github.com/gemstation/gemforge/commit/277ffd78906c8523287955e8be55156792a8c5e1))

### [2.1.6](https://github.com/gemstation/gemforge/compare/v2.1.5...v2.1.6) (2023-09-18)

### [2.1.5](https://github.com/gemstation/gemforge/compare/v2.1.4...v2.1.5) (2023-09-18)

### [2.1.4](https://github.com/gemstation/gemforge/compare/v2.1.3...v2.1.4) (2023-09-18)


### Bug Fixes

* demo project git repo paths should use https ([daf3158](https://github.com/gemstation/gemforge/commit/daf3158683653f9891e279439a1eea53b4036b2a))

### [2.1.3](https://github.com/gemstation/gemforge/compare/v2.1.1...v2.1.3) (2023-09-18)

### [2.1.2](https://github.com/gemstation/gemforge/compare/v2.1.1...v2.1.2) (2023-09-18)

### [2.1.1](https://github.com/gemstation/gemforge/compare/v2.1.0...v2.1.1) (2023-09-17)

## [2.1.0](https://github.com/gemstation/gemforge/compare/v1.8.0...v2.1.0) (2023-09-16)


### Features

* deployment targets, upgrade from v1 config - [#16](https://github.com/gemstation/gemforge/issues/16) ([cc12a63](https://github.com/gemstation/gemforge/commit/cc12a63429d2100ddc807367e93fcb64fc3042d9))

## [1.8.0](https://github.com/gemstation/gemforge/compare/v1.7.0...v1.8.0) (2023-09-12)


### Features

* --clean deploy to reset a diamond to a fresh start - [#15](https://github.com/gemstation/gemforge/issues/15) ([4823f6e](https://github.com/gemstation/gemforge/commit/4823f6eb7c3a31bd3a64fa1a6d354072f9f79f8d))

## [1.7.0](https://github.com/gemstation/gemforge/compare/v1.6.0...v1.7.0) (2023-09-11)


### Features

* output warning if custom structs detected ([9229994](https://github.com/gemstation/gemforge/commit/92299945ff825c9f1c8af7d1c67ee8cd084a225d))

## [1.6.0](https://github.com/gemstation/gemforge/compare/v1.5.2...v1.6.0) (2023-09-11)


### Features

* better error reporting if existing diamond is invalid ([6d31b10](https://github.com/gemstation/gemforge/commit/6d31b10f561b94ff74ade96a1bdc948bf79402ca))

### [1.5.2](https://github.com/gemstation/gemforge/compare/v1.5.1...v1.5.2) (2023-08-31)


### Bug Fixes

* avoid race conditions when fetching nonce ([77d5707](https://github.com/gemstation/gemforge/commit/77d5707623b237eeb01f9b09aed2fa8483e3d533))
* parallel facet deployment sometimes failing ([4335b05](https://github.com/gemstation/gemforge/commit/4335b0530e9ddfb9111681c58fa5245696cfe452))

### [1.5.1](https://github.com/gemstation/gemforge/compare/v1.5.0...v1.5.1) (2023-08-31)

## [1.5.0](https://github.com/gemstation/gemforge/compare/v1.4.2...v1.5.0) (2023-08-31)


### Features

* core facets with reserved names ([131316b](https://github.com/gemstation/gemforge/commit/131316b0b0cc2568ab64627f4b8c5185d50629f0))
* selector removal - [#8](https://github.com/gemstation/gemforge/issues/8) ([33224fd](https://github.com/gemstation/gemforge/commit/33224fd0915ce45c83960064b2d23056a258d78d))

### [1.4.2](https://github.com/gemstation/gemforge/compare/v1.4.1...v1.4.2) (2023-08-31)


### Bug Fixes

* import path resolution bug ([a1a5c04](https://github.com/gemstation/gemforge/commit/a1a5c049781fa76f114fe2169f027527cbaf9a0f))
* typescript config ([c593a21](https://github.com/gemstation/gemforge/commit/c593a2141bdeea6f7ac6df43b180f54c635da7d9))

### [1.4.1](https://github.com/gemstation/gemforge/compare/v1.4.0...v1.4.1) (2023-08-30)

## [1.4.0](https://github.com/gemstation/gemforge/compare/v1.3.4...v1.4.0) (2023-08-30)


### Features

* structs key for when generating proxy interface ([541adc5](https://github.com/gemstation/gemforge/commit/541adc5d16041f28160af2dc2123203952b74d96))

### [1.3.4](https://github.com/gemstation/gemforge/compare/v1.3.3...v1.3.4) (2023-08-23)

### [1.3.3](https://github.com/gemstation/gemforge/compare/v1.3.2...v1.3.3) (2023-08-23)

### [1.3.2](https://github.com/gemstation/gemforge/compare/v1.3.1...v1.3.2) (2023-08-22)


### Bug Fixes

* argv differences in local vs global mode ([9094efe](https://github.com/gemstation/gemforge/commit/9094efe3e2f68e458d96cdf39ecee75d5fb3d676))

### [1.3.1](https://github.com/gemstation/gemforge/compare/v1.3.0...v1.3.1) (2023-08-22)


### Bug Fixes

* bin call to node executable ([b1a9b1e](https://github.com/gemstation/gemforge/commit/b1a9b1ea23337f94547fc39283b37df62b7ff1f5))

## [1.3.0](https://github.com/gemstation/gemforge/compare/v1.2.0...v1.3.0) (2023-08-22)


### Features

* hardhat support [#3](https://github.com/gemstation/gemforge/issues/3) ([46262fd](https://github.com/gemstation/gemforge/commit/46262fddc84b61c114ba6fa78a1682825fbda2cd))


### Bug Fixes

* logo display in readme on npmjs page ([2ecb457](https://github.com/gemstation/gemforge/commit/2ecb4575d25b9ad2ce5265b8beb42ae550f3187a))

## 1.2.0 (2023-08-22)


### Features

* basic facet cut done ([af552d0](https://github.com/gemstation/gemforge/commit/af552d03f03de093aab81321d4fe91cee0da25d5))
* basic init command working ([cc27102](https://github.com/gemstation/gemforge/commit/cc2710261f36effcbe76b2dee386a402b0cbaceb))
* better logging control ([efa115f](https://github.com/gemstation/gemforge/commit/efa115f1a275d805129deedb12847ee08e8a245f))
* configurable deployment info file, more deployment info saved ([3c2ae58](https://github.com/gemstation/gemforge/commit/3c2ae5897a741a4e926ae85ecd2958aa187b977a))
* customize SPDX license id in output ([4722d4b](https://github.com/gemstation/gemforge/commit/4722d4b6ed8424ff64c59d7637eb29461c3f34fc))
* deploy to sepolia, securely ([257ad61](https://github.com/gemstation/gemforge/commit/257ad61c1bfc208c8327dcae285b4f800a4fe4be))
* initialization call ([e309c14](https://github.com/gemstation/gemforge/commit/e309c145e2b9dd9ce5b46557fd8e4202a56b4ebe))
* more updates and docs ([ba79347](https://github.com/gemstation/gemforge/commit/ba7934774897641ba06c062cd245921be39f99f9))
* write deployed addresses JSON file ([e66de2e](https://github.com/gemstation/gemforge/commit/e66de2e8162e7a9ab48e24dce9e06029d3893525))


### Bug Fixes

* remove redundant dep ([3cfc700](https://github.com/gemstation/gemforge/commit/3cfc700db9e95757eb17d4598f9b5c93b3d42dba))
