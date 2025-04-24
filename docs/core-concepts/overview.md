# Core Concepts Overview

Kiwano provides a programmatic approach to building GraphQL schemas. This section covers the fundamental concepts you need to understand to effectively use Kiwano.

## The Builder Pattern

Kiwano uses the builder pattern extensively, allowing you to create and configure GraphQL schemas in a fluent, chainable manner. This approach provides several benefits:

- **Type Safety**: The builder pattern works well with TypeScript, providing type checking and autocompletion.
- **Discoverability**: Method chaining makes it easy to discover available options.
- **Readability**: The code reads like a series of declarative statements.
- **Flexibility**: You can build schemas dynamically based on runtime conditions.

## Key Components

Kiwano's architecture consists of several key components:

### Schema Builder

The schema builder is the entry point for creating GraphQL schemas. It allows you to define types, queries, mutations, and more.

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema()
  .object('User', ...)
  .query('users', ...)
  .mutation('createUser', ...);
```

### Type Builders

Kiwano provides builders for all GraphQL types:

- **Object Types**: Define the structure of your data objects
- **Input Object Types**: Define input structures for arguments
- **Enum Types**: Define enumeration types
- **Union Types**: Define types that can be one of several object types
- **Scalar Types**: Use built-in or custom scalar types

### Field Builders

Fields are the properties of object types and the operations in your schema. Kiwano provides builders for:

- **Object Fields**: Define properties of object types
- **Input Fields**: Define properties of input object types
- **Query Fields**: Define query operations
- **Mutation Fields**: Define mutation operations

### Entity Schema Builder

The entity schema builder extends the schema builder with features specifically designed for entity-based operations (CRUD):

```typescript
import { entitySchema } from '@kiwano/core';

const userEntitySchema = entitySchema('User')
  .entity(...)
  .all()
  .find()
  .create()
  .update()
  .delete();
```

### Plugin System

Kiwano's plugin system allows you to extend the functionality of your schema:

```typescript
import { schema, equalsFilterPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', ...)
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin())
  );
```

### TypeORM Integration

Kiwano provides seamless integration with TypeORM through the `@kiwano/typeorm` package:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { User } from './entities/User';

const userModelSchema = modelSchema(User, dataSource)
  .all()
  .find()
  .create()
  .update()
  .delete();
```

## Schema Building Process

The process of building a schema in Kiwano involves:

1. **Creating a Schema Builder**: Start with `schema()` or `entitySchema()`
2. **Defining Types**: Add object types, input types, etc.
3. **Defining Operations**: Add queries and mutations
4. **Adding Resolvers**: Implement the logic for resolving fields
5. **Building the Schema**: Call `build()` to generate a GraphQL schema
6. **Using with a GraphQL Server**: Pass the built schema to your GraphQL server

## Next Steps

Now that you understand the core concepts of Kiwano, you can dive deeper into specific topics:

- [Schema Building](schema-building.md): Learn how to create and configure schemas
- [Types and Fields](types-and-fields.md): Explore the different types and fields available
- [Queries and Mutations](queries-and-mutations.md): Define operations for your API
- [Resolvers](resolvers.md): Implement the logic for resolving fields
- [Modularization](modularization.md): Split your schema into reusable components
