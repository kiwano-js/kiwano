# Entity Resolvers

Entity schemas in Kiwano provide a structured way to organize resolvers for your entities. This guide explains how to implement resolvers for entity operations.

## Types of Entity Resolvers

Entity schemas support three types of resolvers:

1. **Query Resolvers**: Implement resolvers for query fields (all, find)
2. **Mutation Resolvers**: Implement resolvers for mutation fields (create, update, delete, restore)
3. **Entity Resolvers**: Implement resolvers for fields within the entity object type

## Query Resolvers

Query resolvers handle the `all` and `find` operations.

### Basic Query Resolvers

```typescript
import { entitySchema } from '@kiwano/core';

class UserQueryResolvers {
  // Resolver for the 'users' field (all)
  users(parent, args, context, info) {
    // Fetch all users
    return [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' }
    ];
  }
  
  // Resolver for the 'user' field (find)
  user(parent, { id }, context, info) {
    // Find user by ID
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
}

const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .all()
  .find()
  .queryResolvers(UserQueryResolvers);
```

### Custom Field Names

If you've customized the field names, your resolver methods should match the custom names:

```typescript
const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .all('getAllUsers')
  .find('getUserById');

class UserQueryResolvers {
  // Resolver for the 'getAllUsers' field
  getAllUsers(parent, args, context, info) {
    // ...
  }
  
  // Resolver for the 'getUserById' field
  getUserById(parent, { id }, context, info) {
    // ...
  }
}

userSchema.queryResolvers(UserQueryResolvers);
```

## Mutation Resolvers

Mutation resolvers handle the `create`, `update`, `delete`, and `restore` operations.

### Basic Mutation Resolvers

```typescript
class UserMutationResolvers {
  // Resolver for the 'createUser' field
  createUser(parent, { input }, context, info) {
    // Create a new user
    const newUser = {
      id: String(Math.floor(Math.random() * 1000)),
      ...input
    };
    return newUser;
  }
  
  // Resolver for the 'updateUser' field
  updateUser(parent, { id, input }, context, info) {
    // Update user
    return { id, ...input };
  }
  
  // Resolver for the 'deleteUser' field
  deleteUser(parent, { id }, context, info) {
    // Delete user
    return true;
  }
  
  // Resolver for the 'restoreUser' field
  restoreUser(parent, { id }, context, info) {
    // Restore user
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
}

userSchema
  .create()
  .update()
  .delete()
  .restore()
  .mutationResolvers(UserMutationResolvers);
```

### Custom Field Names

If you've customized the field names, your resolver methods should match the custom names:

```typescript
const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .create('addUser')
  .update('modifyUser')
  .delete('removeUser');

class UserMutationResolvers {
  // Resolver for the 'addUser' field
  addUser(parent, { input }, context, info) {
    // ...
  }
  
  // Resolver for the 'modifyUser' field
  modifyUser(parent, { id, input }, context, info) {
    // ...
  }
  
  // Resolver for the 'removeUser' field
  removeUser(parent, { id }, context, info) {
    // ...
  }
}

userSchema.mutationResolvers(UserMutationResolvers);
```

## Entity Resolvers

Entity resolvers handle fields within the entity object type. These are particularly useful for resolving relationships.

### Basic Entity Resolvers

```typescript
class UserEntityResolvers {
  // Resolver for the 'posts' field in the User type
  posts(user, args, context, info) {
    // Fetch posts for this user
    return [
      { id: '1', title: 'Post 1', authorId: user.id },
      { id: '2', title: 'Post 2', authorId: user.id }
    ];
  }
  
  // Resolver for the 'comments' field in the User type
  comments(user, args, context, info) {
    // Fetch comments for this user
    return [
      { id: '1', text: 'Comment 1', authorId: user.id },
      { id: '2', text: 'Comment 2', authorId: user.id }
    ];
  }
}

userSchema
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]')
    .field('comments', '[Comment]')
  )
  .entityResolvers(UserEntityResolvers);
```

## Using Resolver Classes

You can use classes for your resolvers, and Kiwano will automatically instantiate them:

```typescript
userSchema
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers)
  .entityResolvers(UserEntityResolvers);
```

Or you can instantiate them yourself:

```typescript
userSchema
  .queryResolvers(new UserQueryResolvers())
  .mutationResolvers(new UserMutationResolvers())
  .entityResolvers(new UserEntityResolvers());
```

