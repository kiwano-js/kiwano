# Quick Start

This guide will help you get started with Kiwano by creating a simple GraphQL API. We'll build a basic schema with a few types, queries, and mutations.

## Prerequisites

Before you begin, make sure you have:

- Node.js (>=22.14.0) installed
- A package manager (npm, pnpm, or yarn)
- Installed Kiwano (see [Installation](installation.md))

## Creating Your First Schema

Let's create a simple schema with a `User` type and a query to fetch users:

```typescript
import { schema } from '@kiwano/core'; // or from 'kiwano'

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
```

## Adding a Mutation

Let's add a mutation to create a new user:

```typescript
// Extend our schema with a mutation
userSchema
  .inputObject('CreateUserInput', _ => _
    .field('name', 'String!')
    .field('email', 'String!')
  )
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
    .resolver((_, { input }) => {
      // In a real application, you would save to a database
      const newUser = {
        id: String(Math.floor(Math.random() * 1000)),
        ...input
      };
      return newUser;
    })
  );
```

## Building the Schema

To use your schema with a GraphQL server, you need to build it:

```typescript
// Build the schema
const graphQLSchema = await userSchema.build();
```

## Setting Up a GraphQL Server

Now let's set up a GraphQL server using Apollo Server:

```typescript
import { ApolloServer } from 'apollo-server';

// Create an Apollo Server instance
const server = new ApolloServer({
  schema: graphQLSchema
});

// Start the server
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

## Complete Example

Here's the complete example:

```typescript
import { schema } from '@kiwano/core';
import { ApolloServer } from 'apollo-server';

// Create a schema
const userSchema = schema()
  // Define User type
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  
  // Define query to fetch users
  .query('users', '[User]', _ => _
    .resolver(() => [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' }
    ])
  )
  
  // Define input type for creating users
  .inputObject('CreateUserInput', _ => _
    .field('name', 'String!')
    .field('email', 'String!')
  )
  
  // Define mutation to create a user
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
    .resolver((_, { input }) => {
      const newUser = {
        id: String(Math.floor(Math.random() * 1000)),
        ...input
      };
      return newUser;
    })
  );

// Build the schema
const startServer = async () => {
  const graphQLSchema = await userSchema.build();
  
  // Create an Apollo Server instance
  const server = new ApolloServer({
    schema: graphQLSchema
  });
  
  // Start the server
  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
};

startServer();
```

## Testing Your API

Once your server is running, you can open the GraphQL Playground at the URL shown in the console (typically `http://localhost:4000`).

Try running the following query:

```graphql
query {
  users {
    id
    name
    email
  }
}
```

And the following mutation:

```graphql
mutation {
  createUser(input: { name: "Charlie", email: "charlie@example.com" }) {
    id
    name
    email
  }
}
```

## Next Steps

Now that you've created your first GraphQL API with Kiwano, you can explore more advanced features:

- [Core Concepts](../core-concepts/overview.md): Learn the fundamental concepts of Kiwano
- [Entity Schemas](../entity-schemas/introduction.md): Discover how to use entity schemas for CRUD operations
- [Plugins](../plugins/overview.md): Extend your schemas with powerful plugins
- [TypeORM Integration](../typeorm/getting-started.md): Connect your schemas to databases with TypeORM
