# Modularization

As your GraphQL API grows, it becomes important to split your schema into smaller, more manageable pieces. Kiwano provides powerful modularization features that allow you to organize your schema into reusable components.

## Why Modularize?

Modularizing your schema offers several benefits:

- **Maintainability**: Smaller files are easier to understand and maintain
- **Reusability**: Modules can be reused across different parts of your API
- **Separation of Concerns**: Each module can focus on a specific domain or entity
- **Team Collaboration**: Different teams can work on different modules
- **Testing**: Modules can be tested in isolation

## Creating Sub-Schemas

In Kiwano, you can create separate schema builders and merge them together:

```typescript
import { schema } from '@kiwano/core';

// User schema
const userSchema = schema()
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
  )
  .query('users', '[User]', _ => _
    .resolver(() => {
      // Fetch all users
      return [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com' }
      ];
    })
  );

// Post schema
const postSchema = schema()
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('authorId', 'ID!')
  )
  .query('post', 'Post', _ => _
    .arg('id', 'ID!')
    .resolver((_, { id }) => {
      // Fetch post by ID
      return { id, title: 'Post 1', content: 'Content 1', authorId: '1' };
    })
  )
  .query('posts', '[Post]', _ => _
    .resolver(() => {
      // Fetch all posts
      return [
        { id: '1', title: 'Post 1', content: 'Content 1', authorId: '1' },
        { id: '2', title: 'Post 2', content: 'Content 2', authorId: '2' }
      ];
    })
  );

// Main schema
const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);

// Build the schema
const graphQLSchema = await mainSchema.build();
```

## Organizing Files

In a real-world application, you would typically organize your schema files by domain or entity:

```
src/
  schema/
    index.ts         # Main schema
    user/
      index.ts       # User schema
      types.ts       # User types
      queries.ts     # User queries
      mutations.ts   # User mutations
      resolvers.ts   # User resolvers
    post/
      index.ts       # Post schema
      types.ts       # Post types
      queries.ts     # Post queries
      mutations.ts   # Post mutations
      resolvers.ts   # Post resolvers
```

### Example: User Schema Module

```typescript
// src/schema/user/types.ts
import { schema } from '@kiwano/core';

export function createUserTypes() {
  return schema()
    .object('User', _ => _
      .field('id', 'ID!')
      .field('name', 'String')
      .field('email', 'String')
    )
    .inputObject('CreateUserInput', _ => _
      .field('name', 'String!')
      .field('email', 'String!')
    )
    .inputObject('UpdateUserInput', _ => _
      .field('name', 'String')
      .field('email', 'String')
    );
}
```

```typescript
// src/schema/user/queries.ts
import { schema } from '@kiwano/core';

export function createUserQueries() {
  return schema()
    .query('user', 'User', _ => _
      .arg('id', 'ID!')
    )
    .query('users', '[User]');
}
```

```typescript
// src/schema/user/mutations.ts
import { schema } from '@kiwano/core';

export function createUserMutations() {
  return schema()
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
}
```

```typescript
// src/schema/user/resolvers.ts
export class UserQueryResolvers {
  user(_, { id }) {
    // Fetch user by ID
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
  
  users() {
    // Fetch all users
    return [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' }
    ];
  }
}

export class UserMutationResolvers {
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
```

```typescript
// src/schema/user/index.ts
import { schema } from '@kiwano/core';
import { createUserTypes } from './types';
import { createUserQueries } from './queries';
import { createUserMutations } from './mutations';
import { UserQueryResolvers, UserMutationResolvers } from './resolvers';

export function createUserSchema() {
  return schema('UserSchema')
    .merge(createUserTypes())
    .merge(createUserQueries())
    .merge(createUserMutations())
    .queryResolvers(UserQueryResolvers)
    .mutationResolvers(UserMutationResolvers);
}
```

### Example: Main Schema

```typescript
// src/schema/index.ts
import { schema } from '@kiwano/core';
import { createUserSchema } from './user';
import { createPostSchema } from './post';

export async function createSchema() {
  const mainSchema = schema()
    .merge(createUserSchema())
    .merge(createPostSchema());
  
  return await mainSchema.build();
}
```

## Cross-Module References

Modules can reference types defined in other modules:

```typescript
// src/schema/post/types.ts
import { schema } from '@kiwano/core';

export function createPostTypes() {
  return schema()
    .object('Post', _ => _
      .field('id', 'ID!')
      .field('title', 'String')
      .field('content', 'String')
      .field('author', 'User') // Reference to User type
    );
}
```

```typescript
// src/schema/post/resolvers.ts
export class PostResolvers {
  author(post, _, context) {
    // Fetch the author of this post
    return context.dataSources.userAPI.getUser(post.authorId);
  }
}

export class PostQueryResolvers {
  // ...
}

export class PostMutationResolvers {
  // ...
}
```

```typescript
// src/schema/post/index.ts
import { schema } from '@kiwano/core';
import { createPostTypes } from './types';
import { createPostQueries } from './queries';
import { createPostMutations } from './mutations';
import { PostResolvers, PostQueryResolvers, PostMutationResolvers } from './resolvers';

export function createPostSchema() {
  return schema('PostSchema')
    .merge(createPostTypes())
    .merge(createPostQueries())
    .merge(createPostMutations())
    .queryResolvers(PostQueryResolvers)
    .mutationResolvers(PostMutationResolvers)
    .resolvers({
      Post: new PostResolvers()
    });
}
```

## Using Entity Schemas for Modularization

Entity schemas are a powerful way to modularize your schema by entity:

```typescript
import { entitySchema } from '@kiwano/core';

// User entity schema
const userSchema = entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('posts', '[Post]')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();

// Post entity schema
const postSchema = entitySchema('Post')
  .entity(_ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('author', 'User')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();

// Main schema
const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);
```

## Sharing Configuration Across Modules

You can share configuration across modules, such as naming strategies or plugins:

```typescript
import { schema, descriptiveNamingStrategy, equalsFilterPlugin } from '@kiwano/core';

// Create a base schema with shared configuration
const baseSchema = schema()
  .naming(descriptiveNamingStrategy())
  .use(equalsFilterPlugin());

// User schema inherits configuration from base schema
const userSchema = schema()
  .merge(baseSchema)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  );

// Post schema also inherits configuration from base schema
const postSchema = schema()
  .merge(baseSchema)
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
  );

// Main schema
const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);
```

## Next Steps

Now that you understand modularization in Kiwano, you can explore:

- [Entity Schemas](../entity-schemas/introduction.md): Learn how to use entity schemas for CRUD operations
- [Plugins](../plugins/overview.md): Extend your schema with powerful plugins
- [TypeORM Integration](../typeorm/getting-started.md): Connect your schema to a database with TypeORM
- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
