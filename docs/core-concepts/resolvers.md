# Resolvers

Resolvers are functions that implement the logic for resolving fields in your GraphQL schema. They determine how data is fetched or computed for each field.

## Resolver Basics

In GraphQL, resolvers follow a specific signature:

```typescript
function resolver(parent, args, context, info) {
  // Implementation
}
```

- `parent`: The result of the parent resolver (or the root value for top-level fields)
- `args`: The arguments provided to the field
- `context`: A shared context object containing per-request state
- `info`: Information about the execution state of the query

## Adding Resolvers in Kiwano

Kiwano provides several ways to add resolvers to your schema.

### Inline Resolvers

You can add resolvers directly to fields:

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .resolver((parent, { id }, context) => {
      // Fetch user by ID
      return { id, name: 'John Doe' };
    })
  );
```

### Resolver Classes

You can organize resolvers in classes:

```typescript
class UserQueryResolvers {
  user(parent, { id }, context) {
    // Fetch user by ID
    return { id, name: 'John Doe' };
  }
  
  users(parent, args, context) {
    // Fetch all users
    return [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Doe' }
    ];
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

Kiwano will automatically instantiate the class if you provide a class reference:

```typescript
mySchema.queryResolvers(UserQueryResolvers);
```

Or you can instantiate it yourself:

```typescript
mySchema.queryResolvers(new UserQueryResolvers());
```

### Mutation Resolvers

Mutation resolvers work the same way:

```typescript
class UserMutationResolvers {
  createUser(parent, { input }, context) {
    // Create a new user
    const newUser = {
      id: String(Math.floor(Math.random() * 1000)),
      ...input
    };
    return newUser;
  }
  
  updateUser(parent, { id, input }, context) {
    // Update user
    return { id, ...input };
  }
  
  deleteUser(parent, { id }, context) {
    // Delete user
    return true;
  }
}

mySchema.mutationResolvers(UserMutationResolvers);
```

### Object Type Resolvers

You can add resolvers for fields within object types:

```typescript
class UserResolvers {
  posts(user, args, context) {
    // Fetch posts for this user
    return [
      { id: '1', title: 'Post 1', authorId: user.id },
      { id: '2', title: 'Post 2', authorId: user.id }
    ];
  }
}

mySchema.resolvers({
  User: new UserResolvers()
});
```

Or using the `entityResolvers` method for entity schemas:

```typescript
import { entitySchema } from '@kiwano/core';

const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]')
  )
  .entityResolvers(UserResolvers);
```

### Combined Resolvers

You can combine all resolvers in a single object:

```typescript
mySchema.resolvers({
  Query: {
    user(parent, { id }, context) {
      // Fetch user by ID
      return { id, name: 'John Doe' };
    },
    users(parent, args, context) {
      // Fetch all users
      return [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Doe' }
      ];
    }
  },
  Mutation: {
    createUser(parent, { input }, context) {
      // Create a new user
      const newUser = {
        id: String(Math.floor(Math.random() * 1000)),
        ...input
      };
      return newUser;
    }
  },
  User: {
    posts(user, args, context) {
      // Fetch posts for this user
      return [
        { id: '1', title: 'Post 1', authorId: user.id },
        { id: '2', title: 'Post 2', authorId: user.id }
      ];
    }
  }
});
```

## Resolver Context

The context object is a shared object that is passed to all resolvers. It's typically used to store per-request state, such as the current user, database connections, etc.

### Setting Up Context

The context is typically set up when creating the GraphQL server:

```typescript
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: graphQLSchema,
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
```

### Using Context in Resolvers

You can access the context in your resolvers:

```typescript
mySchema.query('currentUser', 'User', _ => _
  .resolver((parent, args, context) => {
    // Access the current user from the context
    return context.currentUser;
  })
);

mySchema.query('posts', '[Post]', _ => _
  .resolver((parent, args, context) => {
    // Access data sources from the context
    return context.dataSources.postAPI.getPosts();
  })
);
```

## Resolver Patterns

Here are some common resolver patterns:

### Fetching Data

```typescript
mySchema.query('user', 'User', _ => _
  .arg('id', 'ID!')
  .resolver(async (parent, { id }, context) => {
    // Fetch user from a database or API
    const user = await context.dataSources.userAPI.getUser(id);
    return user;
  })
);
```

### Transforming Data

```typescript
mySchema.object('User', _ => _
  .field('id', 'ID!')
  .field('firstName', 'String')
  .field('lastName', 'String')
  .field('fullName', 'String', _ => _
    .resolver(user => {
      // Compute the full name from firstName and lastName
      return `${user.firstName} ${user.lastName}`;
    })
  )
);
```

### Handling Relationships

```typescript
mySchema
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]')
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('author', 'User')
  );

mySchema.resolvers({
  User: {
    async posts(user, args, context) {
      // Fetch posts for this user
      return await context.dataSources.postAPI.getPostsByAuthor(user.id);
    }
  },
  Post: {
    async author(post, args, context) {
      // Fetch the author of this post
      return await context.dataSources.userAPI.getUser(post.authorId);
    }
  }
});
```

### Batching and Caching

To optimize performance, you can use batching and caching techniques:

```typescript
import DataLoader from 'dataloader';

// Create a server with DataLoader in the context
const server = new ApolloServer({
  schema: graphQLSchema,
  context: () => {
    // Create DataLoaders for batching requests
    const userLoader = new DataLoader(async (ids) => {
      // Batch fetch users by IDs
      const users = await fetchUsersByIds(ids);
      // Return users in the same order as the IDs
      return ids.map(id => users.find(user => user.id === id));
    });
    
    return {
      loaders: {
        user: userLoader
      }
    };
  }
});

// Use the DataLoader in resolvers
mySchema.resolvers({
  Post: {
    async author(post, args, context) {
      // Use DataLoader to batch and cache requests
      return await context.loaders.user.load(post.authorId);
    }
  }
});
```

## Error Handling

Kiwano provides error classes for common GraphQL errors:

```typescript
import { NotFoundError, ForbiddenError, InvalidInputError } from '@kiwano/core';

mySchema.query('user', 'User', _ => _
  .arg('id', 'ID!')
  .resolver(async (parent, { id }, context) => {
    // Check if the user exists
    const user = await context.dataSources.userAPI.getUser(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    
    // Check if the current user has permission to view this user
    if (!hasPermission(context.currentUser, 'view', user)) {
      throw new ForbiddenError('You do not have permission to view this user');
    }
    
    return user;
  })
);

mySchema.mutation('createUser', 'User', _ => _
  .arg('input', 'CreateUserInput!')
  .resolver(async (parent, { input }, context) => {
    // Validate input
    if (!isValidEmail(input.email)) {
      throw new InvalidInputError('Invalid email address');
    }
    
    // Create user
    const newUser = await context.dataSources.userAPI.createUser(input);
    return newUser;
  })
);
```

## Next Steps

Now that you understand resolvers in Kiwano, you can explore:

- [Modularization](modularization.md): Learn how to split your schema into reusable components
- [Entity Schemas](../entity-schemas/introduction.md): Use entity schemas for CRUD operations
- [Plugins](../plugins/overview.md): Extend your schema with powerful plugins
- [TypeORM Integration](../typeorm/getting-started.md): Connect your schema to a database with TypeORM
