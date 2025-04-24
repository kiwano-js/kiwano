# Model Schemas

Model schemas in Kiwano are a powerful way to generate GraphQL schemas from TypeORM models. They extend entity schemas with TypeORM-specific functionality, automatically generating types, fields, and resolvers based on your TypeORM models.

## Creating a Model Schema

To create a model schema, use the `modelSchema` function from the `@kiwano/typeorm` package:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource);
```

The `modelSchema` function takes two parameters:
1. The TypeORM model class
2. The TypeORM data source or options object

## Model Schema Options

You can provide additional options when creating a model schema:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, {
  dataSource,
  name: 'CustomUser', // Custom name for the entity
  typeMapper: customTypeMapper // Custom type mapper
});
```

The options object can include:
- `dataSource`: The TypeORM data source
- `name`: A custom name for the entity (defaults to the model's metadata name)
- `typeMapper`: A custom type mapper for mapping TypeORM column types to GraphQL types

## Automatic Type Generation

Model schemas automatically generate GraphQL types based on your TypeORM models:

```typescript
// TypeORM model
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

// Generated GraphQL schema
/*
type User {
  id: ID!
  name: String!
  email: String!
  age: Int
  posts: [Post]
}
*/
```

The type generation follows these rules:
- Primary keys are mapped to `ID!`
- Non-nullable columns are mapped to non-null types (e.g., `String!`)
- Nullable columns are mapped to nullable types (e.g., `String`)
- Relationships are mapped to the corresponding types (e.g., `[Post]` for a one-to-many relationship)

## Customizing the Entity Type

You can customize the generated entity type using the `entity` method:

```typescript
userSchema.entity(_ => _
  .field('id', 'ID!')
  .field('name', 'String')
  .field('email', 'String')
  .field('age', 'Int')
  .field('posts', '[Post]')
  .field('fullName', 'String', _ => _
    .resolver(user => `${user.firstName} ${user.lastName}`)
  )
  .exclude('password') // Exclude the password field
);
```

### Excluding Fields

You can exclude fields from the generated entity type:

```typescript
userSchema.entity(_ => _
  .exclude('password')
  .exclude('secretKey')
);
```

### Adding Custom Fields

You can add custom fields to the generated entity type:

```typescript
userSchema.entity(_ => _
  .field('fullName', 'String', _ => _
    .resolver(user => `${user.firstName} ${user.lastName}`)
  )
  .field('isAdult', 'Boolean', _ => _
    .resolver(user => user.age >= 18)
  )
);
```

### Overriding Fields

You can override the automatically generated fields:

```typescript
userSchema.entity(_ => _
  .field('name', 'String', _ => _
    .description('The user\'s full name')
    .resolver(user => user.name.toUpperCase())
  )
);
```

## Adding CRUD Operations

Model schemas provide methods for adding common CRUD operations:

```typescript
userSchema
  .all()    // Adds a query to fetch all users
  .find()   // Adds a query to find a user by ID
  .create() // Adds a mutation to create a user
  .update() // Adds a mutation to update a user
  .delete() // Adds a mutation to delete a user
  .restore(); // Adds a mutation to restore a deleted user
```

Each of these methods adds the corresponding operation to the schema and automatically implements the resolver using TypeORM.

### All Operation

The `all` operation adds a query to fetch all entities:

```typescript
userSchema.all();
```

This generates a query like:

```graphql
type Query {
  users: [User]
}
```

The resolver for this query fetches all users from the database using TypeORM.

### Find Operation

The `find` operation adds a query to find an entity by ID:

```typescript
userSchema.find();
```

This generates a query like:

```graphql
type Query {
  user(id: ID!): User
}
```

The resolver for this query fetches a user by ID from the database using TypeORM.

### Create Operation

The `create` operation adds a mutation to create an entity:

```typescript
userSchema.create();
```

This generates a mutation like:

```graphql
type Mutation {
  createUser(input: CreateUserInput!): User
}
```

The resolver for this mutation creates a new user in the database using TypeORM.

### Update Operation

The `update` operation adds a mutation to update an entity:

```typescript
userSchema.update();
```

This generates a mutation like:

```graphql
type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User
}
```

The resolver for this mutation updates a user in the database using TypeORM.

### Delete Operation

The `delete` operation adds a mutation to delete an entity:

```typescript
userSchema.delete();
```

This generates a mutation like:

```graphql
type Mutation {
  deleteUser(id: ID!): Boolean
}
```

The resolver for this mutation deletes a user from the database using TypeORM.

### Restore Operation

The `restore` operation adds a mutation to restore a deleted entity (for soft-delete):

```typescript
userSchema.restore();
```

This generates a mutation like:

```graphql
type Mutation {
  restoreUser(id: ID!): User
}
```

The resolver for this mutation restores a deleted user in the database using TypeORM.

## Using Plugins

You can use plugins with model schemas to add additional functionality:

```typescript
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';

userSchema
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['name', 'email', 'age']))
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

The TypeORM plugins not only add the necessary types and arguments to your schema but also implement the filtering, sorting, and pagination logic in the resolvers.

## Customizing Resolvers

Model schemas come with default resolvers for all operations. You can customize these resolvers by extending the resolver classes:

```typescript
import { ModelQueryResolvers, ModelMutationResolvers } from '@kiwano/typeorm';

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
    entity.createdAt = new Date();
    return entity;
  }
}

userSchema
  .queryResolvers(CustomUserQueryResolvers)
  .mutationResolvers(CustomUserMutationResolvers);
```

## Handling Relationships

Model schemas automatically handle relationships between entities:

```typescript
// TypeORM models
@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

@Entity('posts')
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  authorId: number;

  @ManyToOne(() => User, user => user.posts)
  author: User;
}

// Model schemas
const userSchema = modelSchema(User, dataSource)
  .all()
  .find()
  .create()
  .update()
  .delete();

const postSchema = modelSchema(Post, dataSource)
  .all()
  .find()
  .create()
  .update()
  .delete();

// Merge schemas
const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);
```

The generated schema will include the relationships between users and posts, and the resolvers will automatically handle loading the related entities.

## Complete Example

Here's a complete example of using model schemas:

```typescript
import { schema } from '@kiwano/core';
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';
import { Post } from './entities/Post';

// User model schema
const userSchema = modelSchema(User, dataSource)
  .entity(_ => _
    .field('fullName', 'String', _ => _
      .resolver(user => `${user.firstName} ${user.lastName}`)
    )
    .exclude('password')
  )
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['name', 'email', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();

// Post model schema
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

// Main schema
const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);

// Build the schema
const graphQLSchema = await mainSchema.build();
```

## Next Steps

Now that you understand model schemas, you can explore:

- [Automatic Type Generation](automatic-type-generation.md): Learn more about how types are generated from models
- [TypeORM Resolvers](typeorm-resolvers.md): Dive deeper into the resolver system
- [Relationship Handling](relationship-handling.md): Explore how relationships are handled
- [TypeORM Plugins](typeorm-plugins.md): Discover TypeORM-specific plugins
