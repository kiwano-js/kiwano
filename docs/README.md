# Kiwano

## What is Kiwano?

Kiwano is a powerful GraphQL schema builder for Node.js that enables you to create GraphQL schemas programmatically. It provides a type-safe, builder pattern approach to schema definition, allowing you to write dynamic and modular schemas while preventing repetitive declarations.

Unlike the GraphQL Schema Definition Language (SDL), Kiwano gives you the full power of TypeScript/JavaScript to create, extend, and compose your schemas. This makes it an excellent choice for complex APIs where you need more flexibility than static SDL definitions can provide.

## Key Features

- **Programmatic Schema Building**: Create GraphQL schemas using a fluent builder pattern
- **Type Safety**: Full TypeScript support with automatic type generation
- **Modular Architecture**: Split schemas into reusable components
- **Entity System**: Automatic CRUD operations for your data models
- **Plugin System**: Extend functionality with built-in or custom plugins
- **TypeORM Integration**: Seamless integration with TypeORM for database access
- **Flexible Resolvers**: Multiple approaches to defining and organizing resolvers

## Get Started

### Installation

Kiwano consists of a core package and additional optional sub-packages:

```bash
# Using npm
npm install @kiwano/core
# OR the convenience package that re-exports core
npm install kiwano

# Using pnpm (recommended)
pnpm add @kiwano/core
# OR
pnpm add kiwano

# Using yarn
yarn add @kiwano/core
# OR
yarn add kiwano
```

**For TypeORM integration:**

```bash
# Using npm
npm install @kiwano/typeorm

# Using pnpm
pnpm add @kiwano/typeorm

# Using yarn
yarn add @kiwano/typeorm
```

> **Note**: Make sure to install the `typeorm` package in your project as well.

### System Requirements

- **Node.js**: >=22.14.0
- **pnpm** (recommended): >=10.6.2
- **GraphQL**: ^14.0.0 || ^15.0.0 || ^16.0.0

### Quick Start

Here's a simple example to get you started with Kiwano:

```typescript
import { schema } from '@kiwano/core';

// Create a schema with a User type and a query
const userSchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]', _ => _
    .resolver(() => [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' }
    ])
  );

// Build the schema
const graphQLSchema = await userSchema.build();

// Use with your favorite GraphQL server
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: graphQLSchema
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

## Next Steps

- [Core Concepts](core-concepts/overview.md): Learn the fundamental concepts of Kiwano
- [Entity Schemas](entity-schemas/introduction.md): Discover how to use entity schemas for CRUD operations
- [Plugins](plugins/overview.md): Extend your schemas with powerful plugins
- [TypeORM Integration](typeorm/getting-started.md): Connect your schemas to databases with TypeORM
