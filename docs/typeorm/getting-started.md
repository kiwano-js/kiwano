# Getting Started with TypeORM Integration

Kiwano provides seamless integration with TypeORM through the `@kiwano/typeorm` package. This integration allows you to automatically generate GraphQL schemas from your TypeORM models, including resolvers for common CRUD operations.

## Installation

First, install the required packages:

```bash
# Using npm
npm install @kiwano/typeorm typeorm graphql-scalars

# Using pnpm (recommended)
pnpm add @kiwano/typeorm typeorm graphql-scalars

# Using yarn
yarn add @kiwano/typeorm typeorm graphql-scalars
```

Make sure you also have the core package installed:

```bash
# Using npm
npm install @kiwano/core

# Using pnpm (recommended)
pnpm add @kiwano/core

# Using yarn
yarn add @kiwano/core
```

## Setting Up TypeORM

Before using Kiwano's TypeORM integration, you need to set up TypeORM in your project:

1. Create a TypeORM data source:

```typescript
// src/data-source.ts
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Post } from './entities/Post';

export const dataSource = new DataSource({
  type: 'postgres', // or any other supported database
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'mydb',
  synchronize: true, // Set to false in production
  logging: true,
  entities: [User, Post],
  migrations: [],
  subscribers: [],
});
```

2. Define your TypeORM entities:

```typescript
// src/entities/User.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BaseEntity } from 'typeorm';
import { Post } from './Post';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  age?: number;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}
```

```typescript
// src/entities/Post.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BaseEntity } from 'typeorm';
import { User } from './User';

@Entity('posts')
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column()
  authorId: number;

  @ManyToOne(() => User, user => user.posts)
  author: User;
}
```

3. Initialize the data source:

```typescript
// src/index.ts
import { dataSource } from './data-source';

async function main() {
  await dataSource.initialize();
  console.log('Data Source has been initialized!');
  
  // Your application code here
}

main().catch(error => console.error('Error during initialization', error));
```

## Creating Model Schemas

Once you have set up TypeORM, you can create model schemas using Kiwano's TypeORM integration:

```typescript
// src/schemas/user-schema.ts
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from '../data-source';
import { User } from '../entities/User';

export function createUserSchema() {
  return modelSchema(User, dataSource)
    .all()
    .find()
    .create()
    .update()
    .delete();
}
```

```typescript
// src/schemas/post-schema.ts
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from '../data-source';
import { Post } from '../entities/Post';

export function createPostSchema() {
  return modelSchema(Post, dataSource)
    .all()
    .find()
    .create()
    .update()
    .delete();
}
```

## Creating the Main Schema

Now you can create the main schema by merging the model schemas:

```typescript
// src/schema.ts
import { schema } from '@kiwano/core';
import { createUserSchema } from './schemas/user-schema';
import { createPostSchema } from './schemas/post-schema';

export async function createSchema() {
  const mainSchema = schema()
    .merge(createUserSchema())
    .merge(createPostSchema());
  
  return await mainSchema.build();
}
```

## Setting Up a GraphQL Server

Finally, you can set up a GraphQL server using your schema:

```typescript
// src/index.ts
import { ApolloServer } from 'apollo-server';
import { dataSource } from './data-source';
import { createSchema } from './schema';

async function main() {
  // Initialize TypeORM
  await dataSource.initialize();
  console.log('Data Source has been initialized!');
  
  // Build the schema
  const graphQLSchema = await createSchema();
  
  // Create Apollo Server
  const server = new ApolloServer({
    schema: graphQLSchema,
    context: () => ({
      dataSource
    })
  });
  
  // Start the server
  const { url } = await server.listen();
  console.log(`🚀 Server ready at ${url}`);
}

main().catch(error => console.error('Error during initialization', error));
```

## Using TypeORM Plugins

The `@kiwano/typeorm` package provides TypeORM-specific versions of the core plugins:

```typescript
// src/schemas/user-schema.ts
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from '../data-source';
import { User } from '../entities/User';

export function createUserSchema() {
  return modelSchema(User, dataSource)
    .all(_ => _
      .use(equalsFilterPlugin())
      .use(sortPlugin(['name', 'email', 'age']))
      .use(offsetLimitPaginationPlugin())
    )
    .find()
    .create()
    .update()
    .delete();
}
```

The TypeORM plugins not only add the necessary types and arguments to your schema but also implement the filtering, sorting, and pagination logic in the resolvers.

## Customizing Model Schemas

You can customize model schemas in various ways:

### Excluding Fields

You can exclude fields from the generated schema:

```typescript
modelSchema(User, dataSource)
  .entity(_ => _
    .exclude('password') // Exclude the password field
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

### Adding Custom Fields

You can add custom fields to the generated schema:

```typescript
modelSchema(User, dataSource)
  .entity(_ => _
    .field('fullName', 'String', _ => _
      .resolver(user => `${user.firstName} ${user.lastName}`)
    )
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

### Customizing Resolvers

You can customize the default resolvers:

```typescript
import { ModelQueryResolvers } from '@kiwano/typeorm';

class CustomUserQueryResolvers extends ModelQueryResolvers {
  async transformAllResponse(response, args, context, info) {
    // Transform the response before returning it
    return response.map(user => ({
      ...user,
      name: user.name.toUpperCase()
    }));
  }
}

modelSchema(User, dataSource)
  .queryResolvers(CustomUserQueryResolvers)
  .all()
  .find()
  .create()
  .update()
  .delete();
```

## Complete Example

Here's a complete example of using Kiwano's TypeORM integration:

```typescript
// src/index.ts
import { ApolloServer } from 'apollo-server';
import { DataSource } from 'typeorm';
import { schema } from '@kiwano/core';
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { User } from './entities/User';
import { Post } from './entities/Post';

async function main() {
  // Create TypeORM data source
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'mydb',
    synchronize: true,
    logging: true,
    entities: [User, Post],
  });
  
  // Initialize TypeORM
  await dataSource.initialize();
  console.log('Data Source has been initialized!');
  
  // Create model schemas
  const userSchema = modelSchema(User, dataSource)
    .all(_ => _
      .use(equalsFilterPlugin())
      .use(sortPlugin(['name', 'email', 'age']))
      .use(offsetLimitPaginationPlugin())
    )
    .find()
    .create()
    .update()
    .delete();
  
  const postSchema = modelSchema(Post, dataSource)
    .all(_ => _
      .use(equalsFilterPlugin())
      .use(sortPlugin(['title', 'createdAt']))
      .use(offsetLimitPaginationPlugin())
    )
    .find()
    .create()
    .update()
    .delete();
  
  // Create main schema
  const mainSchema = schema()
    .merge(userSchema)
    .merge(postSchema);
  
  // Build the schema
  const graphQLSchema = await mainSchema.build();
  
  // Create Apollo Server
  const server = new ApolloServer({
    schema: graphQLSchema,
    context: () => ({
      dataSource
    })
  });
  
  // Start the server
  const { url } = await server.listen();
  console.log(`🚀 Server ready at ${url}`);
}

main().catch(error => console.error('Error during initialization', error));
```

## Next Steps

Now that you understand the basics of Kiwano's TypeORM integration, you can explore:

- [Model Schemas](model-schemas.md): Learn more about model schemas
- [Automatic Type Generation](automatic-type-generation.md): Understand how types are generated from models
- [TypeORM Resolvers](typeorm-resolvers.md): Explore the resolver system
- [Relationship Handling](relationship-handling.md): Learn how relationships are handled
- [TypeORM Plugins](typeorm-plugins.md): Discover TypeORM-specific plugins
