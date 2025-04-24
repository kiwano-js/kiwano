# Introduction to Entity Schemas

Entity schemas are a powerful feature of Kiwano that simplify the creation of GraphQL schemas for entities. They provide a higher-level abstraction that automatically generates common CRUD operations and related types.

## What is an Entity Schema?

An entity schema is a specialized schema builder that focuses on a single entity (like a User, Product, or Post). It extends the regular schema builder with additional methods for defining entity-specific operations.

Entity schemas automatically generate:
- The entity object type
- Query fields for fetching entities (all, find)
- Mutation fields for modifying entities (create, update, delete, restore)
- Input object types for create and update operations
- Appropriate arguments for each operation

## Why Use Entity Schemas?

Entity schemas offer several benefits:

- **Reduced Boilerplate**: Automatically generate common CRUD operations
- **Consistency**: Ensure consistent naming and structure across your API
- **Flexibility**: Customize every aspect of the generated schema
- **Extensibility**: Add custom fields and operations as needed
- **Integration**: Seamlessly integrate with TypeORM through model schemas

## Basic Example

Here's a simple example of an entity schema for a User entity:

```typescript
import { entitySchema } from '@kiwano/core';

const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

This concise code generates:

- A `User` object type with the specified fields
- A `users` query that returns all users
- A `user` query that finds a user by ID
- A `createUser` mutation that creates a new user
- A `updateUser` mutation that updates an existing user
- A `deleteUser` mutation that deletes a user
- A `CreateUserInput` input object type for the create mutation
- A `UpdateUserInput` input object type for the update mutation

## Generated Schema

The entity schema above generates a GraphQL schema equivalent to:

```graphql
type User {
  id: ID!
  name: String
  email: String
  age: Int
}

input CreateUserInput {
  name: String
  email: String
  age: Int
}

input UpdateUserInput {
  name: String
  email: String
  age: Int
}

type Query {
  users: [User]
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean
}
```

## Entity Schema vs. Regular Schema

Let's compare the entity schema approach with a regular schema approach:

### Entity Schema Approach

```typescript
import { entitySchema } from '@kiwano/core';

const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

### Regular Schema Approach

```typescript
import { schema } from '@kiwano/core';

const userSchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .inputObject('CreateUserInput', _ => _
    .field('name', 'String')
    .field('email', 'String')
  )
  .inputObject('UpdateUserInput', _ => _
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]')
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  )
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
  )
  .mutation('updateUser', 'User', _ => _
    .arg('id', 'ID!')
    .arg('input', 'UpdateUserInput!')
  )
  .mutation('deleteUser', 'Boolean', _ => _
    .arg('id', 'ID!')
  );
```

As you can see, the entity schema approach is much more concise and reduces boilerplate code significantly.

## Next Steps

Now that you understand the basics of entity schemas, you can explore:

- [Creating Entity Schemas](creating-entity-schemas.md): Learn how to create and configure entity schemas
- [Entity Fields](entity-fields.md): Explore the different fields available in entity schemas
- [Naming Strategies](naming-strategies.md): Customize the naming of generated types and fields
- [Entity Resolvers](entity-resolvers.md): Implement resolvers for entity operations
