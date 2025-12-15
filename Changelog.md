# Changelog

## [1.1.6](https://github.com/mysqljs/named-placeholders/compare/v1.1.5...v1.1.6) (2025-12-15)


### Bug Fixes

* update repository URL to reflect correct GitHub path ([#56](https://github.com/mysqljs/named-placeholders/issues/56)) ([17c6daa](https://github.com/mysqljs/named-placeholders/commit/17c6daafb08d1edb06952146efdbf0f97263db25))

## [1.1.5](https://github.com/mysqljs/named-placeholders/compare/v1.1.4...v1.1.5) (2025-12-15)


### Bug Fixes

* improve handling of mixed/nested quotes in query parsing ([aee5c5d](https://github.com/mysqljs/named-placeholders/commit/aee5c5d1ea4b2ba65e7bda16280287a42046481c))
* improve handling of mixed/nested quotes in query parsing ([#39](https://github.com/mysqljs/named-placeholders/issues/39)) ([aee5c5d](https://github.com/mysqljs/named-placeholders/commit/aee5c5d1ea4b2ba65e7bda16280287a42046481c))

## [1.1.4](https://github.com/mysqljs/named-placeholders/compare/v1.1.3...v1.1.4) (2025-12-05)


### ⚠ BREAKING CHANGES

* migrate to built in node test runner and remove mocha dependency ([#25](https://github.com/mysqljs/named-placeholders/issues/25))

### Bug Fixes

* resolve dependency conflicts ([#37](https://github.com/mysqljs/named-placeholders/issues/37)) ([bbaa20a](https://github.com/mysqljs/named-placeholders/commit/bbaa20ad8fba546c7e26c8f567ef67c618441836))


### Miscellaneous Chores

* release 1.1.4 ([5eb5a99](https://github.com/mysqljs/named-placeholders/commit/5eb5a99d4571d39da31a49bdd038ab7504cdd6cd))


### Continuous Integration

* migrate to built in node test runner and remove mocha dependency ([#25](https://github.com/mysqljs/named-placeholders/issues/25)) ([178b04e](https://github.com/mysqljs/named-placeholders/commit/178b04ec3a72f807bafd4813ea41b10c5f6b1e4b))

1.1.0 - 21/09/2015
  - exception is now thrown if parameters are missing

1.0.0 - 14/09/2015
  - added double-semicolon placeholders ( see https://github.com/sidorares/node-mysql2/issues/176 )
  - added toNumbered helper ( postgres style $1 parameters )
