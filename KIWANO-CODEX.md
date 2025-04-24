# KIWANO CODEX
## Repository Structure

```text
kiwano/
├── packages/
│   ├── core/          # Primary package
│   ├── main/          # Re-export wrapper
│   └── typeorm/       # TypeORM integration
├── docs/              # Documentation
└── [configuration]
```

## Package Information

### Core Package (@kiwano/core)
Location: `packages/core/`
Purpose: Primary schema building functionality
Key Files:
- `src/ts/index.ts`: Main entry point
- `package.json`: Dependencies and configuration

Dependencies:
- graphql: ^14.0.0 || ^15.0.0 || ^16.0.0
- @graphql-tools/schema: ^10.0.3
- graphql-middleware: ^6.1.35
- pluralize: ^8.0.0
- es-toolkit: ^1.33.0

### Main Package (kiwano)
Location: `packages/main/`
Purpose: Simplified entry point
Key Files:
- `src/ts/index.ts`: Re-export definitions
- `package.json`: Package configuration

### TypeORM Integration (@kiwano/typeorm)
Location: `packages/typeorm/`
Purpose: TypeORM specific functionality

## Core Features

### 1. Schema Building
- Programmatic schema creation
- Type-safe builder pattern
- Modular schema composition
- Automatic type generation

### 2. Entity System
- Entity schema generation
- Automatic CRUD operations
- Relationship handling
- Custom field definitions

### 3. Plugin Architecture
Built-in Plugins:
- Access Control (ACL)
- Filtering
- Pagination
- Sorting

### 4. TypeORM Integration
- Automatic model schema generation
- Built-in resolvers
- Query optimization
- Relationship handling

## Technical Specifications

### Environment Requirements
- Node.js: >=22.14.0
- pnpm: >=10.6.2

### Build System
Tool: rslib
Commands:
- Build: `pnpm build`
- Watch: `pnpm watch`
- Test: `pnpm test`

### Code Quality
- Linting: Biome
- Formatting: dprint
- Testing: Vitest

## Configuration Files

### Root Level
- `package.json`: Monorepo configuration
- `biome.json`: Linting rules
- `dprint.jsonc`: Formatting configuration
- `turbo.json`: Monorepo pipeline configuration

### Package Level
Each package contains:
- `package.json`: Package-specific configuration
- `tsconfig.json`: TypeScript configuration
- `.gitignore`: Package-specific ignores

## API Structure

### Schema Building
```typescript
// Basic Schema Creation
schema()
  .object('Type')
  .field('field', 'Type')
  .build()

// Entity Schema
entitySchema('Entity')
  .entity(...)
  .build()
```

### Plugin Usage
```typescript
schema()
  .use(pluginName())
  .build()
```

### TypeORM Integration
```typescript
modelSchema(Model)
  .entity(...)
  .build()
```

## Build & Distribution

### Output Formats
- ESM (`.js`)
- CommonJS (`.cjs`)
- TypeScript declarations (`.d.ts`)

### Export Paths
```json
{
  "exports": {
    ".": {
      "source": "./src/ts/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

## Development Workflow

### Setup
1. Install Node.js >=22.14.0
2. Install pnpm >=10.6.2
3. Clone repository
4. Run `pnpm install`

### Commands
- `pnpm build`: Build all packages
- `pnpm watch`: Watch mode
- `pnpm lint`: Run linting
- `pnpm format`: Format code
- `pnpm test`: Run tests

## Testing

### Framework: Vitest
Location: Individual package tests
Command: `pnpm test`

## Known Limitations

1. GraphQL Version Compatibility
   - Supports GraphQL ^14.0.0 || ^15.0.0 || ^16.0.0

2. Node.js Version Requirement
   - Strict requirement: >=22.14.0

## Best Practices

1. Schema Organization
   - Use modular schemas
   - Implement entity schemas where appropriate
   - Utilize plugins for common functionality

2. TypeORM Integration
   - Use model schemas for entity types
   - Implement custom resolvers when needed
   - Configure appropriate plugins

3. Plugin Usage
   - Apply plugins at appropriate levels
   - Configure plugin options explicitly
   - Document plugin usage

## Migration Guide

### From v2.x to v3.0.0
- Node.js version requirement increased
- Updated peer dependencies
- New plugin architecture
- Enhanced TypeORM integration

## Additional Resources

### Repository
- GitHub: https://github.com/kiwano-js/kiwano
- Issues: https://github.com/kiwano-js/kiwano/issues

### Package Links
- npm: @kiwano/core
- npm: kiwano
- npm: @kiwano/typeorm

---
End of Codex
