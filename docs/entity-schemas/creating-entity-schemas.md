# Creating Entity Schemas

Entity schemas provide a streamlined way to create GraphQL schemas for entities. This guide will show you how to create and configure entity schemas.

## Basic Entity Schema

To create an entity schema, use the `entitySchema` function:

```typescript
import { entitySchema } from '@kiwano/core';

const userSchema = entitySchema('User');
```

The `entitySchema` function takes the name of the entity as its argument. This name is used as the base for generating type names and field names.

## Defining the Entity Type

The next step is to define the entity object type using the `entity` method:

```typescript
userSchema.entity(_ => _
  .field('id', 'ID!')
  .field('name', 'String')
  .field('email', 'String')
  .field('age', 'Int')
  .field('isActive', 'Boolean')
);
```

The `entity` method configures the object type for the entity. It works the same way as the `object` method in the regular schema builder.

## Adding CRUD Operations

Entity schemas provide methods for adding common CRUD operations:

```typescript
userSchema
  .all()    // Adds a query to fetch all users
  .find()   // Adds a query to find a user by ID
  .create() // Adds a mutation to create a user
  .update() // Adds a mutation to update a user
  .delete() // Adds a mutation to delete a user
  .restore(); // Adds a mutation to restore a deleted user
```

Each of these methods adds the corresponding operation to the schema:

- `all()`: Adds a query that returns a list of entities (e.g., `users: [User]`)
- `find()`: Adds a query that returns a single entity by ID (e.g., `user(id: ID!): User`)
- `create()`: Adds a mutation that creates a new entity (e.g., `createUser(input: CreateUserInput!): User`)
- `update()`: Adds a mutation that updates an existing entity (e.g., `updateUser(id: ID!, input: UpdateUserInput!): User`)
- `delete()`: Adds a mutation that deletes an entity (e.g., `deleteUser(id: ID!): Boolean`)
- `restore()`: Adds a mutation that restores a deleted entity (e.g., `restoreUser(id: ID!): User`)

## Customizing Operations

You can customize each operation by providing a configurator function:

```typescript
userSchema
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
  );
```

## Customizing Field Names

By default, entity schemas generate field names based on the entity name (e.g., `users`, `user`, `createUser`). You can customize these names:

```typescript
userSchema
  .all('getAllUsers')
  .find('getUserById')
  .create('addUser')
  .update('modifyUser')
  .delete('removeUser');
```

## Input Types

Entity schemas automatically generate input object types for create and update operations. You can customize these types:

```typescript
userSchema
  .createInput(_ => _
    .field('name', 'String!')
    .field('email', 'String!')
    .field('age', 'Int')
    .field('isActive', 'Boolean')
  )
  .updateInput(_ => _
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
    .field('isActive', 'Boolean')
  );
```

## Adding Resolvers

You can add resolvers to your entity schema:

```typescript
// Query resolvers
class UserQueryResolvers {
  users() {
    // Fetch all users
    return [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' }
    ];
  }
  
  user(_, { id }) {
    // Find user by ID
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
}

// Mutation resolvers
class UserMutationResolvers {
  createUser(_, { input }) {
    // Create a new user
    const newUser = {
      id: String(Math.floor(Math.random() * 1000)),
      ...input
    };
    return newUser;
  }
  
  updateUser(_, { id, input }) {
    // Update user
    return { id, ...input };
  }
  
  deleteUser(_, { id }) {
    // Delete user
    return true;
  }
}

// Entity resolvers
class UserEntityResolvers {
  posts(user) {
    // Fetch posts for this user
    return [
      { id: '1', title: 'Post 1', authorId: user.id },
      { id: '2', title: 'Post 2', authorId: user.id }
    ];
  }
}

userSchema
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers)
  .entityResolvers(UserEntityResolvers);
```

## Access Control

You can add access control rules to your entity schema:

```typescript
userSchema
  .allow('ADMIN', 'USER')  // Allow these roles for all operations
  .deny('GUEST')           // Deny these roles for all operations
  .allowEntity('ADMIN')    // Allow these roles for the entity type
  .denyEntity('GUEST');    // Deny these roles for the entity type
```

## Complete Example

Here's a complete example of an entity schema:

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
  
  // Customize input types
  .createInput(_ => _
    .field('name', 'String!')
    .field('email', 'String!')
    .field('age', 'Int')
    .field('isActive', 'Boolean')
  )
  .updateInput(_ => _
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
    .field('isActive', 'Boolean')
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
  
  // Add resolvers
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers)
  .entityResolvers(UserEntityResolvers)
  
  // Add access control
  .allow('ADMIN', 'USER')
  .deny('GUEST');
```

## Using with Other Schemas

You can merge entity schemas with other schemas:

```typescript
import { schema, entitySchema } from '@kiwano/core';

const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]')
  )
  .all()
  .find();

const postSchema = entitySchema('Post')
  .entity(_ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('author', 'User')
  )
  .all()
  .find();

const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);
```

## Next Steps

Now that you know how to create entity schemas, you can explore:

- [Entity Fields](entity-fields.md): Learn about the different fields available in entity schemas
- [Naming Strategies](naming-strategies.md): Customize the naming of generated types and fields
- [Entity Resolvers](entity-resolvers.md): Implement resolvers for entity operations
- [TypeORM Integration](../typeorm/getting-started.md): Connect your entity schemas to a database with TypeORM
