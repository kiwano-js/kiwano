# Testing

Testing is a crucial part of building reliable GraphQL APIs. This guide explores techniques for testing your Kiwano GraphQL API.

## Types of Tests

When testing a GraphQL API, you should consider several types of tests:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test how components work together
3. **Schema Tests**: Test the structure of your GraphQL schema
4. **Resolver Tests**: Test the behavior of your resolvers
5. **End-to-End Tests**: Test the entire API from the client's perspective

## Testing Tools

Here are some popular tools for testing GraphQL APIs:

- **Jest**: A JavaScript testing framework
- **Vitest**: A modern testing framework for Vite
- **Mocha**: A flexible JavaScript testing framework
- **Chai**: An assertion library
- **Sinon**: A mocking library
- **SuperTest**: A library for testing HTTP servers
- **GraphQL Tools**: Utilities for testing GraphQL schemas
- **Apollo Server Testing**: Utilities for testing Apollo Server

## Setting Up a Testing Environment

Here's how to set up a testing environment for your Kiwano GraphQL API:

```typescript
// test/setup.ts
import { schema } from '@kiwano/core';
import { ApolloServer } from 'apollo-server';
import { createTestClient } from 'apollo-server-testing';

// Create a test schema
const createTestSchema = async () => {
  const testSchema = schema()
    .object('User', _ => _
      .field('id', 'ID!')
      .field('name', 'String')
      .field('email', 'String')
    )
    .query('user', 'User', _ => _
      .arg('id', 'ID!')
      .resolver((_, { id }) => {
        return { id, name: 'Test User', email: 'test@example.com' };
      })
    )
    .query('users', '[User]', _ => _
      .resolver(() => {
        return [
          { id: '1', name: 'User 1', email: 'user1@example.com' },
          { id: '2', name: 'User 2', email: 'user2@example.com' }
        ];
      })
    );
  
  return await testSchema.build();
};

// Create a test client
export const createTestClient = async (context = {}) => {
  const server = new ApolloServer({
    schema: await createTestSchema(),
    context: () => context
  });
  
  return createTestClient(server);
};
```

## Unit Testing

Unit tests focus on testing individual components in isolation:

```typescript
// test/unit/schema.test.ts
import { schema } from '@kiwano/core';
import { describe, it, expect } from 'vitest';

describe('Schema Builder', () => {
  it('should create a schema with an object type', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
      );
    
    const graphQLSchema = await testSchema.build();
    
    expect(graphQLSchema).toBeDefined();
    expect(graphQLSchema.getType('User')).toBeDefined();
  });
  
  it('should create a schema with a query', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
      )
      .query('user', 'User', _ => _
        .arg('id', 'ID!')
      );
    
    const graphQLSchema = await testSchema.build();
    
    expect(graphQLSchema).toBeDefined();
    const queryType = graphQLSchema.getQueryType();
    expect(queryType).toBeDefined();
    expect(queryType.getFields().user).toBeDefined();
  });
});
```

## Integration Testing

Integration tests focus on testing how components work together:

```typescript
// test/integration/resolvers.test.ts
import { schema } from '@kiwano/core';
import { describe, it, expect } from 'vitest';
import { execute } from 'graphql';

describe('Resolvers', () => {
  it('should resolve a query', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
      )
      .query('user', 'User', _ => _
        .arg('id', 'ID!')
        .resolver((_, { id }) => {
          return { id, name: 'Test User' };
        })
      );
    
    const graphQLSchema = await testSchema.build();
    
    const query = `
      query {
        user(id: "1") {
          id
          name
        }
      }
    `;
    
    const result = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: {}
    });
    
    expect(result.errors).toBeUndefined();
    expect(result.data.user).toEqual({
      id: '1',
      name: 'Test User'
    });
  });
});
```

## Schema Testing

Schema tests focus on testing the structure of your GraphQL schema:

