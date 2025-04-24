# Best Practices

This guide outlines best practices for building GraphQL APIs with Kiwano. Following these practices will help you create APIs that are efficient, maintainable, and user-friendly.

## Schema Design

### Use Descriptive Names

Choose clear, descriptive names for types, fields, and operations:

```typescript
// Good
schema()
  .object('User', _ => _
    .field('firstName', 'String')
    .field('lastName', 'String')
    .field('emailAddress', 'String')
  );

// Avoid
schema()
  .object('U', _ => _
    .field('fn', 'String')
    .field('ln', 'String')
    .field('em', 'String')
  );
```

### Follow Naming Conventions

Follow consistent naming conventions:

- **Types**: PascalCase (e.g., `User`, `BlogPost`)
- **Fields**: camelCase (e.g., `firstName`, `emailAddress`)
- **Enums**: PascalCase for the type, SCREAMING_SNAKE_CASE for values (e.g., `UserRole.ADMIN`)
- **Input Types**: PascalCase with "Input" suffix (e.g., `CreateUserInput`)

```typescript
schema()
  .object('User', _ => _
    .field('firstName', 'String')
    .field('lastName', 'String')
  )
  .enum('UserRole', _ => _
    .value('ADMIN')
    .value('USER')
    .value('GUEST')
  )
  .inputObject('CreateUserInput', _ => _
    .field('firstName', 'String')
    .field('lastName', 'String')
  );
```

### Use Non-Null Fields Appropriately

Mark fields as non-null (`!`) when they are guaranteed to have a value:

```typescript
schema()
  .object('User', _ => _
    .field('id', 'ID!')        // Always has a value
    .field('firstName', 'String!')  // Always has a value
    .field('middleName', 'String')  // Might be null
  );
```

### Design for the Client

Design your schema from the client's perspective, not based on your database structure:

```typescript
// Good: Client-focused design
schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('fullName', 'String!')
    .field('posts', '[Post]')
  );

// Avoid: Database-focused design
schema()
  .object('User', _ => _
    .field('userId', 'ID!')
    .field('userFirstName', 'String')
    .field('userLastName', 'String')
    .field('postIds', '[ID]')
  );
```

### Use Custom Scalar Types

Use custom scalar types for specialized data:

```typescript
import { schema } from '@kiwano/core';
import { DateTimeResolver, EmailAddressResolver, JSONResolver } from 'graphql-scalars';

schema()
  .scalar(DateTimeResolver)
  .scalar(EmailAddressResolver)
  .scalar(JSONResolver)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('email', 'EmailAddress')
    .field('createdAt', 'DateTime')
    .field('metadata', 'JSON')
  );
```

## Entity Schemas

### Use Entity Schemas for CRUD Operations

Use entity schemas for entities that require CRUD operations:

```typescript
import { entitySchema } from '@kiwano/core';

entitySchema('User')
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

### Customize Entity Operations

Customize entity operations to match your business requirements:

```typescript
entitySchema('User')
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .all(_ => _
    .description('Fetch all active users')
    .arg('status', 'String')
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

### Use Naming Strategies

Use naming strategies to ensure consistent naming:

```typescript
import { entitySchema, descriptiveNamingStrategy } from '@kiwano/core';

entitySchema('User')
  .naming(descriptiveNamingStrategy())
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
## Plugins

### Use Plugins for Common Functionality

Use plugins to add common functionality to your schema:

```typescript
import { schema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/core';

schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['name', 'email']))
    .use(offsetLimitPaginationPlugin())
  );
```

### Apply Plugins at the Appropriate Level

Apply plugins at the appropriate level:

- **Schema Level**: For functionality that applies to the entire schema
- **Type Level**: For functionality that applies to a specific type
- **Field Level**: For functionality that applies to a specific field

```typescript
import { schema, aclPlugin, equalsFilterPlugin, sortPlugin } from '@kiwano/core';

schema()
  .use(aclPlugin())  // Schema-level plugin
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .use(aclPlugin())  // Type-level plugin
  )
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin())  // Field-level plugin
    .use(sortPlugin(['name', 'email']))  // Field-level plugin
  );
