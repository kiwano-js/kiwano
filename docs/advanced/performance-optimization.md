# Performance Optimization

GraphQL APIs can face performance challenges, especially with complex queries and large datasets. This guide explores techniques for optimizing the performance of your Kiwano GraphQL API.

## The N+1 Problem

The N+1 problem is a common performance issue in GraphQL APIs. It occurs when a resolver for a field in a list of objects makes a separate database query for each object, resulting in N+1 queries (1 for the list, N for the individual objects).

Consider this query:

```graphql
query {
  users {
    id
    name
    posts {
      id
      title
    }
  }
}
```

With a naive implementation, this could result in:
- 1 query to fetch all users
- N queries to fetch posts for each user

### Solution 1: DataLoader

[DataLoader](https://github.com/graphql/dataloader) is a utility that batches and caches database queries:

```typescript
import DataLoader from 'dataloader';
import { schema } from '@kiwano/core';

// Create a DataLoader for posts
const createPostsLoader = (context) => {
  return new DataLoader(async (userIds) => {
    // Fetch posts for all user IDs in a single query
    const posts = await context.dataSources.postAPI.getPostsByAuthorIds(userIds);
    
    // Group posts by user ID
    const postsByUserId = {};
    for (const post of posts) {
      if (!postsByUserId[post.authorId]) {
        postsByUserId[post.authorId] = [];
      }
      postsByUserId[post.authorId].push(post);
    }
    
    // Return posts for each user ID in the same order as the input
    return userIds.map(userId => postsByUserId[userId] || []);
  });
};

// Create a schema with DataLoader
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]', _ => _
      .resolver(async (user, args, context) => {
        // Use DataLoader to batch and cache queries
        return await context.loaders.posts.load(user.id);
      })
    )
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('authorId', 'ID!')
  );

// Create a GraphQL server with DataLoader
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: await mySchema.build(),
  context: () => {
    // Create a new context for each request
    const context = {
      dataSources: {
        userAPI: new UserAPI(),
        postAPI: new PostAPI()
      },
      loaders: {}
    };
    
    // Create DataLoaders
    context.loaders.posts = createPostsLoader(context);
    
    return context;
  }
});
```

### Solution 2: Eager Loading

With TypeORM, you can use eager loading to fetch related entities in a single query:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['posts'] // Eager load posts
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['posts'] // Eager load posts
    })
  );
```

### Solution 3: Join Monster

[Join Monster](https://join-monster.readthedocs.io/en/latest/) is a library that translates GraphQL queries into efficient SQL queries:

```typescript
import joinMonster from 'join-monster';
import { schema } from '@kiwano/core';

// Define Join Monster configuration
const userConfig = {
  sqlTable: 'users',
  uniqueKey: 'id',
  fields: {
    id: { sqlColumn: 'id' },
    name: { sqlColumn: 'name' },
    posts: {
      sqlJoin: (userTable, postTable) => `${userTable}.id = ${postTable}.author_id`
    }
  }
};

const postConfig = {
  sqlTable: 'posts',
  uniqueKey: 'id',
  fields: {
    id: { sqlColumn: 'id' },
    title: { sqlColumn: 'title' }
  }
};

// Create a schema with Join Monster
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]')
    .extension('joinMonster', userConfig)
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .extension('joinMonster', postConfig)
  )
  .query('users', '[User]', _ => _
    .resolver((_, args, context, info) => {
      return joinMonster.default(info, {}, sql => {
        return context.db.query(sql);
      });
    })
  );
```

## Query Complexity

Complex queries can consume excessive server resources. You can limit query complexity to prevent abuse.

### Solution 1: Query Complexity Analysis

[graphql-query-complexity](https://github.com/slicknode/graphql-query-complexity) allows you to analyze and limit query complexity:

```typescript
import { schema } from '@kiwano/core';
import { createComplexityRule } from 'graphql-query-complexity';

// Create a schema
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]', _ => _
      .extension('complexity', { multiplier: 10 }) // Higher complexity for lists
    )
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
  )
  .query('users', '[User]', _ => _
    .extension('complexity', { multiplier: 10 }) // Higher complexity for lists
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  );

// Create a GraphQL server with query complexity analysis
import { ApolloServer } from 'apollo-server';
import { makeExecutableSchema } from '@graphql-tools/schema';

const graphQLSchema = await mySchema.build();