```typescript
// test/schema/schema.test.ts
import { schema } from '@kiwano/core';
import { describe, it, expect } from 'vitest';
import { printSchema, lexicographicSortSchema } from 'graphql';

describe('Schema', () => {
  it('should match the expected schema', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
        .field('email', 'String')
      )
      .query('user', 'User', _ => _
        .arg('id', 'ID!')
      )
      .query('users', '[User]');
    
    const graphQLSchema = await testSchema.build();
    
    // Sort the schema to ensure consistent output
    const sortedSchema = lexicographicSortSchema(graphQLSchema);
    
    // Print the schema to SDL
    const printedSchema = printSchema(sortedSchema);
    
    // Compare with expected schema
    expect(printedSchema).toMatchSnapshot();
  });
  
  it('should validate the schema', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
        .field('email', 'String')
      )
      .query('user', 'User', _ => _
        .arg('id', 'ID!')
      )
      .query('users', '[User]');
    
    // Validate the schema
    await expect(testSchema.validate()).resolves.not.toThrow();
  });
});
```

## Resolver Testing

Resolver tests focus on testing the behavior of your resolvers:

```typescript
// test/resolvers/user.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('User Resolvers', () => {
  it('should fetch a user by ID', async () => {
    // Mock the data source
    const userAPI = {
      getUser: vi.fn().mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com'
      })
    };
    
    // Create the context
    const context = {
      dataSources: {
        userAPI
      }
    };
    
    // Create the resolver
    const resolver = (_, { id }, context) => {
      return context.dataSources.userAPI.getUser(id);
    };
    
    // Call the resolver
    const result = await resolver(null, { id: '1' }, context, {} as any);
    
    // Verify the result
    expect(result).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    // Verify the mock was called
    expect(userAPI.getUser).toHaveBeenCalledWith('1');
  });
});
```

## End-to-End Testing

End-to-end tests focus on testing the entire API from the client's perspective:

```typescript
// test/e2e/api.test.ts
import { createTestClient } from '../setup';
import { describe, it, expect } from 'vitest';
import { gql } from 'apollo-server';

describe('API', () => {
  it('should fetch a user by ID', async () => {
    const { query } = await createTestClient();
    
    const USER_QUERY = gql`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;
    
    const result = await query({
      query: USER_QUERY,
      variables: { id: '1' }
    });
    
    expect(result.errors).toBeUndefined();
    expect(result.data.user).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com'
    });
  });
  
  it('should fetch all users', async () => {
    const { query } = await createTestClient();
    
    const USERS_QUERY = gql`
      query GetUsers {
        users {
          id
          name
          email
        }
      }
    `;
    
    const result = await query({
      query: USERS_QUERY
    });
    
    expect(result.errors).toBeUndefined();
    expect(result.data.users).toHaveLength(2);
    expect(result.data.users[0]).toEqual({
      id: '1',
      name: 'User 1',
      email: 'user1@example.com'
    });
  });
});
```

## Mocking

Mocking is essential for testing resolvers without relying on external dependencies:

```typescript
// test/mocks/dataSources.ts
import { vi } from 'vitest';

// Mock data
const users = [
  { id: '1', name: 'User 1', email: 'user1@example.com' },
  { id: '2', name: 'User 2', email: 'user2@example.com' }
];

const posts = [
  { id: '1', title: 'Post 1', content: 'Content 1', authorId: '1' },
  { id: '2', title: 'Post 2', content: 'Content 2', authorId: '1' },
  { id: '3', title: 'Post 3', content: 'Content 3', authorId: '2' }
];

// Mock data sources
export const createMockDataSources = () => ({
  userAPI: {
    getUser: vi.fn((id) => users.find(user => user.id === id)),
    getAllUsers: vi.fn(() => users),
    createUser: vi.fn((input) => ({ id: '3', ...input })),
    updateUser: vi.fn((id, input) => ({ id, ...input })),
    deleteUser: vi.fn(() => true)
  },
  postAPI: {
    getPost: vi.fn((id) => posts.find(post => post.id === id)),
    getAllPosts: vi.fn(() => posts),
    getPostsByAuthor: vi.fn((authorId) => posts.filter(post => post.authorId === authorId)),
    createPost: vi.fn((input) => ({ id: '4', ...input })),
    updatePost: vi.fn((id, input) => ({ id, ...input })),
    deletePost: vi.fn(() => true)
  }
});
```

## Testing TypeORM Integration

Testing TypeORM integration requires mocking the TypeORM data source:

```typescript
// test/typeorm/modelSchema.test.ts
import { modelSchema } from '@kiwano/typeorm';
import { describe, it, expect, vi } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../src/entities/User';

