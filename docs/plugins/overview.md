# Plugin System

Kiwano's plugin system allows you to extend the functionality of your GraphQL schema. Plugins can add types, fields, arguments, and more to your schema, making it easy to implement common patterns like filtering, pagination, and access control.

## What are Plugins?

Plugins in Kiwano are objects that hook into the schema building process. They can:

- Add types to your schema
- Add fields to existing types
- Add arguments to fields
- Modify the behavior of fields
- Add middleware to your schema
- And more

## Built-in Plugins

Kiwano comes with several built-in plugins:

### Access Control (ACL)

The ACL plugin allows you to control access to types and fields based on roles:

```typescript
import { schema, aclPlugin } from '@kiwano/core';

const mySchema = schema()
  .use(aclPlugin())
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String', _ => _
      .allow('ADMIN')
      .deny('GUEST')
    )
  );
```

### Filtering

The filtering plugins allow you to add filtering capabilities to your queries:

```typescript
import { schema, equalsFilterPlugin, searchFilterPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin())
    .use(searchFilterPlugin(['name', 'email']))
  );
```

### Pagination

The pagination plugins allow you to add pagination capabilities to your queries:

```typescript
import { schema, offsetLimitPaginationPlugin, relayPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .query('users', '[User]', _ => _
    .use(offsetLimitPaginationPlugin())
  );
```

### Sorting

The sorting plugin allows you to add sorting capabilities to your queries:

```typescript
import { schema, sortPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('createdAt', 'Date')
  )
  .query('users', '[User]', _ => _
    .use(sortPlugin(['name', 'createdAt']))
  );
```

## Using Plugins

You can use plugins at different levels:

### Schema Level

Plugins applied at the schema level affect the entire schema:

```typescript
import { schema, aclPlugin } from '@kiwano/core';

const mySchema = schema()
  .use(aclPlugin());
```

### Type Level

Plugins applied at the type level affect only that type:

```typescript
import { schema, aclPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .use(aclPlugin())
  );
```

### Field Level

Plugins applied at the field level affect only that field:

```typescript
import { schema, equalsFilterPlugin } from '@kiwano/core';

const mySchema = schema()
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin())
  );
```

## Combining Plugins

You can combine multiple plugins to add different capabilities to your schema:

```typescript
import { schema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('createdAt', 'Date')
  )
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['name', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
  );
```

## Plugin Configuration

Most plugins accept configuration options:

```typescript
import { schema, equalsFilterPlugin } from '@kiwano/core';

const mySchema = schema()
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin({
      argumentName: 'filter',
      exclude: ['password'],
      multi: true
    }))
  );
```

## Plugin Inheritance

Plugins applied at a higher level are inherited by lower levels:

```typescript
import { schema, aclPlugin } from '@kiwano/core';

const mySchema = schema()
  .use(aclPlugin()) // Applied to the entire schema
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  );
```

## TypeORM Plugin Extensions

The `@kiwano/typeorm` package provides extensions of the core plugins that integrate with TypeORM:

```typescript
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin())
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

The TypeORM plugins not only add the necessary types and arguments to your schema but also implement the filtering, sorting, and pagination logic in the resolvers.

## Next Steps

Now that you understand the plugin system, you can explore specific plugins:

- [Access Control (ACL)](acl.md): Control access to types and fields
- [Filtering](filtering.md): Add filtering capabilities to your queries
- [Pagination](pagination.md): Add pagination capabilities to your queries
- [Sorting](sorting.md): Add sorting capabilities to your queries
- [Custom Plugins](custom-plugins.md): Create your own plugins
