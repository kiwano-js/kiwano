# Relationship Handling

Kiwano's TypeORM integration provides sophisticated handling of entity relationships. It automatically detects relationships in your TypeORM models and generates the appropriate GraphQL types and resolvers.

## Supported Relationship Types

Kiwano supports all TypeORM relationship types:

- **One-to-One**: A relationship where each entity has exactly one instance of the related entity
- **One-to-Many**: A relationship where one entity has multiple instances of the related entity
- **Many-to-One**: A relationship where multiple entities have one instance of the related entity
- **Many-to-Many**: A relationship where multiple entities have multiple instances of the related entity

## Relationship Detection

When you create a model schema, Kiwano analyzes your TypeORM model's metadata to detect relationships:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource);
```

Kiwano examines:
- Relationship decorators (`@OneToOne`, `@OneToMany`, `@ManyToOne`, `@ManyToMany`)
- Relationship options (eager loading, cascade, etc.)
- Join columns and join tables

## Relationship Mapping

Kiwano maps TypeORM relationships to GraphQL types:

| TypeORM Relationship | GraphQL Type |
|----------------------|--------------|
| `@OneToOne` | Related type |
| `@OneToMany` | Array of related type |
| `@ManyToOne` | Related type |
| `@ManyToMany` | Array of related type |

## Example

Consider these TypeORM models with relationships:

```typescript
// User entity
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];

  @OneToOne(() => Profile, profile => profile.user)
  profile: Profile;

  @ManyToMany(() => Group, group => group.members)
  @JoinTable()
  groups: Group[];
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

  @ManyToOne(() => User, user => user.posts)
  author: User;

  @OneToMany(() => Comment, comment => comment.post)
  comments: Comment[];
}

// Profile entity
@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bio: string;

  @Column()
  userId: number;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  user: User;
}

// Comment entity
@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column()
  postId: number;

  @ManyToOne(() => Post, post => post.comments)
  post: Post;
}

// Group entity
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => User, user => user.groups)
  members: User[];
}
```

Kiwano will generate the following GraphQL types:

```graphql
type User {
  id: ID!
  name: String!
  posts: [Post]
  profile: Profile
  groups: [Group]
}

type Post {
  id: ID!
  title: String!
  content: String!
  authorId: ID!
  author: User
  comments: [Comment]
}

type Profile {
  id: ID!
  bio: String!
  userId: ID!
  user: User
}

type Comment {
  id: ID!
  text: String!
  postId: ID!
  post: Post
}

type Group {
  id: ID!
  name: String!
  members: [User]
}
```

## Relationship Resolvers

Kiwano automatically generates resolvers for relationships:

```typescript
// Entity resolvers for User
class UserEntityResolvers {
  async posts(user, args, context, info) {
    return await this.loadRelation('posts', user, args, context, info);
  }
  
  async profile(user, args, context, info) {
    return await this.loadRelation('profile', user, args, context, info);
  }
  
  async groups(user, args, context, info) {
    return await this.loadRelation('groups', user, args, context, info);
  }
}

// Entity resolvers for Post
class PostEntityResolvers {
  async author(post, args, context, info) {
    return await this.loadRelation('author', post, args, context, info);
  }
  
  async comments(post, args, context, info) {
    return await this.loadRelation('comments', post, args, context, info);
  }
}

// Entity resolvers for Profile
class ProfileEntityResolvers {
  async user(profile, args, context, info) {
    return await this.loadRelation('user', profile, args, context, info);
  }
}

// Entity resolvers for Comment
class CommentEntityResolvers {
  async post(comment, args, context, info) {
    return await this.loadRelation('post', comment, args, context, info);
  }
}

// Entity resolvers for Group
class GroupEntityResolvers {
  async members(group, args, context, info) {
    return await this.loadRelation('members', group, args, context, info);
  }
}
```

## Eager Loading

You can configure eager loading of relationships:

```typescript
const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['posts', 'profile', 'groups'] // Relations to eager load
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['posts', 'profile', 'groups'] // Relations to eager load
    })
  );
```

## Relationship Loading Strategies

Kiwano provides several strategies for loading relationships:

### Lazy Loading

By default, relationships are lazy-loaded, meaning they are loaded only when requested:

```graphql
query {
  users {
    id
    name
    # posts are not loaded
  }
}
```

### Eager Loading

You can configure eager loading of relationships:

```typescript
const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['posts'] // Eager load posts
    })
  );
```

This will load the posts relationship for all users:

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

### Selective Loading

You can selectively load relationships based on the GraphQL query:

```typescript
import { RelationLoader } from '@kiwano/typeorm';

class CustomRelationLoader extends RelationLoader {
  shouldLoadRelation(relationName, parent, args, context, info) {
    // Check if the relation is requested in the GraphQL query
    return this.isRelationRequested(relationName, info);
  }
  