describe('Model Schema', () => {
  it('should create a model schema', async () => {
    // Mock the repository
    const mockRepository = {
      find: vi.fn().mockResolvedValue([
        { id: 1, name: 'User 1', email: 'user1@example.com' },
        { id: 2, name: 'User 2', email: 'user2@example.com' }
      ]),
      findOne: vi.fn().mockResolvedValue({
        id: 1, name: 'User 1', email: 'user1@example.com'
      }),
      save: vi.fn().mockImplementation(entity => entity),
      delete: vi.fn().mockResolvedValue({ affected: 1 })
    };
    
    // Mock the data source
    const mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository)
    } as unknown as DataSource;
    
    // Create a model schema
    const userSchema = modelSchema(User, mockDataSource)
      .all()
      .find()
      .create()
      .update()
      .delete();
    
    const graphQLSchema = await userSchema.build();
    
    expect(graphQLSchema).toBeDefined();
    expect(graphQLSchema.getType('User')).toBeDefined();
    expect(graphQLSchema.getQueryType().getFields().users).toBeDefined();
    expect(graphQLSchema.getQueryType().getFields().user).toBeDefined();
    expect(graphQLSchema.getMutationType().getFields().createUser).toBeDefined();
    expect(graphQLSchema.getMutationType().getFields().updateUser).toBeDefined();
    expect(graphQLSchema.getMutationType().getFields().deleteUser).toBeDefined();
  });
});
```

## Testing Plugins

Testing plugins requires mocking the plugin behavior:

```typescript
// test/plugins/filter.test.ts
import { schema, equalsFilterPlugin } from '@kiwano/core';
import { describe, it, expect } from 'vitest';
import { execute, parse } from 'graphql';

describe('Equals Filter Plugin', () => {
  it('should add a filter argument to a query', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
        .field('email', 'String')
      )
      .query('users', '[User]', _ => _
        .use(equalsFilterPlugin())
        .resolver((_, { filter }) => {
          const users = [
            { id: '1', name: 'User 1', email: 'user1@example.com' },
            { id: '2', name: 'User 2', email: 'user2@example.com' }
          ];
          
          if (filter) {
            return users.filter(user => {
              for (const [key, value] of Object.entries(filter)) {
                if (value !== undefined && user[key] !== value) {
                  return false;
                }
              }
              return true;
            });
          }
          
          return users;
        })
      );
    
    const graphQLSchema = await testSchema.build();
    
    const query = `
      query {
        users(filter: { name: "User 1" }) {
          id
          name
          email
        }
      }
    `;
    
    const result = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: {}
    });
    
    expect(result.errors).toBeUndefined();
    expect(result.data.users).toHaveLength(1);
    expect(result.data.users[0]).toEqual({
      id: '1',
      name: 'User 1',
      email: 'user1@example.com'
    });
  });
});
```

## Testing Error Handling

Testing error handling ensures that your API handles errors correctly:

```typescript
// test/errors/errors.test.ts
import { schema, NotFoundError } from '@kiwano/core';
import { describe, it, expect } from 'vitest';
import { execute, parse } from 'graphql';