```

### Configure Plugins Explicitly

Configure plugins explicitly to make your code more maintainable:

```typescript
import { schema, equalsFilterPlugin } from '@kiwano/core';

schema()
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin({
      argumentName: 'filter',
      exclude: ['password'],
      multi: true
    }))
  );
```

### Create Custom Plugins for Reusable Logic

Create custom plugins for reusable logic:

```typescript
import { Plugin, FieldBuilder, BuildContext, FieldBuilderInfo } from '@kiwano/core';

export interface LoggingPluginOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class LoggingPlugin implements Plugin {
  protected _options: LoggingPluginOptions;
  
  constructor(options?: LoggingPluginOptions) {
    this._options = {
      logLevel: 'info',
      ...options
    };
  }
  
  beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {
    console.log(`[${this._options.logLevel}] Building field: ${info.parentTypeName}.${builder.name}`);
  }
}

export function loggingPlugin(options?: LoggingPluginOptions): LoggingPlugin {
  return new LoggingPlugin(options);
}

// Usage
schema()
  .use(loggingPlugin({ logLevel: 'debug' }))
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  );
```
## TypeORM Integration

### Use Model Schemas for TypeORM Entities

Use model schemas for TypeORM entities:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

modelSchema(User, dataSource)
  .all()
  .find()
  .create()
  .update()
  .delete();
```

### Configure Eager Loading

Configure eager loading to optimize performance:

```typescript
modelSchema(User, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['profile', 'posts']  // Eager load these relations
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['profile', 'posts']  // Eager load these relations
    })
  );
```

### Use TypeORM Plugins

Use TypeORM-specific plugins for database integration:

```typescript
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['name', 'email', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

### Customize TypeORM Resolvers

Customize TypeORM resolvers to add business logic:

```typescript
import { modelSchema, ModelQueryResolvers, ModelMutationResolvers } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

class CustomUserQueryResolvers extends ModelQueryResolvers {
  async transformAllResponse(response, args, context, info) {
    // Transform the response before returning it
    return response.map(user => ({
      ...user,
      name: user.name.toUpperCase()
    }));
  }
}

class CustomUserMutationResolvers extends ModelMutationResolvers {
  async beforeCreateSave(entity, args, context, info) {
    // Modify the entity before saving it
    entity.createdBy = context.user?.id;
    entity.createdAt = new Date();
    
    return entity;
  }
}

modelSchema(User, dataSource)
  .queryResolvers(CustomUserQueryResolvers)
  .mutationResolvers(CustomUserMutationResolvers)
  .all()
  .find()
  .create()
  .update()
  .delete();
```
## Resolvers

### Keep Resolvers Simple

Keep resolvers simple and focused on a single responsibility:

```typescript
// Good
const userResolver = (_, { id }, context) => {
  return context.dataSources.userAPI.getUser(id);
};

// Avoid
const userResolver = async (_, { id }, context) => {
  // Fetch user
  const user = await context.db.query('SELECT * FROM users WHERE id = $1', [id]);
  
  // Fetch posts
  const posts = await context.db.query('SELECT * FROM posts WHERE author_id = $1', [id]);
  
  // Fetch comments
  const comments = await context.db.query('SELECT * FROM comments WHERE user_id = $1', [id]);
  
  // Transform data
  return {
    ...user,
    posts,
    comments
  };
};
```

### Use Data Sources

Use data sources to encapsulate data fetching logic:

```typescript
import { RESTDataSource } from 'apollo-datasource-rest';

class UserAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = 'https://api.example.com/';
  }

  async getUser(id) {
    return this.get(`users/${id}`);
  }

  async getUsers() {
    return this.get('users');
  }
}

// In your resolver
const userResolver = (_, { id }, { dataSources }) => {
  return dataSources.userAPI.getUser(id);
};
```

### Use DataLoader for Batching and Caching

Use DataLoader to batch and cache database queries:

```typescript
import DataLoader from 'dataloader';

// Create a DataLoader
const createUserLoader = (context) => {
  return new DataLoader(async (ids) => {
    // Fetch users for all IDs in a single query
    const users = await context.db.query(
      'SELECT * FROM users WHERE id IN ($1)',
      [ids.join(',')]
    );
    
    // Return users in the same order as the input
    return ids.map(id => users.find(user => user.id === id) || null);
  });
};