const server = new ApolloServer({
  schema: graphQLSchema,
  validationRules: [
    createComplexityRule({
      maximumComplexity: 1000,
      variables: {},
      onComplete: (complexity) => {
        console.log('Query complexity:', complexity);
      },
      createError: (max, actual) => {
        return new Error(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`);
      },
      estimators: [
        // Use field extensions to determine complexity
        field => {
          const complexity = field.extensions?.complexity;
          if (complexity) {
            return complexity.multiplier || 1;
          }
          return 1;
        }
      ]
    })
  ]
});
```

### Solution 2: Query Depth Limiting

[graphql-depth-limit](https://github.com/stems/graphql-depth-limit) allows you to limit the depth of queries:

```typescript
import { schema } from '@kiwano/core';
import depthLimit from 'graphql-depth-limit';

// Create a schema
const mySchema = schema()
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

// Create a GraphQL server with depth limiting
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: await mySchema.build(),
  validationRules: [
    depthLimit(5) // Limit query depth to 5 levels
  ]
});
```

## Caching

Caching can significantly improve performance by storing the results of expensive operations.

### Solution 1: Response Caching

[apollo-server-cache-redis](https://github.com/apollographql/apollo-server/tree/main/packages/apollo-server-cache-redis) allows you to cache responses:

```typescript
import { schema } from '@kiwano/core';
import { ApolloServer } from 'apollo-server';
import { BaseRedisCache } from 'apollo-server-cache-redis';
import Redis from 'ioredis';

// Create a schema
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .extension('cacheControl', { maxAge: 60 }) // Cache for 60 seconds
  );

// Create a GraphQL server with response caching
const server = new ApolloServer({
  schema: await mySchema.build(),
  cache: new BaseRedisCache({
    client: new Redis({
      host: 'redis-server',
    }),
  }),
  cacheControl: {
    defaultMaxAge: 5, // Default cache time in seconds
    calculateHttpHeaders: true,
  },
});
```

### Solution 2: DataLoader Caching

DataLoader provides a built-in cache:

```typescript
import DataLoader from 'dataloader';

// Create a DataLoader with caching
const createUserLoader = (context) => {
  return new DataLoader(async (ids) => {
    // Fetch users for all IDs in a single query
    const users = await context.dataSources.userAPI.getUsersByIds(ids);
    
    // Return users in the same order as the input
    return ids.map(id => users.find(user => user.id === id) || null);
  });
};

// Use the DataLoader in resolvers
const resolvers = {
  Query: {
    user: async (_, { id }, context) => {
      return await context.loaders.user.load(id);
    }
  },
  Post: {
    author: async (post, _, context) => {
      return await context.loaders.user.load(post.authorId);
    }
  }
};
```

### Solution 3: Redis Caching

You can use Redis to cache expensive operations:

```typescript
import { schema } from '@kiwano/core';
import Redis from 'ioredis';

// Create a Redis client
const redis = new Redis({
  host: 'redis-server',
});

// Create a schema with Redis caching
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .resolver(async (_, { id }, context) => {
      // Check cache first
      const cacheKey = `user:${id}`;
      const cachedUser = await redis.get(cacheKey);
      
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }
      
      // Fetch from database if not in cache
      const user = await context.dataSources.userAPI.getUser(id);
      
      // Cache the result
      await redis.set(cacheKey, JSON.stringify(user), 'EX', 60); // Cache for 60 seconds
      
      return user;
    })
  );
```

## Pagination

Pagination is essential for handling large datasets efficiently.

### Solution 1: Offset-Limit Pagination

Offset-limit pagination is a simple approach:

```typescript
import { schema, offsetLimitPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .query('users', '[User]', _ => _
    .use(offsetLimitPaginationPlugin())
    .resolver((_, { pagination }, context) => {
      const { offset = 0, limit = 10 } = pagination || {};
      return context.dataSources.userAPI.getUsers(offset, limit);
    })
  );
```

### Solution 2: Cursor-Based Pagination

Cursor-based pagination is more efficient for large datasets:

```typescript
import { schema, relayPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .query('users', 'User', _ => _
    .use(relayPaginationPlugin())
    .resolver(async (_, { pagination }, context) => {
      const { first = 10, after } = pagination || {};
      
      // Decode cursor
      let afterId = null;
      if (after) {
        afterId = Buffer.from(after, 'base64').toString('utf-8');
      }
      
      // Fetch users
      const users = await context.dataSources.userAPI.getUsersAfter(afterId, first + 1);
      
      // Check if there are more results
      const hasNextPage = users.length > first;
      if (hasNextPage) {
        users.pop(); // Remove the extra item
      }
      
      // Create edges
      const edges = users.map(user => ({
        node: user,
        cursor: Buffer.from(user.id).toString('base64')
      }));
      
      // Create page info
      const pageInfo = {
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
      };
      
      return {
        edges,
        pageInfo,
        totalCount: await context.dataSources.userAPI.getUserCount()
      };
    })
  );
```

## Query Optimization

You can optimize queries to reduce database load.

### Solution 1: Field Selection

Only fetch the fields that are requested in the GraphQL query:

```typescript
import { schema } from '@kiwano/core';
import { getFieldsFromInfo } from 'graphql-fields-list';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
  )
  .query('users', '[User]', _ => _
    .resolver((_, __, context, info) => {
      // Get requested fields
      const fields = getFieldsFromInfo(info);
      
      // Fetch only the requested fields
      return context.dataSources.userAPI.getUsers({ fields });
    })
  );
```

### Solution 2: Query Batching

Batch multiple queries into a single request:

```typescript
import { schema } from '@kiwano/core';
import { ApolloServer } from 'apollo-server';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { ApolloClient, InMemoryCache } from '@apollo/client';

// Create a schema
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  );

// Create a GraphQL server
const server = new ApolloServer({
  schema: await mySchema.build()
});

// Create a client with query batching
const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new BatchHttpLink({
    uri: 'http://localhost:4000/graphql',
    batchMax: 5, // Max number of queries to batch
    batchInterval: 20 // Wait time in ms before sending the batch
  })
});
```

## Database Optimization

Optimizing your database can significantly improve performance.

### Solution 1: Indexing

Create indexes on frequently queried fields:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index() // Add an index to the name field
  name: string;

  @Column()
  @Index() // Add an index to the email field
  email: string;
}
```

### Solution 2: Query Optimization

Optimize your database queries:

```typescript
import { modelSchema, ModelQueryResolvers } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

class CustomUserQueryResolvers extends ModelQueryResolvers {
  createAllQuery(args, context, info) {
    const queryBuilder = super.createAllQuery(args, context, info);
    
    // Add query hints
    queryBuilder.comment('FORCE INDEX (idx_name)');
    
    return queryBuilder;
  }
}

const userSchema = modelSchema(User, dataSource)
  .queryResolvers(CustomUserQueryResolvers)
  .all()
  .find();
```

## Complete Example

Here's a complete example of performance optimization:

```typescript
import { schema } from '@kiwano/core';
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';
import { Post } from './entities/Post';
import DataLoader from 'dataloader';
import { ApolloServer } from 'apollo-server';
import { createComplexityRule } from 'graphql-query-complexity';
import depthLimit from 'graphql-depth-limit';
import Redis from 'ioredis';

// Create DataLoaders
const createUserLoader = (context) => {
  return new DataLoader(async (ids) => {
    // Fetch users for all IDs in a single query
    const users = await context.dataSources.userAPI.getUsersByIds(ids);
    
    // Return users in the same order as the input
    return ids.map(id => users.find(user => user.id === id) || null);
  });
};

const createPostsLoader = (context) => {
  return new DataLoader(async (userIds) => {
    // Fetch posts for all user IDs in a single query
    const posts = await context.dataSources.postAPI.getPostsByAuthorIds(userIds);
    
    // Group posts by user ID
    const postsByUserId = {};
    for (const post of posts) {
      if (!postsByUserId[post.authorId]) {
        postsByUserId[post.authorId] = [];
      }
      postsByUserId[post.authorId].push(post);
    }
    
    // Return posts for each user ID in the same order as the input
    return userIds.map(userId => postsByUserId[userId] || []);
  });
};

// Create Redis client
const redis = new Redis({
  host: 'redis-server',
});

// Create model schemas
const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['name', 'email', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
    .extension('complexity', { multiplier: 10 }) // Higher complexity for lists
    .extension('cacheControl', { maxAge: 60 }) // Cache for 60 seconds
  )
  .find(_ => _
    .extension('cacheControl', { maxAge: 60 }) // Cache for 60 seconds
  )
  .create()
  .update()
  .delete();

const postSchema = modelSchema(Post, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['title', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
    .extension('complexity', { multiplier: 10 }) // Higher complexity for lists
    .extension('cacheControl', { maxAge: 60 }) // Cache for 60 seconds
  )
  .find(_ => _
    .extension('cacheControl', { maxAge: 60 }) // Cache for 60 seconds
  )
  .create()
  .update()
  .delete();

// Create main schema
const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);

// Build the schema
const graphQLSchema = await mainSchema.build();

// Create a GraphQL server
const server = new ApolloServer({
  schema: graphQLSchema,
  context: () => {
    // Create a new context for each request
    const context = {
      dataSources: {
        userAPI: new UserAPI(),
        postAPI: new PostAPI()
      },
      loaders: {},
      redis
    };
    
    // Create DataLoaders
    context.loaders.user = createUserLoader(context);
    context.loaders.posts = createPostsLoader(context);
    
    return context;
  },
  validationRules: [
    // Limit query complexity
    createComplexityRule({
      maximumComplexity: 1000,
      variables: {},
      onComplete: (complexity) => {
        console.log('Query complexity:', complexity);
      },
      createError: (max, actual) => {
        return new Error(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`);
      },
      estimators: [
        // Use field extensions to determine complexity
        field => {
          const complexity = field.extensions?.complexity;
          if (complexity) {
            return complexity.multiplier || 1;
          }
          return 1;
        }
      ]
    }),
    // Limit query depth
    depthLimit(5)
  ],
  cacheControl: {
    defaultMaxAge: 5, // Default cache time in seconds
    calculateHttpHeaders: true,
  },
});

// Start the server
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

## Next Steps

Now that you understand performance optimization, you can explore:

- [Error Handling](error-handling.md): Implement robust error handling
- [Testing](testing.md): Test your GraphQL API
- [Best Practices](best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
