# Creating Custom Plugins

Kiwano's plugin system is extensible, allowing you to create custom plugins to add specific functionality to your GraphQL schema. This guide will show you how to create your own plugins.

## Plugin Interface

A Kiwano plugin is an object that implements the `Plugin` interface:

```typescript
import { Plugin } from '@kiwano/core';

interface Plugin {
  // Schema hooks
  beforeFinalizeSchema?: (schema: SchemaBuilder) => OptionalPromise;
  afterFinalizeSchema?: (schema: SchemaBuilder) => OptionalPromise;
  beforeBuildSchema?: (schema: SchemaBuilder, rootSchema: SchemaBuilder) => void;
  afterBuildSchema?: (schema: SchemaBuilder, graphQLSchema: GraphQLSchema, rootSchema: SchemaBuilder) => void;
  beforeBuild?: (schema: SchemaBuilder) => void;
  afterBuild?: (schema: SchemaBuilder, graphQLSchema: GraphQLSchema) => void;
  
  // Object type hooks
  beforeFinalizeObjectType?: (builder: ObjectTypeBuilder, context: FinalizeContext) => OptionalPromise;
  afterFinalizeObjectType?: (builder: ObjectTypeBuilder, context: FinalizeContext) => OptionalPromise;
  beforeBuildObjectType?: (builder: ObjectTypeBuilder, context: BuildContext) => void;
  afterBuildObjectType?: (builder: ObjectTypeBuilder, objectType: GraphQLObjectType, context: BuildContext) => void;
  
  // Input object type hooks
  beforeFinalizeInputObjectType?: (builder: InputObjectTypeBuilder, context: FinalizeContext) => OptionalPromise;
  afterFinalizeInputObjectType?: (builder: InputObjectTypeBuilder, context: FinalizeContext) => OptionalPromise;
  beforeBuildInputObjectType?: (builder: InputObjectTypeBuilder, context: BuildContext) => void;
  afterBuildInputObjectType?: (builder: InputObjectTypeBuilder, inputObjectType: GraphQLInputObjectType, context: BuildContext) => void;
  
  // Field hooks
  beforeFinalizeField?: (builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo) => OptionalPromise;
  afterFinalizeField?: (builder: FieldBuilder, context: FinalizeContext, info: FieldBuilderInfo) => OptionalPromise;
  beforeBuildField?: (builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) => void;
  afterBuildField?: (builder: FieldBuilder, field: GraphQLField<any, any>, context: BuildContext, info: FieldBuilderInfo) => void;
  
  // Input field hooks
  beforeFinalizeInputField?: (builder: InputFieldBuilder, context: FinalizeContext, info: InputFieldBuilderInfo) => OptionalPromise;
  afterFinalizeInputField?: (builder: InputFieldBuilder, context: FinalizeContext, info: InputFieldBuilderInfo) => OptionalPromise;
  beforeBuildInputField?: (builder: InputFieldBuilder, context: BuildContext, info: InputFieldBuilderInfo) => void;
  afterBuildInputField?: (builder: InputFieldBuilder, field: GraphQLInputField, context: BuildContext, info: InputFieldBuilderInfo) => void;
  
  // Enum type hooks
  beforeFinalizeEnumType?: (builder: EnumTypeBuilder, context: FinalizeContext) => OptionalPromise;
  afterFinalizeEnumType?: (builder: EnumTypeBuilder, context: FinalizeContext) => OptionalPromise;
  beforeBuildEnumType?: (builder: EnumTypeBuilder, context: BuildContext) => void;
  afterBuildEnumType?: (builder: EnumTypeBuilder, enumType: GraphQLEnumType, context: BuildContext) => void;
  
  // Union type hooks
  beforeFinalizeUnionType?: (builder: UnionTypeBuilder, context: FinalizeContext) => OptionalPromise;
  afterFinalizeUnionType?: (builder: UnionTypeBuilder, context: FinalizeContext) => OptionalPromise;
  beforeBuildUnionType?: (builder: UnionTypeBuilder, context: BuildContext) => void;
  afterBuildUnionType?: (builder: UnionTypeBuilder, unionType: GraphQLUnionType, context: BuildContext) => void;
}
```

