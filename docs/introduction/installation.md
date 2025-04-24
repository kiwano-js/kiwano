# Installation

Kiwano is designed to be modular, allowing you to install only the packages you need for your project.

## Core Package

The core package provides the foundation for building GraphQL schemas programmatically.

```bash
# Using npm
npm install @kiwano/core

# Using pnpm (recommended)
pnpm add @kiwano/core

# Using yarn
yarn add @kiwano/core
```

Alternatively, you can install the convenience package that re-exports everything from the core package:

```bash
# Using npm
npm install kiwano

# Using pnpm (recommended)
pnpm add kiwano

# Using yarn
yarn add kiwano
```

## TypeORM Integration

If you're using TypeORM as your ORM, you can install the TypeORM integration package:

```bash
# Using npm
npm install @kiwano/typeorm

# Using pnpm (recommended)
pnpm add @kiwano/typeorm

# Using yarn
yarn add @kiwano/typeorm
```

> **Note**: Make sure to install the `typeorm` package in your project as well.

## Peer Dependencies

Kiwano has the following peer dependencies that you'll need to install:

### Core Package Dependencies

```bash
# Using npm
npm install graphql @graphql-tools/schema graphql-middleware pluralize es-toolkit

# Using pnpm (recommended)
pnpm add graphql @graphql-tools/schema graphql-middleware pluralize es-toolkit

# Using yarn
yarn add graphql @graphql-tools/schema graphql-middleware pluralize es-toolkit
```

### TypeORM Package Additional Dependencies

```bash
# Using npm
npm install graphql-scalars typeorm

# Using pnpm (recommended)
pnpm add graphql-scalars typeorm

# Using yarn
yarn add graphql-scalars typeorm
```

## System Requirements

- **Node.js**: >=22.14.0
- **pnpm** (recommended): >=10.6.2
- **GraphQL**: ^14.0.0 || ^15.0.0 || ^16.0.0

## Verifying Installation

After installation, you can verify that Kiwano is correctly installed by creating a simple schema:

```typescript
import { schema } from '@kiwano/core'; // or from 'kiwano'

const simpleSchema = schema()
  .object('Hello', _ => _
    .field('message', 'String')
  )
  .query('hello', 'Hello', _ => _
    .resolver(() => ({ message: 'Hello, Kiwano!' }))
  );

// This should not throw any errors
simpleSchema.build().then(() => {
  console.log('Kiwano is correctly installed!');
});
```

## Next Steps

Now that you have Kiwano installed, you can proceed to the [Quick Start](quick-start.md) guide to learn how to create your first GraphQL schema with Kiwano.