  isRelationRequested(relationName, info) {
    // Check if the relation is requested in the GraphQL query
    const selections = info.fieldNodes[0].selectionSet.selections;
    return selections.some(selection => selection.name.value === relationName);
  }
}

class CustomUserEntityResolvers extends ModelEntityResolvers {
  constructor() {
    super();
    this.relationLoader = new CustomRelationLoader();
  }
}

const userSchema = modelSchema(User, dataSource)
  .entityResolvers(CustomUserEntityResolvers);
```

## Relationship Filtering

You can filter relationships:

```typescript
class CustomUserEntityResolvers extends ModelEntityResolvers {
  async posts(user, args, context, info) {
    // Load posts with custom filtering
    const posts = await this.loadRelation('posts', user, args, context, info);
    
    // Apply custom filtering
    return posts.filter(post => post.isPublished);
  }
}

const userSchema = modelSchema(User, dataSource)
  .entityResolvers(CustomUserEntityResolvers);
```

## Relationship Pagination

You can paginate relationships:

```typescript
class CustomUserEntityResolvers extends ModelEntityResolvers {
  async posts(user, { pagination }, context, info) {
    // Load all posts
    const posts = await this.loadRelation('posts', user, {}, context, info);
    
    // Apply pagination
    if (pagination) {
      const { offset = 0, limit = 10 } = pagination;
      return posts.slice(offset, offset + limit);
    }
    
    return posts;
  }
}

const userSchema = modelSchema(User, dataSource)
  .entity(_ => _
    .field('posts', '[Post]', _ => _
      .arg('pagination', 'OffsetLimitPagination')
    )
  )
  .entityResolvers(CustomUserEntityResolvers);
```

## Relationship Sorting

You can sort relationships:

```typescript
class CustomUserEntityResolvers extends ModelEntityResolvers {
  async posts(user, { sort }, context, info) {
    // Load all posts
    const posts = await this.loadRelation('posts', user, {}, context, info);
    
    // Apply sorting
    if (sort) {
      const { field, direction } = sort;
      return [...posts].sort((a, b) => {
        const aValue = a[field.toLowerCase()];
        const bValue = b[field.toLowerCase()];
        
        if (aValue < bValue) {
          return direction === 'ASC' ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === 'ASC' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return posts;
  }
}

const userSchema = modelSchema(User, dataSource)
  .entity(_ => _
    .field('posts', '[Post]', _ => _
      .arg('sort', 'PostSort')
    )
  )
  .entityResolvers(CustomUserEntityResolvers);
```

## Circular References

Kiwano handles circular references automatically:

```typescript
// User has posts, posts have author (which is a user)
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

Kiwano will generate the appropriate GraphQL types and resolvers, handling the circular reference correctly.

## Complete Example

Here's a complete example of relationship handling:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, OneToOne, ManyToMany, JoinTable, JoinColumn } from 'typeorm';
import { modelSchema, ModelEntityResolvers } from '@kiwano/typeorm';
import { dataSource } from './data-source';

// User entity
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];

  @OneToOne(() => Profile, profile => profile.user)
  profile: Profile;

  @ManyToMany(() => Group, group => group.members)
  @JoinTable()
  groups: Group[];
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

  @ManyToOne(() => User, user => user.posts)
  author: User;
}

// Profile entity
@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bio: string;

  @Column()
  userId: number;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  user: User;
}

// Group entity
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => User, user => user.groups)
  members: User[];
}

// Custom entity resolvers
class CustomUserEntityResolvers extends ModelEntityResolvers {
  async posts(user, args, context, info) {
    // Load posts with custom filtering
    const posts = await this.loadRelation('posts', user, args, context, info);
    
    // Apply custom filtering
    return posts.filter(post => post.isPublished);
  }
}

// Model schemas
const userSchema = modelSchema(User, dataSource)
  .entityResolvers(CustomUserEntityResolvers)
  .all(_ => _
    .resolverOptions({
      relations: ['profile', 'groups'] // Eager load profile and groups
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['profile', 'groups'] // Eager load profile and groups
    })
  )
  .create()
  .update()
  .delete();

const postSchema = modelSchema(Post, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['author'] // Eager load author
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['author'] // Eager load author
    })
  )
  .create()
  .update()
  .delete();

const profileSchema = modelSchema(Profile, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['user'] // Eager load user
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['user'] // Eager load user
    })
  )
  .create()
  .update()
  .delete();

const groupSchema = modelSchema(Group, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['members'] // Eager load members
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['members'] // Eager load members
    })
  )
  .create()
  .update()
  .delete();

// Main schema
import { schema } from '@kiwano/core';

const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema)
  .merge(profileSchema)
  .merge(groupSchema);
```

## Next Steps

Now that you understand relationship handling, you can explore:

- [TypeORM Plugins](typeorm-plugins.md): Discover TypeORM-specific plugins
- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
- [Best Practices](../advanced/best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
