# Getting started

## Installation
Kiwano consists of a core-package and additional optional sub-packages. The core package provides you with all the tools required to create GraphQL schemas. Currently, there is one additional sub-package which enables you to create [Entity schemas](entity-schema/entity-schema.md) for your TypeORM models. See the [TypeORM section](typeorm/getting-started.md) for more details.

**Install Kiwano using NPM:**

`npm install @kiwano/core` OR `npm install kiwano`

**The package for TypeORM support is available via:**

`npm install @kiwano/typeorm`

Of course, you need to make sure to install the `typeorm` package in your project as well.

## Overview
Kiwano lets you create GraphQL schemas programmatically, enabling you to write dynamic and modular schemas, and preventing you from writing repeating declarations. This makes Kiwano an alternative to the GraphQL Definition Language. For example, instead of writing:

```graphql
type Project {
    title: String
    progress: Float
}
```

You would write:

```typescript
schema.object('Project', _ => _
    .field('title', 'String')
    .field('progress', 'Float')
)
```

Kiwano is not a GraphQL runtime library, so it's not a replacement for runtimes like [Express GraphQL](https://github.com/graphql/express-graphql) or [Apollo Server](https://www.apollographql.com/docs/apollo-server/). Instead, use Kiwano to build your schema, and pass this schema to your favourite runtime library in order to serve your GraphQL API.

## Usage
Kiwano is a **progressive framework**, so it's designed to be incrementally adoptable. The most basic usage is to create your schema programmatically, hence manually defining the same types as you would do in the GraphQL definition language.
Optionally, you can also choose to modularize your schema into several components, use plug-ins to decorate your fields or even generate you entire schema and resolvers based on [TypeORM](typeorm/getting-started.md) models.

The steps below gradually make more and more use of Kiwano, it is up to you how many features of the framework you want to use.

### 1. Create schema
The core of Kiwano is the `schema` builder. Your schema contains all object types, fields, enums etc.

We'll create a schema that contains two object types: `User` and `Project`. 
Both types contain basic fields, but `User` also has a relation-field named `projects` which returns the projects of the user.

The `Query` type is automatically added to the schema, we add 3 queries to our schema:
- `users` Returns all users. This field also has an argument named `filter`, so the list of returned users can be filtered using the provided criteria. To facilitate this, an input object-type named `UserFilter` is added to the schema as well.
- `user` Returns one user with the provided ID.
- `projects` Returns all projects.

When a mutation is added to the schema, the `Mutation` type is automatically created as well. 
For now our schema contains one mutation called `createProject`. 
This mutation needs an argument called `input`, which should be of the type `CreateProjectInput` that we'll define as well.

**schema.ts**
```typescript
import { schema } from "@kiwano/core";

export default function(){
    
    return schema()

        .object('User', _ => _
            .field('id', 'ID!')
            .field('name', 'String')
            .field('age', 'Int')
            .field('projects', '[Project]')
        )
    
        .object('Project', _ => _
            .field('id', 'ID!')
            .field('title', 'String')
        )
    
        .inputObject('UserFilter', _ => _
            .field('id', 'ID!')
            .field('name', 'String')
            .field('age', 'Int')
        )
    
        .query('users', '[User]', _ => _
            .arg('filter', 'UserFilter')
        )
    
        .query('user', 'User', _ => _
            .arg('id', 'ID!')
        )
    
        .query('projects', '[Project]')

        .inputObject('CreateProjectInput', _ => _
            .field('title', 'String!')
        )
        
        .mutation('createProject', 'Project', _ => _
            .arg('input', 'CreateProjectInput!')
        )
}
```

> The `schema` function returns a builder which you can use to add members to the schema. Almost every method returns the builder itself, enabling you to chain. 
> Note that the builder is not a GraphQL schema for use in other libraries yet, use the `build` function to generate the GraphQL schema for your configured builder. 
> The use of this `build` method explained later.

