# Entity Fields

Entity schemas in Kiwano provide a set of methods for adding common CRUD operations to your schema. These methods generate fields for queries and mutations that operate on your entity.

## Available Entity Fields

Entity schemas provide the following methods for adding fields:

- `all()`: Adds a query to fetch all entities
- `find()`: Adds a query to find an entity by ID
- `create()`: Adds a mutation to create an entity
- `update()`: Adds a mutation to update an entity
- `delete()`: Adds a mutation to delete an entity
- `restore()`: Adds a mutation to restore a deleted entity

## All Field

The `all` field is a query that returns a list of entities.

### Basic Usage

```typescript
import { entitySchema } from '@kiwano/core';

const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .all();
```

This generates a query like:

```graphql
type Query {
  users: [User]
}
```

### Customizing the All Field

You can customize the `all` field by providing a configurator function:

```typescript
userSchema.all(_ => _
  .description('Fetch all users')
  .arg('filter', 'UserFilter')
  .arg('sort', 'UserSort')
  .arg('pagination', 'Pagination')
);
```

This generates a query like:

```graphql
type Query {
  users(filter: UserFilter, sort: UserSort, pagination: Pagination): [User]
}
```

### Customizing the Field Name

You can customize the name of the `all` field:

```typescript
userSchema.all('getAllUsers');
```

This generates a query like:

```graphql
type Query {
  getAllUsers: [User]
}
```

## Find Field

The `find` field is a query that returns a single entity by ID.

### Basic Usage

```typescript
userSchema.find();
```

This generates a query like:

```graphql
type Query {
  user(id: ID!): User
}
```

### Customizing the Find Field

You can customize the `find` field by providing a configurator function:

```typescript
userSchema.find(_ => _
  .description('Find a user by ID')
);
```

### Customizing the Field Name

You can customize the name of the `find` field:

```typescript
userSchema.find('getUserById');
```

This generates a query like:

```graphql
type Query {
  getUserById(id: ID!): User
}
```

## Create Field

The `create` field is a mutation that creates a new entity.

### Basic Usage

```typescript
userSchema.create();
```

This generates a mutation like:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): User
}
```

### Customizing the Create Field

You can customize the `create` field by providing a configurator function:

```typescript
userSchema.create(_ => _
  .description('Create a new user')
);
```

### Customizing the Field Name

You can customize the name of the `create` field:

```typescript
userSchema.create('addUser');
```

This generates a mutation like:

```graphql
type Mutation {
  addUser(input: CreateUserInput!): User
}
```

## Update Field

The `update` field is a mutation that updates an existing entity.

### Basic Usage

```typescript
userSchema.update();
```

This generates a mutation like:

```graphql
type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User
}
```

### Customizing the Update Field

You can customize the `update` field by providing a configurator function:

```typescript
userSchema.update(_ => _
  .description('Update an existing user')
);
```

### Customizing the Field Name

You can customize the name of the `update` field:

```typescript
userSchema.update('modifyUser');
```

This generates a mutation like:

```graphql
type Mutation {
  modifyUser(id: ID!, input: UpdateUserInput!): User
}
```

## Delete Field

The `delete` field is a mutation that deletes an entity.

### Basic Usage

```typescript
userSchema.delete();
```

This generates a mutation like:

```graphql
type Mutation {
  deleteUser(id: ID!): Boolean
}
```

### Customizing the Delete Field

You can customize the `delete` field by providing a configurator function:

```typescript
userSchema.delete(_ => _
  .description('Delete a user')
);
```

### Customizing the Field Name

You can customize the name of the `delete` field:

```typescript
userSchema.delete('removeUser');
```

This generates a mutation like:

```graphql
type Mutation {
  removeUser(id: ID!): Boolean
}
```

## Restore Field

The `restore` field is a mutation that restores a deleted entity. This is useful for soft-delete functionality.

### Basic Usage

```typescript
userSchema.restore();
```

This generates a mutation like:

```graphql
type Mutation {
  restoreUser(id: ID!): User
}
```

### Customizing the Restore Field

You can customize the `restore` field by providing a configurator function:

```typescript
userSchema.restore(_ => _
  .description('Restore a deleted user')
);
```

### Customizing the Field Name

You can customize the name of the `restore` field:

```typescript
userSchema.restore('undeleteUser');
```

This generates a mutation like:

```graphql
type Mutation {
  undeleteUser(id: ID!): User
}
```

## Using Plugins with Entity Fields

You can use plugins with entity fields to add additional functionality:

```typescript
import { entitySchema, equalsFilterPlugin, sortPlugin, paginationPlugin } from '@kiwano/core';

const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
  )
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin())
    .use(paginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

This adds filtering, sorting, and pagination capabilities to the `all` field.

## Complete Example

Here's a complete example of an entity schema with all available fields:

```typescript
import { entitySchema } from '@kiwano/core';

const userSchema = entitySchema('User')
  // Define the entity type
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
    .field('isActive', 'Boolean')
    .field('posts', '[Post]')
  )
  
  // Add CRUD operations
  .all(_ => _
    .description('Fetch all users')
    .arg('filter', 'UserFilter')
  )
  .find(_ => _
    .description('Find a user by ID')
  )
  .create(_ => _
    .description('Create a new user')
  )
  .update(_ => _
    .description('Update an existing user')
  )
  .delete(_ => _
    .description('Delete a user')
  )
  .restore(_ => _
    .description('Restore a deleted user')
  );
```

## Next Steps

Now that you understand entity fields, you can explore:

- [Naming Strategies](naming-strategies.md): Customize the naming of generated types and fields
- [Entity Resolvers](entity-resolvers.md): Implement resolvers for entity operations
- [Plugins](../plugins/overview.md): Extend your schema with powerful plugins
- [TypeORM Integration](../typeorm/getting-started.md): Connect your entity schemas to a database with TypeORM