describe('Error Handling', () => {
  it('should handle not found errors', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
      )
      .query('user', 'User', _ => _
        .arg('id', 'ID!')
        .resolver((_, { id }) => {
          if (id !== '1') {
            throw new NotFoundError(`User with ID ${id} not found`);
          }
          return { id, name: 'Test User' };
        })
      );
    
    const graphQLSchema = await testSchema.build();
    
    const query = `
      query {
        user(id: "2") {
          id
          name
        }
      }
    `;
    
    const result = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: {}
    });
    
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('User with ID 2 not found');
    expect(result.errors[0].extensions.code).toBe('NOT_FOUND');
  });
});
```

## Testing Authentication and Authorization

Testing authentication and authorization ensures that your API protects sensitive data:

```typescript
// test/auth/auth.test.ts
import { schema, ForbiddenError, UnauthorizedError } from '@kiwano/core';
import { describe, it, expect } from 'vitest';
import { execute, parse } from 'graphql';

describe('Authentication and Authorization', () => {
  it('should require authentication', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
      )
      .query('user', 'User', _ => _
        .arg('id', 'ID!')
        .resolver((_, { id }, context) => {
          if (!context.user) {
            throw new UnauthorizedError('You must be logged in to view users');
          }
          return { id, name: 'Test User' };
        })
      );
    
    const graphQLSchema = await testSchema.build();
    
    const query = `
      query {
        user(id: "1") {
          id
          name
        }
      }
    `;
    
    // Test without authentication
    const resultWithoutAuth = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: {}
    });
    
    expect(resultWithoutAuth.errors).toBeDefined();
    expect(resultWithoutAuth.errors[0].message).toContain('You must be logged in');
    expect(resultWithoutAuth.errors[0].extensions.code).toBe('UNAUTHORIZED');
    
    // Test with authentication
    const resultWithAuth = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: { user: { id: '1', role: 'USER' } }
    });
    
    expect(resultWithAuth.errors).toBeUndefined();
    expect(resultWithAuth.data.user).toEqual({
      id: '1',
      name: 'Test User'
    });
  });
  
  it('should check permissions', async () => {
    const testSchema = schema()
      .object('User', _ => _
        .field('id', 'ID!')
        .field('name', 'String')
        .field('email', 'String', _ => _
          .resolver((user, _, context) => {
            if (context.user.role !== 'ADMIN' && context.user.id !== user.id) {
              throw new ForbiddenError('You do not have permission to view this email');
            }
            return user.email;
          })
        )
      )
      .query('user', 'User', _ => _
        .arg('id', 'ID!')
        .resolver((_, { id }) => {
          return { id, name: 'Test User', email: 'test@example.com' };
        })
      );
    
    const graphQLSchema = await testSchema.build();
    
    const query = `
      query {
        user(id: "1") {
          id
          name
          email
        }
      }
    `;
    
    // Test as admin
    const resultAsAdmin = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: { user: { id: '2', role: 'ADMIN' } }
    });
    
    expect(resultAsAdmin.errors).toBeUndefined();
    expect(resultAsAdmin.data.user).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    // Test as the user
    const resultAsUser = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: { user: { id: '1', role: 'USER' } }
    });
    
    expect(resultAsUser.errors).toBeUndefined();
    expect(resultAsUser.data.user).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    // Test as another user
    const resultAsOtherUser = await execute({
      schema: graphQLSchema,
      document: parse(query),
      contextValue: { user: { id: '3', role: 'USER' } }
    });
    
    expect(resultAsOtherUser.errors).toBeDefined();
    expect(resultAsOtherUser.data.user.email).toBeNull();
    expect(resultAsOtherUser.errors[0].message).toContain('You do not have permission');
    expect(resultAsOtherUser.errors[0].extensions.code).toBe('FORBIDDEN');
  });
});
```

## Test Coverage

Test coverage helps you identify untested parts of your code:

```typescript
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Continuous Integration

Continuous integration ensures that your tests run automatically:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Run coverage
      run: npm run test:coverage
```

## Complete Example

Here's a complete example of testing a Kiwano GraphQL API:

```typescript
// test/setup.ts
import { schema } from '@kiwano/core';
import { ApolloServer } from 'apollo-server';
import { createTestClient } from 'apollo-server-testing';
import { createMockDataSources } from './mocks/dataSources';

