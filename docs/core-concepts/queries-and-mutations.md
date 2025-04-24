# Queries and Mutations

GraphQL APIs expose operations through queries and mutations. Queries are used to fetch data, while mutations are used to modify data. Kiwano provides a fluent API for defining these operations.

## Queries

Queries are operations that retrieve data from your API. They are read-only and should not cause any side effects.

### Defining Queries

To define a query, use the `query` method on the schema builder:

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .resolver((_, { id }) => {
      // Fetch user by ID
      return { id, name: 'John Doe', email: 'john@example.com' };
    })
  );
```

The `query` method takes three parameters:
1. The name of the query
2. The return type of the query
3. An optional configurator function

### Query Arguments

You can add arguments to your queries using the `arg` method:

```typescript
mySchema.query('user', 'User', _ => _
  .arg('id', 'ID!')
  .resolver((_, { id }) => {
    // Fetch user by ID
    return { id, name: 'John Doe', email: 'john@example.com' };
  })
);
```

For complex arguments, you can use input object types:

```typescript
mySchema
  .inputObject('UserFilter', _ => _
    .field('name', 'String')
    .field('email', 'String')
    .field('minAge', 'Int')
    .field('maxAge', 'Int')
  )
  .query('users', '[User]', _ => _
    .arg('filter', 'UserFilter')
    .resolver((_, { filter }) => {
      // Filter users based on the provided criteria
      // ...
      return [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com' }
      ];
    })
  );
```

### Query Resolvers

Resolvers implement the logic for resolving queries. You can add resolvers in several ways:

#### Inline Resolvers

You can add resolvers directly to queries:

```typescript
mySchema.query('user', 'User', _ => _
  .arg('id', 'ID!')
  .resolver((_, { id }) => {
    // Resolver implementation
    return { id, name: 'John Doe', email: 'john@example.com' };
  })
);
```

#### Resolver Classes

You can organize resolvers in classes:

```typescript
class UserQueryResolvers {
  user(_, { id }) {
    // Resolver implementation
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
  
  users(_, { filter }) {
    // Resolver implementation
    return [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' }
    ];
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

## Mutations

Mutations are operations that modify data on the server. They can create, update, or delete data.

### Defining Mutations

To define a mutation, use the `mutation` method on the schema builder:

```typescript
mySchema
  .inputObject('CreateUserInput', _ => _
    .field('name', 'String!')
    .field('email', 'String!')
    .field('age', 'Int')
  )
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
    .resolver((_, { input }) => {
      // Create a new user
      const newUser = {
        id: String(Math.floor(Math.random() * 1000)),
        ...input
      };
      return newUser;
    })
  );
```

The `mutation` method takes three parameters:
1. The name of the mutation
2. The return type of the mutation
3. An optional configurator function

### Mutation Arguments

Like queries, mutations can have arguments:

```typescript
mySchema
  .inputObject('UpdateUserInput', _ => _
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
  )
  .mutation('updateUser', 'User', _ => _
    .arg('id', 'ID!')
    .arg('input', 'UpdateUserInput!')
    .resolver((_, { id, input }) => {
      // Update user
      return { id, ...input };
    })
  );
```

### Mutation Resolvers

Resolvers for mutations work the same way as for queries:

#### Inline Resolvers

```typescript
mySchema.mutation('deleteUser', 'Boolean', _ => _
  .arg('id', 'ID!')
  .resolver((_, { id }) => {
    // Delete user
    return true;
  })
);
```

#### Resolver Classes

```typescript
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

mySchema.mutationResolvers(UserMutationResolvers);
```

## Resolver Context

Resolvers receive a context object as the third parameter, which can contain shared data like the current user, database connections, etc.:

```typescript
mySchema.query('currentUser', 'User', _ => _
  .resolver((_, __, context) => {
    // Access the current user from the context
    return context.currentUser;
  })
);
```

The context is typically set up when creating the GraphQL server:

```typescript
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: graphQLSchema,
  context: ({ req }) => {
    // Create a context for each request
    return {
      currentUser: getUserFromRequest(req)
    };
  }
});
```

## Field Resolvers

In addition to query and mutation resolvers, you can define resolvers for fields within object types:

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
    .field('content', 'String')
  );

// Add resolvers for the User.posts field
mySchema.resolvers({
  User: {
    posts(user) {
      // Fetch posts for this user
      return [
        { id: '1', title: 'Post 1', content: 'Content 1' },
        { id: '2', title: 'Post 2', content: 'Content 2' }
      ];
    }
  }
});
```

## Resolver Organization

As your API grows, it's important to organize your resolvers effectively. Kiwano provides several approaches:

### Inline Resolvers

Suitable for simple resolvers:

```typescript
mySchema.query('hello', 'String', _ => _
  .resolver(() => 'Hello, world!')
);
```

### Resolver Classes

Suitable for grouping related resolvers:

```typescript
class UserQueryResolvers {
  user(_, { id }) { /* ... */ }
  users(_, { filter }) { /* ... */ }
}

class UserMutationResolvers {
  createUser(_, { input }) { /* ... */ }
  updateUser(_, { id, input }) { /* ... */ }
  deleteUser(_, { id }) { /* ... */ }
}

mySchema
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers);
```

### Object Type Resolvers

Suitable for field resolvers:

```typescript
class UserResolvers {
  posts(user) { /* ... */ }
  comments(user) { /* ... */ }
}

class PostResolvers {
  author(post) { /* ... */ }
  comments(post) { /* ... */ }
}

mySchema.resolvers({
  User: new UserResolvers(),
  Post: new PostResolvers()
});
```

## Next Steps

Now that you understand queries and mutations in Kiwano, you can explore:

- [Resolvers](resolvers.md): Dive deeper into resolver patterns and best practices
- [Modularization](modularization.md): Learn how to split your schema into reusable components
- [Entity Schemas](../entity-schemas/introduction.md): Use entity schemas for CRUD operations
- [Plugins](../plugins/overview.md): Extend your schema with powerful plugins