## Using Resolver Objects

You can also use plain objects for your resolvers:

```typescript
userSchema
  .queryResolvers({
    users(parent, args, context, info) {
      // ...
    },
    user(parent, { id }, context, info) {
      // ...
    }
  })
  .mutationResolvers({
    createUser(parent, { input }, context, info) {
      // ...
    },
    updateUser(parent, { id, input }, context, info) {
      // ...
    },
    deleteUser(parent, { id }, context, info) {
      // ...
    }
  })
  .entityResolvers({
    posts(user, args, context, info) {
      // ...
    },
    comments(user, args, context, info) {
      // ...
    }
  });
```

## Resolver Context

The context object is a shared object that is passed to all resolvers. It's typically used to store per-request state, such as the current user, database connections, etc.

```typescript
// Create a GraphQL server with a context
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: await userSchema.build(),
  context: ({ req }) => {
    // Create a context for each request
    return {
      currentUser: getUserFromRequest(req),
      dataSources: {
        userAPI: new UserAPI(),
        postAPI: new PostAPI()
      }
    };
  }
});

// Use the context in resolvers
class UserQueryResolvers {
  async users(parent, args, context, info) {
    // Access data sources from the context
    return await context.dataSources.userAPI.getAllUsers();
  }
  
  async user(parent, { id }, context, info) {
    // Access data sources from the context
    return await context.dataSources.userAPI.getUserById(id);
  }
}
```

## Error Handling

Kiwano provides error classes for common GraphQL errors:

```typescript
import { NotFoundError, ForbiddenError, InvalidInputError } from '@kiwano/core';

class UserQueryResolvers {
  async user(parent, { id }, context, info) {
    // Check if the user exists
    const user = await context.dataSources.userAPI.getUserById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    
    // Check if the current user has permission to view this user
    if (!hasPermission(context.currentUser, 'view', user)) {
      throw new ForbiddenError('You do not have permission to view this user');
    }
    
    return user;
  }
}

class UserMutationResolvers {
  async createUser(parent, { input }, context, info) {
    // Validate input
    if (!isValidEmail(input.email)) {
      throw new InvalidInputError('Invalid email address');
    }
    
    // Create user
    const newUser = await context.dataSources.userAPI.createUser(input);
    return newUser;
  }
}
```

## Complete Example

Here's a complete example of entity resolvers:

```typescript
import { entitySchema, NotFoundError, ForbiddenError, InvalidInputError } from '@kiwano/core';

// Query resolvers
class UserQueryResolvers {
  async users(parent, args, context, info) {
    return await context.dataSources.userAPI.getAllUsers();
  }
  
  async user(parent, { id }, context, info) {
    const user = await context.dataSources.userAPI.getUserById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    return user;
  }
}

// Mutation resolvers
class UserMutationResolvers {
  async createUser(parent, { input }, context, info) {
    if (!isValidEmail(input.email)) {
      throw new InvalidInputError('Invalid email address');
    }
    return await context.dataSources.userAPI.createUser(input);
  }
  
  async updateUser(parent, { id, input }, context, info) {
    const user = await context.dataSources.userAPI.getUserById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    return await context.dataSources.userAPI.updateUser(id, input);
  }
  
  async deleteUser(parent, { id }, context, info) {
    const user = await context.dataSources.userAPI.getUserById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    return await context.dataSources.userAPI.deleteUser(id);
  }
}

// Entity resolvers
class UserEntityResolvers {
  async posts(user, args, context, info) {
    return await context.dataSources.postAPI.getPostsByAuthor(user.id);
  }
  
  async comments(user, args, context, info) {
    return await context.dataSources.commentAPI.getCommentsByAuthor(user.id);
  }
}

// Create the entity schema
const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('posts', '[Post]')
    .field('comments', '[Comment]')
  )
  .all()
  .find()
  .create()
  .update()
  .delete()
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers)
  .entityResolvers(UserEntityResolvers);
```

## Next Steps

Now that you understand entity resolvers, you can explore:

- [Plugins](../plugins/overview.md): Extend your schema with powerful plugins
- [TypeORM Integration](../typeorm/getting-started.md): Connect your entity schemas to a database with TypeORM
- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
- [Best Practices](../advanced/best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