You don't need to implement all of these methods. Just implement the ones you need for your plugin.

## Basic Plugin Structure

Here's a basic structure for a custom plugin:

```typescript
import { Plugin, FieldBuilder, BuildContext, FieldBuilderInfo } from '@kiwano/core';

export interface MyPluginOptions {
  // Plugin options
  argumentName?: string;
  // ...
}

export class MyPlugin implements Plugin {
  protected _options: MyPluginOptions;
  
  constructor(options?: MyPluginOptions) {
    this._options = {
      argumentName: 'myArg',
      ...options
    };
  }
  
  // Plugin methods
  beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {
    // Add an argument to the field
    builder.arg(this._options.argumentName, 'String');
  }
}

export function myPlugin(options?: MyPluginOptions): MyPlugin {
  return new MyPlugin(options);
}

export default myPlugin;
```

## Plugin Examples

Let's look at some examples of custom plugins:

### Logging Plugin

A simple plugin that logs schema building events:

```typescript
import { Plugin, SchemaBuilder, GraphQLSchema } from '@kiwano/core';

export class LoggingPlugin implements Plugin {
  beforeBuild(schema: SchemaBuilder) {
    console.log(`Building schema: ${schema.name}`);
  }
  
  afterBuild(schema: SchemaBuilder, graphQLSchema: GraphQLSchema) {
    console.log(`Schema built: ${schema.name}`);
    console.log(`Types: ${Object.keys(graphQLSchema.getTypeMap()).length}`);
  }
}

export function loggingPlugin(): LoggingPlugin {
  return new LoggingPlugin();
}

export default loggingPlugin;
```

Usage:

```typescript
import { schema } from '@kiwano/core';
import { loggingPlugin } from './loggingPlugin';

const mySchema = schema()
  .use(loggingPlugin())
  // ...
```

### Timestamp Plugin

A plugin that adds `createdAt` and `updatedAt` fields to object types:

```typescript
import { Plugin, ObjectTypeBuilder, FinalizeContext } from '@kiwano/core';

export interface TimestampPluginOptions {
  createdAtField?: string;
  updatedAtField?: string;
}

export class TimestampPlugin implements Plugin {
  protected _options: TimestampPluginOptions;
  
  constructor(options?: TimestampPluginOptions) {
    this._options = {
      createdAtField: 'createdAt',
      updatedAtField: 'updatedAt',
      ...options
    };
  }
  
  beforeFinalizeObjectType(builder: ObjectTypeBuilder, context: FinalizeContext) {
    // Add timestamp fields to the object type
    builder
      .field(this._options.createdAtField, 'Date', _ => _
        .description('The date and time when the entity was created')
      )
      .field(this._options.updatedAtField, 'Date', _ => _
        .description('The date and time when the entity was last updated')
      );
  }
}

export function timestampPlugin(options?: TimestampPluginOptions): TimestampPlugin {
  return new TimestampPlugin(options);
}

export default timestampPlugin;
```

Usage:

```typescript
import { schema } from '@kiwano/core';
import { timestampPlugin } from './timestampPlugin';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .use(timestampPlugin())
  );
```

### Validation Plugin

A plugin that adds validation to input fields:

```typescript
import { Plugin, InputFieldBuilder, FinalizeContext, InputFieldBuilderInfo } from '@kiwano/core';

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface ValidationPluginOptions {
  rules?: Record<string, ValidationRule[]>;
}

export class ValidationPlugin implements Plugin {
  protected _options: ValidationPluginOptions;
  protected _rules: Map<string, ValidationRule[]> = new Map();
  
  constructor(options?: ValidationPluginOptions) {
    this._options = {
      ...options
    };
    
    if (options?.rules) {
      for (const [fieldName, rules] of Object.entries(options.rules)) {
        this._rules.set(fieldName, rules);
      }
    }
  }
  
  rule(fieldName: string, rule: ValidationRule): this {
    if (!this._rules.has(fieldName)) {
      this._rules.set(fieldName, []);
    }
    this._rules.get(fieldName).push(rule);
    return this;
  }
  
  beforeFinalizeInputField(builder: InputFieldBuilder, context: FinalizeContext, info: InputFieldBuilderInfo) {
    const rules = this._rules.get(builder.name);
    if (rules) {
      // Add validation rules to the field
      builder.extension('validationRules', rules);
    }
  }
}

export function validationPlugin(options?: ValidationPluginOptions): ValidationPlugin {
  return new ValidationPlugin(options);
}

export default validationPlugin;
```