// Use the DataLoader in resolvers
const postResolver = {
  author: async (post, _, context) => {
    return await context.loaders.user.load(post.authorId);
  }
};
```

### Handle Errors Gracefully

Handle errors gracefully in resolvers:

```typescript
import { NotFoundError, ForbiddenError } from '@kiwano/core';

const userResolver = async (_, { id }, context) => {
  try {
    // Check authentication
    if (!context.user) {
      throw new ForbiddenError('You must be logged in to view users');
    }
    
    // Fetch user
    const user = await context.dataSources.userAPI.getUser(id);
    
    // Check if user exists
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    
    return user;
  } catch (error) {
    // Log the error
    console.error('Error in userResolver:', error);
    
    // Rethrow the error
    throw error;
  }
};
```

### Use Resolver Classes

Organize resolvers in classes for better maintainability:

```typescript
class UserQueryResolvers {
  async user(_, { id }, context) {
    return await context.dataSources.userAPI.getUser(id);
  }
  
  async users(_, args, context) {
    return await context.dataSources.userAPI.getUsers(args);
  }
}

class UserMutationResolvers {
  async createUser(_, { input }, context) {
    return await context.dataSources.userAPI.createUser(input);
  }
  
  async updateUser(_, { id, input }, context) {
    return await context.dataSources.userAPI.updateUser(id, input);
  }
  
  async deleteUser(_, { id }, context) {
    return await context.dataSources.userAPI.deleteUser(id);
  }
}

// Add resolver classes to the schema
schema()
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers);
```
## Performance

### Use Pagination

Use pagination to limit the amount of data returned:

```typescript
import { schema, offsetLimitPaginationPlugin } from '@kiwano/core';

schema()
  .query('users', '[User]', _ => _
    .use(offsetLimitPaginationPlugin())
  );
```

### Optimize Database Queries

Optimize database queries to reduce load:

```typescript
// Good: Single query with joins
const users = await context.db.query(`
  SELECT u.*, p.*
  FROM users u
  LEFT JOIN profiles p ON u.id = p.user_id
  WHERE u.id IN ($1)
`, [ids.join(',')]);

// Avoid: N+1 queries
const users = await context.db.query('SELECT * FROM users WHERE id IN ($1)', [ids.join(',')]);
for (const user of users) {
  user.profile = await context.db.query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
}
```

### Use Caching

Use caching to improve performance:

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

// Create a GraphQL server with caching
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

### Limit Query Complexity

Limit query complexity to prevent abuse:

```typescript
import { schema } from '@kiwano/core';
import { ApolloServer } from 'apollo-server';
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
  .query('users', '[User]', _ => _
    .extension('complexity', { multiplier: 10 }) // Higher complexity for lists
  );