> Note that we export a function which returns the schema builder instead of directly exporting the builder.
> This is a Javascript/Typescript convention that enables us to create the schema when we want to, instead of immediately during import.

You may have noticed the weird looking syntax `_ => _`, this is to improve readability. Most methods on the schema allow you to pass a configurator function. 
When you call the `object` method for example, Kiwano creates as object-type builder with the given name and return type. 
This object-type builder is passed to the optional configurator function we provided, which enables you to further configure the object-type. 
You are free to give this argument any name you want, so you could also write like: `schema.query('users', 'User', field => field.list())`. 

> There is another way to configure builders, see [Concepts](basics/concepts.md) for more information.

### 2. Modularize schema
When developing a real API, you can imagine your schema can become quite big.
If you write the entire schema in one file, it will become very large and clumsy.
To solve this, Kiwano enables you to split your schema into smaller **sub-schemas**. 
These sub-schemas can be merged into the main schema to combine all types and fields into one.

Let's update our schema and create a separate one for both entities (`User` and `Project`).

**userSchema.ts**
```typescript
import { schema } from "@kiwano/core";

export default function(){
    
    return schema()

        .object('User', _ => _
            .field('id', 'ID!')
            .field('name', 'String')
            .field('age', 'Int')
            .field('projects', '[Project]')
        )
    
        .inputObject('UserFilter', _ => _
            .field('id', 'ID!')
            .field('name', 'String')
            .field('age', 'Int')
        )
    
        .query('users', '[User]', _ => _
            .arg('filter', 'UserFilter')
        )
    
        .query('user', 'User', _ => _
            .arg('id', 'ID!')
        )
}
```

**projectSchema.ts**
```typescript
import { schema } from "@kiwano/core";

export default function() {

    return schema()

        .object('Project', _ => _
            .field('id', 'ID!')
            .field('title', 'String')
        )

        .inputObject('CreateProjectInput', _ => _
            .field('title', 'String!')
        )
    
        .query('projects', '[Project]')

        .mutation('createProject', 'Project', _ => _
            .arg('input', 'CreateProjectInput!')
        )
}
```

**schema.ts**
```typescript
import { schema } from "@kiwano/core";

import userSchema from './userSchema.ts'
import projectSchema from './projectSchema.ts'

export default function(){
    
    return schema()
        .merge(userSchema())
        .merge(projectSchema())
}
    
```

### 3. Use entity schemas
As you create more and more sub-schemas, you will likely realize that most of these sub-schemas revolve around a particular entity.
That's why Kiwano has a special kind of schema called an **entity schema**.
An entity schema is a schema that contains all types and fields belonging to a particular entity.
By using an entity schema instead of a regular one, Kiwano can help you by automatically configuring fields or objects for you.

> Entity schemas extend from the regular schema, so you can use all methods available in **schema** as well.

Let's update our `userSchema` and `projectSchema` to be entity schemas.

**userSchema.ts**
```typescript
import { entitySchema } from "@kiwano/core";

export default function(){
    
    return entitySchema('User')

        .entity(_ => _
            .field('id', 'ID!')
            .field('name', 'String')
            .field('age', 'Int')
            .field('projects', '[Project]')
        )
    
        .inputObject('UserFilter', _ => _
            .field('id', 'ID!')
            .field('name', 'String')
            .field('age', 'Int')
        )
    
        .all(_ => _
            .arg('filter', 'UserFilter')
        )
    
        .find()
}
```

**projectSchema.ts**
```typescript
import { entitySchema } from "@kiwano/core";

export default function() {

    return entitySchema('Project')

        .entity(_ => _
            .field('id', 'ID!')
            .field('title', 'String')
        )
        
        .all()
        .create()
}
```

