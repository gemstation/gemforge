# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
