## [3.0.3](https://github.com/yujiosaka/Cronyx/compare/v3.0.2...v3.0.3) (2023-11-04)


### Bug Fixes

* fix a bug of interrupt called after finish when finish fails ([693aa3d](https://github.com/yujiosaka/Cronyx/commit/693aa3d2201f6577a70f44c25fd40cf590a6f70e))

## [3.0.2](https://github.com/yujiosaka/Cronyx/compare/v3.0.1...v3.0.2) (2023-10-31)


### Bug Fixes

* fix a bug of job interval ended up set in future ([c4d1f01](https://github.com/yujiosaka/Cronyx/commit/c4d1f01c44075d581d7c2afa7c611e57126a4652))

## [3.0.1](https://github.com/yujiosaka/Cronyx/compare/v3.0.0...v3.0.1) (2023-10-29)


### Bug Fixes

* use mongoose options for mongodb job store ([7db82e3](https://github.com/yujiosaka/Cronyx/commit/7db82e3d9a62c29937e868307b43221cae2b8765))

# [3.0.0](https://github.com/yujiosaka/Cronyx/compare/v2.4.1...v3.0.0) (2023-10-29)


### Features

* add more attributes to job ([75b97b3](https://github.com/yujiosaka/Cronyx/commit/75b97b3b70e3fa513fdbc18065d59a02071618f5))
* allow synchronizing job stores manually ([5b7b26b](https://github.com/yujiosaka/Cronyx/commit/5b7b26bec151d0972a03d8f940f17c8d54a5166e))
* lower minimum peer dependency version ([c2edc7f](https://github.com/yujiosaka/Cronyx/commit/c2edc7f8e1bca7ba94f0c0411aa293c45ee4a6ef))


### BREAKING CHANGES

* synchronize won't be running automatically

## [2.4.1](https://github.com/yujiosaka/Cronyx/compare/v2.4.0...v2.4.1) (2023-10-26)


### Bug Fixes

* fix a bug of job lock not deactivated for redis ([acf9151](https://github.com/yujiosaka/Cronyx/commit/acf91512d120bf3c4d8891e2ab6620647729e602))

# [2.4.0](https://github.com/yujiosaka/Cronyx/compare/v2.3.1...v2.4.0) (2023-10-26)


### Features

* export mongodb schema and typeorm entity ([5bfda73](https://github.com/yujiosaka/Cronyx/commit/5bfda73828aa574b579d3d3dce8bcb61edd9f310))

## [2.3.1](https://github.com/yujiosaka/Cronyx/compare/v2.3.0...v2.3.1) (2023-10-25)


### Bug Fixes

* improve readability of debug logging ([3c920f8](https://github.com/yujiosaka/Cronyx/commit/3c920f8ce3aefb8f3167a8c5ec2b2f5a98e6b553))

# [2.3.0](https://github.com/yujiosaka/Cronyx/compare/v2.2.0...v2.3.0) (2023-10-25)


### Features

* distinguish argument error ([279dca2](https://github.com/yujiosaka/Cronyx/commit/279dca27bdd777574d1d932eba4dc4f17a76b502))

# [2.2.0](https://github.com/yujiosaka/Cronyx/compare/v2.1.1...v2.2.0) (2023-10-25)


### Features

* distinguish job lock not found error ([2d72fdf](https://github.com/yujiosaka/Cronyx/commit/2d72fdfe6fc970c4ae9514c8df0d46664a5cce2c))

## [2.1.1](https://github.com/yujiosaka/Cronyx/compare/v2.1.0...v2.1.1) (2023-10-25)


### Bug Fixes

* prevent same job lock to be updated multiple times ([07247a4](https://github.com/yujiosaka/Cronyx/commit/07247a46ebd7a19ae11c6d5af8445d159150d2c6))

# [2.1.0](https://github.com/yujiosaka/Cronyx/compare/v2.0.2...v2.1.0) (2023-10-25)


### Features

* add timezone option to request job options ([2be0f51](https://github.com/yujiosaka/Cronyx/commit/2be0f51fa8ce9705b4d2e9632023d74fe644f53f))

## [2.0.2](https://github.com/yujiosaka/Cronyx/compare/v2.0.1...v2.0.2) (2023-10-25)


### Bug Fixes

* fix a bug of id type not inferred ([5d2d75a](https://github.com/yujiosaka/Cronyx/commit/5d2d75a8087b898cc8f29c60c8cbfb3a55672c26))

## [2.0.1](https://github.com/yujiosaka/Cronyx/compare/v2.0.0...v2.0.1) (2023-10-25)


### Bug Fixes

* use id type directly for job class generics ([00ec519](https://github.com/yujiosaka/Cronyx/commit/00ec519a4648771606cf48b208c9bdcc618d5fc1))

# [2.0.0](https://github.com/yujiosaka/Cronyx/compare/v1.0.6...v2.0.0) (2023-10-24)


### Bug Fixes

* change the module export style ([e68074b](https://github.com/yujiosaka/Cronyx/commit/e68074bdb7d3c793cd52a86c0eec95343e7691a7))


### BREAKING CHANGES

* all modules will be exported from the main entrypoint

## [1.0.6](https://github.com/yujiosaka/Cronyx/compare/v1.0.5...v1.0.6) (2023-10-24)


### Bug Fixes

* elaborate exported types ([b31a782](https://github.com/yujiosaka/Cronyx/commit/b31a7827be1ba88bc977b2858f4564913d1a6f60))

## [1.0.5](https://github.com/yujiosaka/Cronyx/compare/v1.0.4...v1.0.5) (2023-10-24)


### Bug Fixes

* fix job-store and job-lock not imported from directory root ([d27d6e2](https://github.com/yujiosaka/Cronyx/commit/d27d6e20bf8e7558957906a8d541adb3e3a00a94))

## [1.0.4](https://github.com/yujiosaka/Cronyx/compare/v1.0.3...v1.0.4) (2023-10-24)


### Bug Fixes

* yet another fix to publish dist directory ([ba25130](https://github.com/yujiosaka/Cronyx/commit/ba25130db754e18e62613fa83d4bee01823ea1db))

## [1.0.3](https://github.com/yujiosaka/Cronyx/compare/v1.0.2...v1.0.3) (2023-10-24)


### Bug Fixes

* fix bug of dist directory not published ([95558d6](https://github.com/yujiosaka/Cronyx/commit/95558d63c0212438504e93f7c77be21ea83debcf))

## [1.0.2](https://github.com/yujiosaka/Cronyx/compare/v1.0.1...v1.0.2) (2023-10-24)


### Bug Fixes

* publish dist directory directly ([d2e0d99](https://github.com/yujiosaka/Cronyx/commit/d2e0d9971166dee2dcb833c4e53c5851e4f0fe82))

## [1.0.1](https://github.com/yujiosaka/Cronyx/compare/v1.0.0...v1.0.1) (2023-10-24)


### Bug Fixes

* fix a bug of empty npm package ([f19bb06](https://github.com/yujiosaka/Cronyx/commit/f19bb06da60c2cda7d3a7f10f15fcff592c564a2))

# 1.0.0 (2023-10-22)


### Features

* release cronyx ([a2089d3](https://github.com/yujiosaka/Cronyx/commit/a2089d3f5098f6adb9bc4ddb4e4386f363d320cf))
