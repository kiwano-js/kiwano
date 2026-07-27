# Changelog

## [3.0.0-beta.7](https://github.com/kiwano-js/kiwano/compare/v3.0.0-beta.6...v3.0.0-beta.7) - 2026-07-09

### Changed

- Updated dependencies. ([3d70805](https://github.com/kiwano-js/kiwano/commit/3d7080544c139e0284c728230d9921311f335e88))
- Removed the `private` package metadata so the prerelease packages can be
  published. ([5bb4180](https://github.com/kiwano-js/kiwano/commit/5bb4180ee663357fd20e55b1e75865d7a4ad01d9))

## [3.0.0-beta.6](https://github.com/kiwano-js/kiwano/compare/v3.0.0-beta.5...v3.0.0-beta.6) - 2026-06-01

### Changed

- Updated the TypeORM peer dependency for `@kiwano/typeorm` to the TypeORM 1.0
  line. ([f1c6a42](https://github.com/kiwano-js/kiwano/commit/f1c6a42e0cec4ab8b05177048128b039e1f68965))

## [3.0.0-beta.5](https://github.com/kiwano-js/kiwano/compare/v3.0.0-beta.4...v3.0.0-beta.5) - 2026-05-14

### Changed

- Included `src` in the published package files alongside `dist`. ([4bb7211](https://github.com/kiwano-js/kiwano/commit/4bb72119487d61177494c75dea5000285a0f59f3))

## [3.0.0-beta.4](https://github.com/kiwano-js/kiwano/compare/v3.0.0-beta.3...v3.0.0-beta.4) - 2026-05-14

### Added

- Added subscription support to the core schema builder, including
  `.subscription()`, `.subscriptionResolvers()`, `.allowSubscription()`, and
  `.denySubscription()`. ([7170a3d](https://github.com/kiwano-js/kiwano/commit/7170a3d23bc65484ec6cd8eeb3e7cdf50a6ac916))

```ts
schema()
  .subscription("messageCreated", "Message")
  .subscriptionResolvers({
    messageCreated() {
      return {
        subscribe: () => pubsub.asyncIterator("messageCreated"),
        resolve: payload => payload.message,
      };
    },
  })
  .allowSubscription("admin");
```

- Added tests for the new subscription behavior and resolver compilation.
  ([056223b](https://github.com/kiwano-js/kiwano/commit/056223bb7b275769be9830923f4be693b0343630))

### Fixed

- Prevented resolver collections passed as classes from being instantiated more
  than once during schema compilation. ([299640b](https://github.com/kiwano-js/kiwano/commit/299640bbff6f2eaddfcd2224c429fa0f8a9e60fa))

### Changed

- Improved package and TypeScript configuration. ([c92dd01](https://github.com/kiwano-js/kiwano/commit/c92dd016096ea04c649882f5decc2e0e15f1acd9))
- Removed the generated static type file from source and adjusted package
  metadata. ([6010d5f](https://github.com/kiwano-js/kiwano/commit/6010d5f8c62b14967b7bf34ce93900b840355af8))

## [3.0.0-beta.3](https://github.com/kiwano-js/kiwano/compare/v3.0.0-beta.2...v3.0.0-beta.3) - 2026-02-27

### Fixed

- Fixed GraphQL ACL middleware role lookup so the configured `rolePath` is read
  from plain GraphQL context objects again. ([d21c48a](https://github.com/kiwano-js/kiwano/commit/d21c48a533eb1d27babcacf6114975df4387c781))

## [3.0.0-beta.2](https://github.com/kiwano-js/kiwano/compare/v3.0.0-beta.1...v3.0.0-beta.2) - 2025-07-09

### Changed

- Removed package `source` fields from package metadata. ([4724fab](https://github.com/kiwano-js/kiwano/commit/4724fab7c3bd5b95c3a82505911d6590bffd3b86))
- Adjusted plugin source build packaging. ([4724fab](https://github.com/kiwano-js/kiwano/commit/4724fab7c3bd5b95c3a82505911d6590bffd3b86))

## [3.0.0-beta.1](https://github.com/kiwano-js/kiwano/compare/v2.2.0-beta...v3.0.0-beta.1) - 2025-07-09

### Added

- Added a `FieldBuilder.includeDeleted()` option that makes generated TypeORM
  `all`, `find`, `relation`, `update`, and `delete` resolvers include
  soft-deleted rows. ([c6ae98f](https://github.com/kiwano-js/kiwano/commit/c6ae98fa30fe67b646931e49a9b275dcc25cc37a))

```ts
modelSchema(Project, dataSource)
  .find(field => field.includeDeleted())
  .all(field => field.includeDeleted());
```

- Added `ModelObjectTypeBuilder.includeDeletedRelations()` to mark generated
  relation fields as including soft-deleted rows. ([d7f2bd3](https://github.com/kiwano-js/kiwano/commit/d7f2bd3f16c782a522a318fcaa01a1b405225e5f))

```ts
modelSchema(Project, dataSource)
  .entity(type => type.includeDeletedRelations());
```

### Changed

- Modernized the repository and package layout: source files moved to `src/ts`,
  packages now expose ESM/CJS builds through `exports`, the build switched to
  Rslib, and the minimum runtime moved to Node 22.14 and pnpm 10.6. ([5cfb19f](https://github.com/kiwano-js/kiwano/commit/5cfb19f2c603740fd17b5e7b299e182e7ccfde76))
- Included declaration files in TypeScript configuration. ([7753ce6](https://github.com/kiwano-js/kiwano/commit/7753ce6545b4bbfbf729a25711459e0cda8ac23f))
- Updated the build system for the 3.0 beta line. ([b020c3c](https://github.com/kiwano-js/kiwano/commit/b020c3c478c0cb4ed609393e97094d1229b5b843))
- Replaced the Express ACL HTTP middleware helper with a Hono middleware helper.
  ([072768f](https://github.com/kiwano-js/kiwano/commit/072768f412a70005390182b4cffe0e25afb993ef))

```ts
// BEFORE
import { expressAclMiddleware } from "@kiwano/core";

app.use(expressAclMiddleware(acl));

// AFTER
import { honoAclMiddleware } from "@kiwano/core";

app.use(honoAclMiddleware(acl));
```

- Reverted temporary package-install workarounds that were only needed before a
  release was available. ([7e4fbec](https://github.com/kiwano-js/kiwano/commit/7e4fbec0f5ebe3630ebef8ac7df79ffdcacbd79b)) ([f6cceff](https://github.com/kiwano-js/kiwano/commit/f6cceff127172410f273a2ba533662ad55db9b03)) ([c62f12a](https://github.com/kiwano-js/kiwano/commit/c62f12af7e88358b8a78bf3900c6db9a99a85461)) ([f4381a1](https://github.com/kiwano-js/kiwano/commit/f4381a11f27329506b5830c392584a2a8d1137db))

## [2.2.0-beta](https://github.com/kiwano-js/kiwano/compare/v2.1.0...v2.2.0-beta) - 2025-03-27

### Added

- Added the TypeORM search filter `sortLength` option to sort shorter textual
  matches before longer matches. ([1a99735](https://github.com/kiwano-js/kiwano/commit/1a99735ff82bde7cac4300b25e2a90fa2952f0e2))

```ts
searchFilterPlugin()
  .field("title", { sortLength: true });
```

## [2.1.0](https://github.com/kiwano-js/kiwano/compare/v2.0.3...v2.1.0) - 2025-02-11

### Added

- Added explicit TypeORM search full-text options: `fullText`,
  `SearchFullTextModifier.BOOLEAN`, and
  `SearchFullTextModifier.NATURAL_LANGUAGE`. `SearchMode.FULL_TEXT` became the
  legacy form. ([cb1a087](https://github.com/kiwano-js/kiwano/commit/cb1a087ea6ec9c2b1ff3422ca2d467938d1f6419))

```ts
// BEFORE
searchFilterPlugin()
  .field("title", { mode: SearchMode.FULL_TEXT });

// AFTER
searchFilterPlugin()
  .field("title", {
    fullText: true,
    modifier: SearchFullTextModifier.BOOLEAN,
    mode: SearchMode.STARTS,
    sortRelevance: true,
  });
```

## [2.0.3](https://github.com/kiwano-js/kiwano/compare/v2.0.2...v2.0.3) - 2024-10-21

### Added

- Added manual mode to the equals filter plugin, so the generated filter input
  can be built only from explicitly configured fields. ([ce04e3a](https://github.com/kiwano-js/kiwano/commit/ce04e3a22b1a7a05d30c20ecd907e1c16bab20b7))

```ts
// BEFORE
equalsFilterPlugin()
  .field("status", "String");
// The plugin also auto-added matching fields from the target object type.

// AFTER
equalsFilterPlugin()
  .manual()
  .field("status", "String");
// Only explicitly configured fields are added.
```

## [2.0.2](https://github.com/kiwano-js/kiwano/compare/v2.0.1...v2.0.2) - 2024-10-18

### Added

- Added `.include()` to generated create and update input object builders, so
  automatic input generation can be allow-listed instead of only deny-listed.
  ([c912d2f](https://github.com/kiwano-js/kiwano/commit/c912d2f829db5add1a9be0dd23d43f0293bb50ac))

```ts
// BEFORE
entitySchema("Project")
  .entity(type => type
    .field("title", "String")
    .field("internalNote", "String"))
  .createInput(input => input.exclude("internalNote"));

// AFTER
entitySchema("Project")
  .entity(type => type
    .field("title", "String")
    .field("internalNote", "String"))
  .createInput(input => input.include("title"));
```

- Changed equals filter `.include()` from "add this extra typed field" to
  "allow-list these fields from the target object type". Use `.field()` for
  extra manually typed fields. ([c912d2f](https://github.com/kiwano-js/kiwano/commit/c912d2f829db5add1a9be0dd23d43f0293bb50ac))

```ts
// BEFORE
equalsFilterPlugin()
  .include("ownerId", "ID");

// AFTER
equalsFilterPlugin()
  .include("status", "ownerId")
  .field("externalId", "ID");
```

## [2.0.1](https://github.com/kiwano-js/kiwano/compare/v2.0.0...v2.0.1) - 2024-10-18

### Fixed

- Fixed a maximum call stack issue in schema/plugin behavior. ([a55ce4f](https://github.com/kiwano-js/kiwano/commit/a55ce4f261c4b76ed0a3d699f86907b969e48266)) ([489e3a4](https://github.com/kiwano-js/kiwano/commit/489e3a47adbac68b3d07d4e29fa73dae51710d21))

## [2.0.0](https://github.com/kiwano-js/kiwano/compare/v1.4.0...v2.0.0) - 2024-09-30

### Added

- Added full-text support to the TypeORM search plugin and changed
  `.field()`/`.relation()` search configuration to accept field arrays plus
  per-field options. ([4ed2f8b](https://github.com/kiwano-js/kiwano/commit/4ed2f8b185b7b22451a6963b1dbb0b3039cea9f0))

```ts
// BEFORE
searchFilterPlugin()
  .searchMode(SearchMode.STARTS)
  .field("title")
  .relation("author", "name");

// AFTER
searchFilterPlugin()
  .field(["title", "subtitle"], {
    mode: SearchMode.FULL_TEXT,
    sortRelevance: true,
  })
  .relation("author", ["firstName", "lastName"]);
```

### Fixed

- Added a fix aimed at preventing call stack overflows. ([909a585](https://github.com/kiwano-js/kiwano/commit/909a58559daa94b8ceb65bf793aa54e281771fee)) ([7d538b4](https://github.com/kiwano-js/kiwano/commit/7d538b4f0f10ddceb7cd146268310d859df9a023)) ([6ceff96](https://github.com/kiwano-js/kiwano/commit/6ceff96e68fa136be711f80d4f0b8b2eb5d6908a))

## [1.4.0](https://github.com/kiwano-js/kiwano/compare/v1.3.0...v1.4.0) - 2024-03-28

### Changed

- Updated dependencies and released version 1.4.0. ([22d586f](https://github.com/kiwano-js/kiwano/commit/22d586ffd26755c27f522e3f12f0c0bbfac0d40c))

## [1.3.0](https://github.com/kiwano-js/kiwano/compare/v1.2.0...v1.3.0) - 2023-08-31

### Added

- Added schema-prefix support to ACL resources, using the root schema name or
  generated schema tag as the ACL resource prefix. ([94d35a2](https://github.com/kiwano-js/kiwano/commit/94d35a24ea10923ae8a4b5c322d50714869ea014))

```ts
// BEFORE
acl.allow("Query.projects", "admin");

// AFTER
schema("api").use(acl);
acl.allow("api:Query.projects", "admin");
```

### Fixed

- Changed schema-level ACL application so `.allow()` and `.deny()` apply to
  object types, while query and mutation fields receive the combined
  schema-level and operation-level rules. ([94d35a2](https://github.com/kiwano-js/kiwano/commit/94d35a24ea10923ae8a4b5c322d50714869ea014))

```ts
// BEFORE
schema()
  .allow("admin")
  .allowQuery("reader");
// Query fields effectively only received query-level rules.

// AFTER
schema()
  .allow("admin")
  .allowQuery("reader");
// Query fields receive both "admin" and "reader".
```

### Changed

- Applied minor package metadata fixes. ([9b0c963](https://github.com/kiwano-js/kiwano/commit/9b0c9637790d1b0680746f8ed29d4f019f4fabf0)) ([ccaa47f](https://github.com/kiwano-js/kiwano/commit/ccaa47f3eea0b1117c399bcc8787031ec6d92acb))

## [1.2.0](https://github.com/kiwano-js/kiwano/compare/v1.1.0...v1.2.0) - 2023-08-22

### Changed

- Updated dependencies and released version 1.2.0. ([4905b15](https://github.com/kiwano-js/kiwano/commit/4905b154440883aa3303c3cede9a4758b26804ca)) ([eb0f7a2](https://github.com/kiwano-js/kiwano/commit/eb0f7a24139ad8fcca241f4128083e4fdd7e0d69))

## [1.1.0](https://github.com/kiwano-js/kiwano/compare/v1.0.2...v1.1.0) - 2023-06-27

### Changed

- Updated dependencies and released version 1.1.0. ([04b651b](https://github.com/kiwano-js/kiwano/commit/04b651b5bd2f2e264618b3cdd7c0e63a5e4560fd)) ([5ec5d36](https://github.com/kiwano-js/kiwano/commit/5ec5d369df3ce805bf9cd659861f090c35521032))

## [1.0.2](https://github.com/kiwano-js/kiwano/compare/v1.0.1...v1.0.2) - 2023-04-19

### Added

- Added `.nullLast()` to the TypeORM sort plugin. ([db58352](https://github.com/kiwano-js/kiwano/commit/db583525d802a409aafa9981b584c50e6fcbf661))

```ts
sortPlugin()
  .nullLast()
  .relation("owner", "name");
```

## [1.0.1](https://github.com/kiwano-js/kiwano/compare/v1.0.0...v1.0.1) - 2023-04-18

### Changed

- Refactored the build setup around webpack. ([c06e85c](https://github.com/kiwano-js/kiwano/commit/c06e85c3d431d4074ff2964bdc77423124476d10)) ([9b6f215](https://github.com/kiwano-js/kiwano/commit/9b6f215615c91475c6ca2757e9bff97efc969456))
- Moved documentation and expanded the README. ([ddc1ba8](https://github.com/kiwano-js/kiwano/commit/ddc1ba8119531f775b0aa11df05bb5989b74c68a)) ([cf9d44b](https://github.com/kiwano-js/kiwano/commit/cf9d44b9446156779b1fa9eb8edd3f8d9f6cf82b))

## [1.0.0](https://github.com/kiwano-js/kiwano/compare/v0.1.3...v1.0.0) - 2022-12-12

### Added

- Added `.customConfig()` to the core schema builder for passing
  `GraphQLSchemaConfig` options into the generated schema. ([10fd276](https://github.com/kiwano-js/kiwano/commit/10fd27669e9af1a4e4d9123f87f68e743350553a))

```ts
schema()
  .customConfig({ description: "Projects API" })
  .query("projects", "[Project]");
```

- Added configurable TypeORM type mapping defaults through `typeMapper(info,
  types)` and `ModelSchemaBuilder.typeMapper`. ([5393514](https://github.com/kiwano-js/kiwano/commit/53935140fa9116d506f0297aa88033e698b026b2))

```ts
// BEFORE
modelSchema(Project, {
  dataSource,
  typeMapper(info) {
    return { type: "String", list: false };
  },
});

// AFTER
import {
  ModelSchemaBuilder,
  defaultTypeMapperTypes,
  typeMapper,
} from "@kiwano/typeorm";

ModelSchemaBuilder.typeMapper = info =>
  typeMapper(info, {
    ...defaultTypeMapperTypes,
    dateTime: "DateTime",
  });
```

- Added the TypeORM `sortIndexPlugin()`, including `.sortField()`,
  `.idField()`, `.groupBy()`, and automatic sort-index maintenance for create,
  update, and delete resolvers. ([f718859](https://github.com/kiwano-js/kiwano/commit/f718859a0dee09dfddf5c185fc9bb2e05498f39f))

```ts
modelSchema(Task, dataSource)
  .all(field => field.use(sortIndexPlugin().groupBy("projectId")))
  .create()
  .update()
  .delete();
```

- Exported `getLatestSortIndex()` and `moveSortIndex()` helper functions, and
  added restore-resolver support to `sortIndexPlugin()`. ([8964268](https://github.com/kiwano-js/kiwano/commit/8964268fcb4e928626f3536293639edd0099a232))

```ts
// BEFORE
await moveSortIndex({
  repository,
  sortField: "sortIndex",
  idField: "id",
  latestSortIndex,
  id,
  oldIndex,
  newIndex,
});
```
- Added support for defining create/update input object types without also
  defining the create/update mutation field. 8e0a5b

### Fixed

- Improved TypeORM model object error reporting. ([633164c](https://github.com/kiwano-js/kiwano/commit/633164c7ef18654407204fc4c205789e6c1016ed))
- Fixed and refined package workspace setup across Lerna, npm workspaces, and
  Turborepo migrations. ([45485f9](https://github.com/kiwano-js/kiwano/commit/45485f993db0d3d5d14cd3b306771c8ef2922ec4)) ([cac6d14](https://github.com/kiwano-js/kiwano/commit/cac6d149a700ddf97347442e2e200f5068d9ddc9)) ([ab6ae42](https://github.com/kiwano-js/kiwano/commit/ab6ae42d1ef8c32628bfca2bb776e2f4984cef32)) ([990f992](https://github.com/kiwano-js/kiwano/commit/990f992cd668ac75c2174e51c8a99771ea1f1b7e)) ([0ccafe7](https://github.com/kiwano-js/kiwano/commit/0ccafe7cef823390cd1a9be54a7002bfbbfd4baa)) ([ecc7e68](https://github.com/kiwano-js/kiwano/commit/ecc7e689a329231e811fdc8dacb5b8c60a9c50e7))
  ([bbb54e6](https://github.com/kiwano-js/kiwano/commit/bbb54e6be297eeabb2e15bd95526b8dafb5ba13c)) ([6077a72](https://github.com/kiwano-js/kiwano/commit/6077a72dda44c56714f77f15274628a61dcc4a54)) ([fe36f1f](https://github.com/kiwano-js/kiwano/commit/fe36f1f8d9c859359ec8090a3ec4dccd7c8a8ee3)) ([e6f3337](https://github.com/kiwano-js/kiwano/commit/e6f333784a7e4adff3b76215c5c1ca698843ab35)) ([3ce0457](https://github.com/kiwano-js/kiwano/commit/3ce04579909242c8b60e3d0beff8bb4e59aaf89b)) ([37084bf](https://github.com/kiwano-js/kiwano/commit/37084bfdf1a7cfe75a70fa2ef8db684ad9de3844)) ([a9e5706](https://github.com/kiwano-js/kiwano/commit/a9e5706c5aa4ae72a26ecb803e200f5042aba580))
- Fixed Turborepo configuration and package scripts. ([3ce0457](https://github.com/kiwano-js/kiwano/commit/3ce04579909242c8b60e3d0beff8bb4e59aaf89b)) ([a9e5706](https://github.com/kiwano-js/kiwano/commit/a9e5706c5aa4ae72a26ecb803e200f5042aba580))

### Changed

- Updated GraphQL support to include GraphQL 16. ([6818547](https://github.com/kiwano-js/kiwano/commit/6818547b5538120d2de39eac45fcb9ebfc780e81))
- Updated resolver hooks so `$afterCreateResolver`, `$afterUpdateResolver`,
  `$afterDeleteResolver`, and `$afterRestoreResolver` receive the resolver
  result/model before the resolver info. ([c916192](https://github.com/kiwano-js/kiwano/commit/c9161928df243a03ad5b7682f5f99084deeac53f))

```ts
// BEFORE
class ProjectMutationResolvers {
  $afterUpdateResolver(info) {}
}

// AFTER
class ProjectMutationResolvers {
  $afterUpdateResolver(result, info) {}
}
```

- Updated TypeORM update hooks so `$afterUpdateModel()` receives both the
  updated model and the original model. ([a44827a](https://github.com/kiwano-js/kiwano/commit/a44827aacfc0733d9a493c1bfece6c7ea2a40865))

```ts
// BEFORE
class ProjectMutationResolvers {
  $afterUpdateModel(model, entityManager, info) {}
}

// AFTER
class ProjectMutationResolvers {
  $afterUpdateModel(model, originalModel, entityManager, info) {}
}
```

- Updated TypeORM create hooks so `$afterInsertModel()` receives the inserted
  model instead of only the inserted id. ([175eed7](https://github.com/kiwano-js/kiwano/commit/175eed7533848bc79eb8e6c2570c540691568db3))

```ts
// BEFORE
class ProjectMutationResolvers {
  $afterInsertModel(id, entityManager, info) {}
}

// AFTER
class ProjectMutationResolvers {
  $afterInsertModel(model, entityManager, info) {}
}
```

- Updated `$afterSave()` so it receives the saved model instead of raw changed
  data. ([af7adba](https://github.com/kiwano-js/kiwano/commit/af7adba4f371324c385c12c158f719cdc34a28ac))

```ts
// BEFORE
class ProjectMutationResolvers {
  $afterSave(data, entityManager, info) {}
}

// AFTER
class ProjectMutationResolvers {
  $afterSave(model, entityManager, info) {}
}
```

- Removed the postinstall hook. ([27772ab](https://github.com/kiwano-js/kiwano/commit/27772abfe3445be62488033406d80bfa0e955bba))

## [0.1.3](https://github.com/kiwano-js/kiwano/compare/v0.1.2...v0.1.3) - 2022-06-06

### Fixed

- Fixed TypeORM update resolver behavior. ([5b8fbbb](https://github.com/kiwano-js/kiwano/commit/5b8fbbb0ecceae8ec07b37acbe7ce54a3c3e8e55)) ([f22d13f](https://github.com/kiwano-js/kiwano/commit/f22d13f70c564d697d9c6b097a6d850e6f47ded6))

## [0.1.2](https://github.com/kiwano-js/kiwano/compare/v0.1.1...v0.1.2) - 2022-05-11

### Fixed

- Fixed resolver binding behavior so bundled resolver methods execute with the
  resolver object/class instance as `this`. ([57a36a1](https://github.com/kiwano-js/kiwano/commit/57a36a13ac08006ad62cac6933b34ffd4175c7a3))

## [0.1.1](https://github.com/kiwano-js/kiwano/compare/v0.1.0...v0.1.1) - 2022-05-11

### Fixed

- Fixed create and update input object generation. ([e96d1af](https://github.com/kiwano-js/kiwano/commit/e96d1af85ec874c0d89c49f122b8109760ecde3d)) ([6a826c3](https://github.com/kiwano-js/kiwano/commit/6a826c35696ab9e831f5c8870f70d94c8394a246))

## [0.1.0](https://github.com/kiwano-js/kiwano/compare/v0.0.9...v0.1.0) - 2022-04-19

### Added

- Added TypeORM 0.3 support by replacing `Connection`/implicit
  `getConnection()` usage with explicit `DataSource` options. ([14d67f4](https://github.com/kiwano-js/kiwano/commit/14d67f4f1f138620226e8bf39ae2ec41a3c15bbb))

```ts
// BEFORE
modelSchema(Project, "Project");

createResolver({
  connection,
  model: Project,
  inputArgument: "input",
  fieldInfo,
});

// AFTER
modelSchema(Project, dataSource);

createResolver({
  dataSource,
  model: Project,
  inputArgument: "input",
  fieldInfo,
});
```

## [0.0.9](https://github.com/kiwano-js/kiwano/compare/v0.0.8...v0.0.9) - 2022-02-16

### Fixed

- Fixed TypeORM query runner release behavior when model object types inspect
  database metadata. ([c26097b](https://github.com/kiwano-js/kiwano/commit/c26097baf73143860e43dd509839b823055c8ccc))

### Changed

- Switched TypeORM `TIME` mapping from `TimeResolver` to `LocalTimeResolver`.
  ([5e38d9b](https://github.com/kiwano-js/kiwano/commit/5e38d9be9e931542de4fa4cb29bd9b5fcf7703c8))

## [0.0.8](https://github.com/kiwano-js/kiwano/compare/v0.0.7...v0.0.8) - 2022-01-28

### Changed

- Released version 0.0.8 with package/version metadata updates only. ([a3bf99b](https://github.com/kiwano-js/kiwano/commit/a3bf99b6244fa0ec1a2cb05a667801cc9f85b660))

## [0.0.7](https://github.com/kiwano-js/kiwano/compare/v0.0.6...v0.0.7) - 2022-01-28

### Fixed

- Fixed create and update input object behavior. ([d15c451](https://github.com/kiwano-js/kiwano/commit/d15c451b40240e98ef24f3e1ee927636969991f8)) ([1b022c3](https://github.com/kiwano-js/kiwano/commit/1b022c3252fce41995a965387c6eb129feefb237))

### Changed

- Added and refined documentation for types. ([b57b71c](https://github.com/kiwano-js/kiwano/commit/b57b71cd9239f65c80a8f324cf5e234f225d6a55))

## [0.0.6](https://github.com/kiwano-js/kiwano/compare/v0.0.5...v0.0.6) - 2022-01-28

### Fixed

- Fixed TypeORM relation resolver behavior for lazy-loaded promise relations so
  custom relation resolvers are still executed. ([66c77c7](https://github.com/kiwano-js/kiwano/commit/66c77c7d1b3a2ce2b9ecda0e02dad71fc57ae298)) ([3a2ada1](https://github.com/kiwano-js/kiwano/commit/3a2ada1dfbf32d2d6ce5f08534cdcc7cd91f6464))

## [0.0.5](https://github.com/kiwano-js/kiwano/compare/v0.0.2...v0.0.5) - 2022-01-28

### Fixed

- Fixed TypeORM package metadata. ([da4259e](https://github.com/kiwano-js/kiwano/commit/da4259eb85cda224fd1f0767416c0a9f124c982a)) ([fc7858c](https://github.com/kiwano-js/kiwano/commit/fc7858cfe05c22fd815d7091aa4a11181109b154))
- Fixed TypeORM update resolver behavior by reloading models before
  after-hooks. ([7e88e0a](https://github.com/kiwano-js/kiwano/commit/7e88e0ae6cdf18626a5a82940c11cc5b9488797c))

### Changed

- Replaced `@graphql-tools/merge` with `@graphql-tools/schema`. ([cb359a5](https://github.com/kiwano-js/kiwano/commit/cb359a52757122d792b2969cc83a2375c37bfaa7))
- Updated versions and dependencies. ([dad7377](https://github.com/kiwano-js/kiwano/commit/dad7377ca56b98e03e9f7be2d4afe118b0a1e526))
- Expanded Concepts, Schema, and Types documentation. ([afe3539](https://github.com/kiwano-js/kiwano/commit/afe3539ef450750cc0eb17d2535bae9225fa97fb)) ([de60927](https://github.com/kiwano-js/kiwano/commit/de6092756a4e4089c165c0ab8d747f14acd28af8)) ([0641b16](https://github.com/kiwano-js/kiwano/commit/0641b166201342f23c3d33fedef0757dd6dbccb7))

## [0.0.2](https://github.com/kiwano-js/kiwano/compare/3e7d86972845b4a84e0ba053a8eaca26d7223b53...v0.0.2) - 2021-08-19

### Added

- Added the initial core schema builder for programmatic GraphQL schema
  creation. ([3e7d869](https://github.com/kiwano-js/kiwano/commit/3e7d86972845b4a84e0ba053a8eaca26d7223b53)) ([6e454b6](https://github.com/kiwano-js/kiwano/commit/6e454b6abf7454b6370f656fdccb91f30b68cc38)) ([c9f1c54](https://github.com/kiwano-js/kiwano/commit/c9f1c54fcd1967a348823c4e4f47fcc18c301d58))
- Added bracket-string type parsing and `.nonNullList()` for fields, arguments,
  and input fields. ([c9f1c54](https://github.com/kiwano-js/kiwano/commit/c9f1c54fcd1967a348823c4e4f47fcc18c301d58))

```ts
// BEFORE
schema()
  .query("projects", "Project", field => field
    .list()
    .nonNullList());

// AFTER
schema()
  .query("projects", "[Project!]");
```

- Added the main package and TypeORM integration. ([7f53e6b](https://github.com/kiwano-js/kiwano/commit/7f53e6b2ea49723eb85fa1419d11e02b24f34532)) ([11c00a0](https://github.com/kiwano-js/kiwano/commit/11c00a003d50283b21b6c265007c37a38dd8956e))
- Added object, input object, enum, union, field, argument, resolver, plugin,
  ACL, pagination, sorting, and search-filter foundations. ([7f53e6b](https://github.com/kiwano-js/kiwano/commit/7f53e6b2ea49723eb85fa1419d11e02b24f34532)) ([c9f1c54](https://github.com/kiwano-js/kiwano/commit/c9f1c54fcd1967a348823c4e4f47fcc18c301d58))
  ([40ebdbf](https://github.com/kiwano-js/kiwano/commit/40ebdbf640c91347615f09d178c89d3c68d70c97))
- Added documentation setup and getting-started/concepts documentation. ([5b29097](https://github.com/kiwano-js/kiwano/commit/5b290972744261fe0d62a7c7a8fce29ce1f18e93))
  ([37137d6](https://github.com/kiwano-js/kiwano/commit/37137d6011ed8e5d642df7109418d8a2d186ce65)) ([346489e](https://github.com/kiwano-js/kiwano/commit/346489e8aa869da0bae13bd4fb0460e72645a03f)) ([18117f6](https://github.com/kiwano-js/kiwano/commit/18117f6e68707c5bf718ec8c92ab8e1aa49178fd)) ([697eb48](https://github.com/kiwano-js/kiwano/commit/697eb48c5dd245d4a6a6acfbe1b4c97bc0072469)) ([6e5c429](https://github.com/kiwano-js/kiwano/commit/6e5c429a5729b44fe64438e52a4371d403069249)) ([29e059c](https://github.com/kiwano-js/kiwano/commit/29e059c1b28f70c20607084bb5f554374657bc44)) ([815aae9](https://github.com/kiwano-js/kiwano/commit/815aae9abe92715bf2511ea6a84dbfb89bdf930c))

### Fixed

- Improved field error reporting. ([02a7a2a](https://github.com/kiwano-js/kiwano/commit/02a7a2aa7467f64354bf436ea9dd0d943acae377))
- Added the TypeORM create resolver `$afterCreateResolver(info, result)` hook
  result parameter. ([cd878a1](https://github.com/kiwano-js/kiwano/commit/cd878a1092176742570d1533b874b60adb37de05))

```ts
// BEFORE
class ProjectMutationResolvers {
  $afterCreateResolver(info) {}
}

// AFTER
class ProjectMutationResolvers {
  $afterCreateResolver(info, result) {}
}
```

- Changed ACL middleware's default role path from `session.role` to `role`.
  ([b3d04ef](https://github.com/kiwano-js/kiwano/commit/b3d04efefef0f8d5cc4654f07a49101599403bd3))

- Fixed ACL rule handling and schema role behavior. ([0e4349c](https://github.com/kiwano-js/kiwano/commit/0e4349c1575534235df07454534ab39eff940c9f)) ([83a4e39](https://github.com/kiwano-js/kiwano/commit/83a4e395735604d60f7aea708a738d3f82bd9974)) ([d8748e1](https://github.com/kiwano-js/kiwano/commit/d8748e14ef3b881de9dd97c040209f0ab9d7c375))
  ([e4860d0](https://github.com/kiwano-js/kiwano/commit/e4860d05258add3d01ef3360b3feb4c23c30923c))
- Fixed TypeORM create/update resolver hooks. ([cd878a1](https://github.com/kiwano-js/kiwano/commit/cd878a1092176742570d1533b874b60adb37de05)) ([5d0f981](https://github.com/kiwano-js/kiwano/commit/5d0f981a3973651ae62e1740ceca30b599e88ecd))
- Fixed package metadata for the initial release. ([e353518](https://github.com/kiwano-js/kiwano/commit/e35351892f1154f8b61846ef42f6485c37d1ab58)) ([8c06d62](https://github.com/kiwano-js/kiwano/commit/8c06d628d7cfaddff14bbd8fc08fefb1d9be0118)) ([7a40a67](https://github.com/kiwano-js/kiwano/commit/7a40a67a6de77f106a4e8b9a7c627745942f8303))

### Changed

- Moved GraphQL to peer dependencies. ([654b73a](https://github.com/kiwano-js/kiwano/commit/654b73a5acad37b189d8b8308ab70ab2e62df1ce))
- Updated plugin build hooks so plugin implementations receive builder `info`
  objects during build. ([40ebdbf](https://github.com/kiwano-js/kiwano/commit/40ebdbf640c91347615f09d178c89d3c68d70c97))

```ts
// BEFORE
const plugin = {
  afterBuildField(builder, context, field) {},
};

// AFTER
const plugin = {
  afterBuildField(builder, context, info, field) {},
};
```

- Refactored lodash imports. ([0c38cbe](https://github.com/kiwano-js/kiwano/commit/0c38cbe0f880addd6c99b38fb2767f578789e344))
- Updated dependencies. ([12e069e](https://github.com/kiwano-js/kiwano/commit/12e069e2615524f798a61668181145817b004e8e))