By using an **entity schema**, fields like **all** or **find** (`users` or `user`) can be automatically generated.
The only thing you need to do is to provide the name for the entity as argument in the `entitySchema` function, and configure the automatically created entity object type (using the `entity` method).
Now Kiwano can create and configure fields for you, and automatically generate accompanying types like `CreateProjectInput`.
Entity schema extends from the regular schema, so you can use all features of the regular schema as well.

Don't worry, Kiwano is designed to be very **flexible**, so you always remain in control.
The names of the generated fields can always be specified: `.all('allProjects')`, and you can even control a [naming strategy](entity-schema/naming.md) for your entire schema.
When you don't provide a name for a field, like the **all** field for `Project`, the name will be automatically generated (in this case the name will become `projects`).

### 4. Attach resolvers
Until now, we have only created a schema, but without any resolvers.

You can specify your resolvers in two ways: 
- Create separate resolver functions, and specify a resolver per field;
- Bundle resolvers per schema, both for queries and mutations.

If you prefer the first option, you can just add your resolver to a field in the following way:
```typescript
import allProjectsResolver from './resolvers/project/all'

schema.query('projects', '[Project]', _ => _.resolver(allProjectsResolver))
```

However, in our schema we will use the second option. 
Bundling your resolvers helps you to organize your resolvers and to share common functionality.

Let's create resolvers for our `projectSchema`. 
We will create two classes named `ProjectQueryResolvers` and a `ProjectMutationResolvers`.
Resolver classes contain methods corresponding to the fields you want to write a resolver implementation for. 
If you don't specify a method for a particular field, the default GraphQL resolver will be executed instead.

**ProjectQueryResolvers.ts**
```typescript
export default class ProjectQueryResolvers {
    
    projects(){
        // TODO: Implement
    }
}
```

**ProjectMutationResolvers.ts**
```typescript
export default class ProjectMutationResolvers {
    
    createProject(source, { input }){
        // TODO: Implement
    }
}
```

**projectSchema.ts**
```typescript
import { entitySchema } from "@kiwano/core";

import ProjectQueryResolvers from './resolvers/project/ProjectQueryResolvers'
import ProjectMutationResolvers from './resolvers/project/ProjectMutationResolvers'

export default function() {

    return entitySchema('Project')
    
        .queryResolvers(ProjectQueryResolvers)
        .mutationResolvers(ProjectMutationResolvers)

        .entity(_ => _
            .field('id', 'ID!')
            .field('title', 'String')
        )
        
        .all()
        .create()
}
```

For entity schemas you can use the `entityResolvers` method as well, entity resolvers contain methods to resolve fields within the entity object-type. 
For the `User` object type, you could for example create a class named `UserEntityResolvers` with a method called `projects`. 
In this method you can write the code necessary to fetch a user's projects.

> Kiwano automatically adds your resolvers to the schema, so the final built GraphQL schema will contain all resolvers as well.

### 5. Use Plug-ins
Almost every GraphQL API has common features like filtering, sorting or pagination.
These features require types, arguments and fields that are recurring over and over again, requiring you to write the same (similar) code multiple times.
That's why Kiwano provides **plug-ins** which help you to add certain features to your schema in a very easy and fast way.

In our schema, the `users` field has an option to specify a filter. Fortunately, Kiwano provides a plug-in that automatically adds the required input type and argument. 
Let's alter our `userSchema` and use the **equals filter**, which generates an input object-type with all relevant fields from the configured entity object-type, together with an argument that enables API-users to specify a filter in the `users` field.

**userSchema.ts**
```typescript
import { entitySchema, equalsFilterPlugin } from "@kiwano/core";

export default function(){
    
    return entitySchema('User')

        .entity(_ => _
            .field('id', 'ID!')
            .field('name', 'String')
            .field('age', 'Int')
            .field('projects', '[Project]')
        )
    
        .all(_ => _
            .use(equalsFilterPlugin())
        )
    
        .find()
}
```