// Create a GraphQL server with query complexity analysis
const server = new ApolloServer({
  schema: await mySchema.build(),
  validationRules: [
    createComplexityRule({
      maximumComplexity: 1000,
      variables: {},
      onComplete: (complexity) => {
        console.log('Query complexity:', complexity);
      },
      createError: (max, actual) => {
        return new Error(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`);
      }
    })
  ]
});
```

### Use Field Selection

Only fetch the fields that are requested:

```typescript
import { schema } from '@kiwano/core';
import { getFieldsFromInfo } from 'graphql-fields-list';

schema()
  .query('users', '[User]', _ => _
    .resolver((_, __, context, info) => {
      // Get requested fields
      const fields = getFieldsFromInfo(info);
      
      // Fetch only the requested fields
      return context.dataSources.userAPI.getUsers({ fields });
    })
  );
```
## Security

### Use Authentication and Authorization

Implement authentication and authorization:

```typescript
import { schema, ForbiddenError, UnauthorizedError } from '@kiwano/core';

schema()
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .resolver((_, { id }, context) => {
      // Check authentication
      if (!context.user) {
        throw new UnauthorizedError('You must be logged in to view users');
      }
      
      // Check authorization
      if (context.user.id !== id && context.user.role !== 'ADMIN') {
        throw new ForbiddenError('You do not have permission to view this user');
      }
      
      return context.dataSources.userAPI.getUser(id);
    })
  );
```

### Use the ACL Plugin

Use the ACL plugin for role-based access control:

```typescript
import { schema, aclPlugin } from '@kiwano/core';

schema()
  .use(aclPlugin())
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String', _ => _
      .allow('ADMIN', 'OWNER')
      .deny('GUEST')
    )
    .allow('ADMIN', 'OWNER', 'USER')
    .deny('GUEST')
  );
```

### Validate Input

Validate input to prevent security vulnerabilities:

```typescript
import { schema, InvalidInputError } from '@kiwano/core';

schema()
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
    .resolver((_, { input }, context) => {
      // Validate email
      if (!isValidEmail(input.email)) {
        throw new InvalidInputError('Invalid email address');
      }
      
      // Validate password
      if (input.password.length < 8) {
        throw new InvalidInputError('Password must be at least 8 characters long');
      }
      
      return context.dataSources.userAPI.createUser(input);
    })
  );
```

### Protect Sensitive Data

Protect sensitive data by excluding it from the schema:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

modelSchema(User, dataSource)
  .entity(_ => _
    .exclude('password')
    .exclude('secretKey')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

### Use HTTPS

Always use HTTPS in production:

```typescript
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import https from 'https';
import fs from 'fs';

const app = express();

const server = new ApolloServer({
  schema: await mySchema.build()
});

server.applyMiddleware({ app });

// Create HTTPS server
const httpsOptions = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

https.createServer(httpsOptions, app).listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

### Implement Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/graphql', limiter);

const server = new ApolloServer({
  schema: await mySchema.build()
});

server.applyMiddleware({ app });

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
```
## Documentation

### Add Descriptions to Types and Fields

Add descriptions to types and fields:

```typescript
schema()
  .object('User', _ => _
    .description('A user in the system')
    .field('id', 'ID!', _ => _
      .description('The unique identifier for the user')
    )
    .field('name', 'String', _ => _
      .description('The name of the user')
    )
    .field('email', 'String', _ => _
      .description('The email address of the user')
    )
  );
```

### Document Resolvers

Document resolvers with comments:

```typescript
/**
 * Fetches a user by ID
 * 
 * @param parent - The parent object
 * @param args - The arguments object
 * @param args.id - The ID of the user to fetch
 * @param context - The context object
 * @param info - The info object
 * @returns The user object
 * @throws {NotFoundError} If the user is not found
 * @throws {ForbiddenError} If the user does not have permission to view the user
 */
const userResolver = async (parent, { id }, context, info) => {
  // Implementation
};
```

### Use Deprecation Notices

Use deprecation notices for deprecated fields:

```typescript
schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('username', 'String', _ => _
      .deprecationReason('Use email instead')
    )
  );
```

### Generate API Documentation

Generate API documentation from your schema:

```typescript
import { schema } from '@kiwano/core';
import { printSchema } from 'graphql';
import fs from 'fs';

// Create your schema
const mySchema = schema()
  .object('User', _ => _
    .description('A user in the system')
    .field('id', 'ID!', _ => _
      .description('The unique identifier for the user')
    )
    .field('name', 'String', _ => _
      .description('The name of the user')
    )
    .field('email', 'String', _ => _
      .description('The email address of the user')
    )
  )
  .query('user', 'User', _ => _
    .description('Fetch a user by ID')
    .arg('id', 'ID!', _ => _
      .description('The ID of the user to fetch')
    )
  );

// Build the schema
const graphQLSchema = await mySchema.build();

// Print the schema to SDL
const sdl = printSchema(graphQLSchema);

// Write the SDL to a file
fs.writeFileSync('schema.graphql', sdl);
```

## Conclusion

Following these best practices will help you build GraphQL APIs with Kiwano that are efficient, maintainable, and user-friendly. Remember that these are guidelines, not strict rules, and you should adapt them to your specific needs.

For more information, check out the other guides in the documentation:

- [Schema Customization](schema-customization.md)
- [Performance Optimization](performance-optimization.md)
- [Error Handling](error-handling.md)
- [Testing](testing.md)