// Create a test schema
const createTestSchema = async () => {
  const testSchema = schema()
    .object('User', _ => _
      .field('id', 'ID!')
      .field('name', 'String')
      .field('email', 'String')
      .field('posts', '[Post]', _ => _
        .resolver((user, _, context) => {
          return context.dataSources.postAPI.getPostsByAuthor(user.id);
        })
      )
    )
    .object('Post', _ => _
      .field('id', 'ID!')
      .field('title', 'String')
      .field('content', 'String')
      .field('author', 'User', _ => _
        .resolver((post, _, context) => {
          return context.dataSources.userAPI.getUser(post.authorId);
        })
      )
    )
    .query('user', 'User', _ => _
      .arg('id', 'ID!')
      .resolver((_, { id }, context) => {
        return context.dataSources.userAPI.getUser(id);
      })
    )
    .query('users', '[User]', _ => _
      .resolver((_, __, context) => {
        return context.dataSources.userAPI.getAllUsers();
      })
    )
    .query('post', 'Post', _ => _
      .arg('id', 'ID!')
      .resolver((_, { id }, context) => {
        return context.dataSources.postAPI.getPost(id);
      })
    )
    .query('posts', '[Post]', _ => _
      .resolver((_, __, context) => {
        return context.dataSources.postAPI.getAllPosts();
      })
    )
    .mutation('createUser', 'User', _ => _
      .arg('input', 'CreateUserInput!')
      .resolver((_, { input }, context) => {
        return context.dataSources.userAPI.createUser(input);
      })
    )
    .mutation('updateUser', 'User', _ => _
      .arg('id', 'ID!')
      .arg('input', 'UpdateUserInput!')
      .resolver((_, { id, input }, context) => {
        return context.dataSources.userAPI.updateUser(id, input);
      })
    )
    .mutation('deleteUser', 'Boolean', _ => _
      .arg('id', 'ID!')
      .resolver((_, { id }, context) => {
        return context.dataSources.userAPI.deleteUser(id);
      })
    )
    .inputObject('CreateUserInput', _ => _
      .field('name', 'String!')
      .field('email', 'String!')
    )
    .inputObject('UpdateUserInput', _ => _
      .field('name', 'String')
      .field('email', 'String')
    );
  
  return await testSchema.build();
};

// Create a test client
export const createTestClient = async (context = {}) => {
  const mockDataSources = createMockDataSources();
  
  const server = new ApolloServer({
    schema: await createTestSchema(),
    context: () => ({
      ...context,
      dataSources: mockDataSources
    })
  });
  
  return {
    ...createTestClient(server),
    mockDataSources
  };
};

// test/api.test.ts
import { createTestClient } from './setup';
import { describe, it, expect } from 'vitest';
import { gql } from 'apollo-server';

describe('API', () => {
  it('should fetch a user by ID', async () => {
    const { query, mockDataSources } = await createTestClient();
    
    const USER_QUERY = gql`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;
    
    const result = await query({
      query: USER_QUERY,
      variables: { id: '1' }
    });
    
    expect(result.errors).toBeUndefined();
    expect(result.data.user).toEqual({
      id: '1',
      name: 'User 1',
      email: 'user1@example.com'
    });
    
    expect(mockDataSources.userAPI.getUser).toHaveBeenCalledWith('1');
  });
  
  it('should create a user', async () => {
    const { mutate, mockDataSources } = await createTestClient();
    
    const CREATE_USER_MUTATION = gql`
      mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) {
          id
          name
          email
        }
      }
    `;
    
    const input = {
      name: 'New User',
      email: 'new@example.com'
    };
    
    const result = await mutate({
      mutation: CREATE_USER_MUTATION,
      variables: { input }
    });
    
    expect(result.errors).toBeUndefined();
    expect(result.data.createUser).toEqual({
      id: '3',
      name: 'New User',
      email: 'new@example.com'
    });
    
    expect(mockDataSources.userAPI.createUser).toHaveBeenCalledWith(input);
  });
});
```

## Next Steps

Now that you understand testing, you can explore:

- [Best Practices](best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