Again, you are in control of the generated elements. 
You can exclude fields in the entity object-type from the filter, or you can add extra fields.
In this case, an input object-type named `UserEqualsFilter` is automatically generated, containing the `id`, `name` and `age` fields. 
Also, an argument named `filter` is added to the `users` field automatically.

There are many more plug-ins you can use in your schemas, see the [plug-ins](plugins/overview.md) documentation for more information.

> Plug-ins in the core package only add features to your schema, not to your resolvers. 
> This means that you have to write the implementation of the (in this case) filtering yourself.
> However, the TypeORM package also handles the implementation for you, so you don't have to add any resolver code yourself.

### 6. Use TypeORM Model Schemas
If you use TypeORM as your ORM library, you can even let Kiwano handle resolvers as well.
In addition to resolvers, your entity types are automatically generated based on your model. 
The TypeORM package also provides extensions of the core plug-ins, so filtering/sorting/pagination can be handled automatically.

Type TypeORM package provides a **modelSchema** builder, which extends from entitySchema.
Instead of providing the name of your entity in the builder-function, you should pass your model class.

Let's migrate our `userSchema` to be a modelSchema.

> Make sure to install the @kiwano/typeorm package first

**User.ts**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BaseEntity } from "typeorm";
import Project from "./Project";

@Entity('users')
export default class User extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name?: string;

    @Column()
    age?: number;
    
    @OneToMany(() => Project, project => project.user)
    projects: Project[]
}
```

**userSchema.ts**
```typescript
import { modelSchema, equalsFilterPlugin } from "@kiwano/typeorm";
import User from './models/User'

export default function(){
    
    return modelSchema(User)
    
        .all(_ => _
            .use(equalsFilterPlugin())
        )
    
        .find()
}
```

By default, Kiwano adds all fields in your model to your entity object-type, including relations. 
Of course, you can exclude or overwrite fields, read the [model schema](typeorm/model-schema.md) documentation for more info.

This new version of our `userSchema` doesn't need any custom resolvers, everything is handled automatically by Kiwano.
That means that users are automatically fetched from the database, filtering is automatically applied and so on. Even mutations are implemented automatically.

In a real-world GraphQL API you will always need to customize the default resolvers for specific cases.
The TypeORM package provides an `all`, `find`, `create`, `update`, `delete` and `relation` resolver. 

These resolvers are bundled in the `ModelQueryResolvers` and `ModelMutationResolvers` classes, which you can extend to override parts of the default implementation.
In our case we should extend our `UserQueryResolvers` class from the Kiwano `ModelQueryResolvers` class.
Each resolver provides numerous hooks, like `beforeFindQuery` of `transformAllResponse`. 
You can choose to override some of these hooks to override specific parts, and use the default implementation for the remaining parts of the resolver.
Read the [TypeORM resolvers](typeorm/resolvers.md) documentation for more information.

### 7. Build schema & run server
Now our schema is finished, we can build it. 
Every schema provides a `build` method, which turns the Kiwano schema builder into an official GraphQL schema.
This GraphQL schema can be used to pass to any GraphQL runtime library.

First, let's build our schema. 
Remember that we created the **schema.ts** file, which returns a schema that's merged with all sub-schemas.
We only have to build this main schema, because it automatically builds any merged sub-schemas as well.

> Note that the build function returns a Promise, so we'll have to wait for it to be finished.

**Express GraphQL**
```typescript
import express from 'express'
import { graphqlHTTP } from 'express-graphql'
import schema from './schema.ts'

const schemaBuilder = schema();
const graphQLSchema = await schemaBuilder.build();

const app = express();

app.use('/graphql',
  graphqlHTTP({
    schema: graphQLSchema
  })
);

app.listen();
```

**Apollo Server**
```typescript
import { ApolloServer } from 'apollo-server'
import schema from './schema.ts'

const schemaBuilder = schema();
const graphQLSchema = await schemaBuilder.build();

const server = new ApolloServer({
    schema: graphQLSchema
});

server.listen();
```