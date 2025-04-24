# Automatic Type Generation

One of the most powerful features of Kiwano's TypeORM integration is its ability to automatically generate GraphQL types from your TypeORM models. This saves you from having to manually define types that match your database schema.

## How Type Generation Works

When you create a model schema, Kiwano analyzes your TypeORM model's metadata to generate corresponding GraphQL types:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource);
```

Kiwano examines:
- Entity columns
- Relationships
- Column types and nullability
- Primary keys
- Indices

## Type Mapping

Kiwano maps TypeORM column types to GraphQL types using a type mapper. The default type mapper handles common TypeORM types:

| TypeORM Type | GraphQL Type |
|--------------|--------------|
| `number` (primary key) | `ID!` |
| `string` (primary key) | `ID!` |
| `number` | `Int!` or `Float!` |
| `string` | `String!` |
| `boolean` | `Boolean!` |
| `Date` | `Date!` |
| `enum` | Custom enum type |
| `json` | `JSON!` |
| `jsonb` | `JSON!` |

Nullable columns are mapped to nullable GraphQL types (without the `!`).

## Example

Consider this TypeORM model:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Post } from './Post';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  age?: number;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}
```

Kiwano will generate the following GraphQL types:

```graphql
enum UserRole {
  admin
  user
  guest
}

type User {
  id: ID!
  name: String!
  email: String!
  age: Int
  role: UserRole!
  metadata: JSON
  createdAt: Date!
  updatedAt: Date!
  posts: [Post]
}

input CreateUserInput {
  name: String
  email: String
  age: Int
  role: UserRole
  metadata: JSON
}

input UpdateUserInput {
  name: String
  email: String
  age: Int
  role: UserRole
  metadata: JSON
}
```

## Customizing Type Generation

You can customize the generated types in several ways:

### Excluding Fields

You can exclude fields from the generated types:

```typescript
userSchema.entity(_ => _
  .exclude('password')
  .exclude('secretKey')
);
```

### Adding Custom Fields

You can add custom fields to the generated types:

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

### Customizing Input Types

You can customize the generated input types:

```typescript
userSchema
  .createInput(_ => _
    .field('name', 'String!')
    .field('email', 'String!')
    .field('age', 'Int')
    .exclude('role')
  )
  .updateInput(_ => _
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
    .exclude('role')
  );
```

## Custom Type Mapper

You can provide a custom type mapper to control how TypeORM types are mapped to GraphQL types:

```typescript
import { modelSchema, typeMapper as defaultTypeMapper } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

// Create a custom type mapper that extends the default one
const customTypeMapper = {
  ...defaultTypeMapper,
  
  // Override the mapping for specific types
  mapColumn(column) {
    if (column.propertyName === 'email') {
      return { type: 'EmailAddress', nullable: column.isNullable };
    }
    
    // Fall back to the default mapper for other columns
    return defaultTypeMapper.mapColumn(column);
  }
};

// Use the custom type mapper
const userSchema = modelSchema(User, {
  dataSource,
  typeMapper: customTypeMapper
});
```

## Scalar Types

Kiwano automatically adds the necessary scalar types to your schema:

```typescript
import { GraphQLScalarType } from 'graphql';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';

// These scalars are automatically added to your schema
const scalars = {
  Date: DateTimeResolver,
  DateTime: DateTimeResolver,
  JSON: JSONResolver
};
```

You can add custom scalar types to your schema:

```typescript
import { schema } from '@kiwano/core';
import { EmailAddressResolver } from 'graphql-scalars';

const mainSchema = schema()
  .scalar(EmailAddressResolver)
  .merge(userSchema)
  .merge(postSchema);
```

## Handling Relationships

Kiwano automatically handles relationships between entities:

```typescript
// TypeORM models
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  authorId: number;

  @ManyToOne(() => User, user => user.posts)
  author: User;
}
```

The generated GraphQL types will include the relationships:

```graphql
type User {
  id: ID!
  name: String!
  posts: [Post]
}

type Post {
  id: ID!
  title: String!
  authorId: ID!
  author: User
}
```

## Handling Inheritance

Kiwano supports TypeORM's inheritance patterns:

```typescript
// Base entity
@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}

// Derived entity using single table inheritance
@Entity('persons')
@ChildEntity('employee')
export class Employee extends Person {
  @Column()
  salary: number;
}

// Derived entity using single table inheritance
@Entity('persons')
@ChildEntity('customer')
export class Customer extends Person {
  @Column()
  company: string;
}
```

Kiwano will generate appropriate GraphQL types for each entity.

## Complete Example

Here's a complete example of automatic type generation:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// User entity
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  age?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

// Post entity
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column()
  authorId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.posts)
  author: User;
}

// Model schemas
import { schema } from '@kiwano/core';
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';

const userSchema = modelSchema(User, dataSource)
  .entity(_ => _
    .field('fullName', 'String', _ => _
      .resolver(user => `${user.name} (${user.email})`)
    )
  )
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

const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);

// Generated GraphQL schema
/*
type User {
  id: ID!
  name: String!
  email: String!
  age: Int
  createdAt: Date!
  updatedAt: Date!
  posts: [Post]
  fullName: String
}

type Post {
  id: ID!
  title: String!
  content: String!
  authorId: ID!
  createdAt: Date!
  updatedAt: Date!
  author: User
}

input CreateUserInput {
  name: String
  email: String
  age: Int
}

input UpdateUserInput {
  name: String
  email: String
  age: Int
}

input CreatePostInput {
  title: String
  content: String
  authorId: ID
}

input UpdatePostInput {
  title: String
  content: String
  authorId: ID
}

type Query {
  users: [User]
  user(id: ID!): User
  posts: [Post]
  post(id: ID!): Post
}

type Mutation {
  createUser(input: CreateUserInput!): User
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean
  createPost(input: CreatePostInput!): Post
  updatePost(id: ID!, input: UpdatePostInput!): Post
  deletePost(id: ID!): Boolean
}
*/
```

## Next Steps

Now that you understand automatic type generation, you can explore:

- [TypeORM Resolvers](typeorm-resolvers.md): Learn how resolvers are implemented
- [Relationship Handling](relationship-handling.md): Dive deeper into relationship handling
- [TypeORM Plugins](typeorm-plugins.md): Discover TypeORM-specific plugins
- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