Usage:

```typescript
import { schema } from '@kiwano/core';
import { validationPlugin } from './validationPlugin';

const mySchema = schema()
  .inputObject('UserInput', _ => _
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
    .use(validationPlugin()
      .rule('name', {
        validate: value => value && value.length >= 2,
        message: 'Name must be at least 2 characters long'
      })
      .rule('email', {
        validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Email must be a valid email address'
      })
      .rule('age', {
        validate: value => value >= 18,
        message: 'Age must be at least 18'
      })
    )
  );
```

## Plugin Composition

You can create a plugin that combines multiple plugins:

```typescript
import { Plugin, MultiPlugin } from '@kiwano/core';
import { timestampPlugin } from './timestampPlugin';
import { validationPlugin } from './validationPlugin';

export function entityPlugin(): Plugin {
  return new MultiPlugin([
    timestampPlugin(),
    validationPlugin()
      .rule('name', {
        validate: value => value && value.length >= 2,
        message: 'Name must be at least 2 characters long'
      })
      .rule('email', {
        validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Email must be a valid email address'
      })
  ]);
}

export default entityPlugin;
```

Usage:

```typescript
import { schema } from '@kiwano/core';
import { entityPlugin } from './entityPlugin';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .use(entityPlugin())
  );
```

## Plugin with Middleware

You can create a plugin that adds middleware to your schema:

```typescript
import { Plugin, SchemaBuilder, Middleware } from '@kiwano/core';

export interface AuthPluginOptions {
  headerName?: string;
}

export class AuthPlugin implements Plugin {
  protected _options: AuthPluginOptions;
  protected _middleware: Middleware;
  
  constructor(options?: AuthPluginOptions) {
    this._options = {
      headerName: 'Authorization',
      ...options
    };
    
    this._middleware = async (resolve, root, args, context, info) => {
      // Check if the user is authenticated
      if (!context.user) {
        throw new Error('Unauthorized');
      }
      
      return resolve(root, args, context, info);
    };
  }
  
  beforeFinalizeSchema(schema: SchemaBuilder) {
    // Add middleware to the schema
    schema.use(this._middleware);
  }
}

export function authPlugin(options?: AuthPluginOptions): AuthPlugin {
  return new AuthPlugin(options);
}

export default authPlugin;
```

Usage:

```typescript
import { schema } from '@kiwano/core';
import { authPlugin } from './authPlugin';

const mySchema = schema()
  .use(authPlugin())
  // ...
```

## Publishing Your Plugin

If you want to share your plugin with others, you can publish it as an npm package:

1. Create a new npm package:
   ```bash
   mkdir kiwano-plugin-myplugin
   cd kiwano-plugin-myplugin
   npm init
   ```

2. Install dependencies:
   ```bash
   npm install @kiwano/core --save-peer
   npm install typescript --save-dev
   ```

3. Create a `tsconfig.json` file:
   ```json
   {
     "compilerOptions": {
       "target": "es2018",
       "module": "commonjs",
       "declaration": true,
       "outDir": "./dist",
       "strict": true,
       "esModuleInterop": true
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. Create your plugin in the `src` directory:
   ```typescript
   // src/index.ts
   import { Plugin } from '@kiwano/core';
   
   export interface MyPluginOptions {
     // Plugin options
   }
   
   export class MyPlugin implements Plugin {
     // Plugin implementation
   }
   
   export function myPlugin(options?: MyPluginOptions): MyPlugin {
     return new MyPlugin(options);
   }
   
   export default myPlugin;
   ```

5. Add build scripts to `package.json`:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "prepublishOnly": "npm run build"
     }
   }
   ```

6. Build and publish:
   ```bash
   npm run build
   npm publish
   ```

## Next Steps

Now that you know how to create custom plugins, you can explore:

- [TypeORM Integration](../typeorm/getting-started.md): Connect your schema to a database with TypeORM
- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
- [Best Practices](../advanced/best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
