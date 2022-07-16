# stjv (swagger-to-js-validator)

This CLI generates request validators based on [OpenAPI 3 schema](https://swagger.io/docs/specification/about/) (previously called Swagger).

**:construction: WARNING: This package is WIP**

|     | Features                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| ✅  | Generate TypeScript functions                                                                                          |
| ✅  | Validate the incoming request's HTTP method                                                                            |
| ✅  | Validate the incoming request's body if any                                                                            |
| ✅  | Generate various validators. Supported validator as of now: [Yup](https://github.com/jquense/yup)                      |
| ✅  | Generate validator functions for various web frameworks. Supported framework as of now: [Next.js](https://nextjs.org/) |

## Installation

```sh-session
npm install @hyperjumptech/sjtv
```

## Usage

First add a script in the package.json to run `stjv` with two arguments: the path to Open API 3 file and the path to the TypeScript file.

```json
"scripts": {
  "generate:ts-validator": "stjv generate <path_to_open_api_3_yaml> <output_path_to_write_ts_file>"
}
```

Next, run the script

```sh-session
npm run generate:ts-validator
```

The command above will generate the TypeScript file which contains the functions to validate the incoming requests. Thus, the `output_path_to_write_ts_file` should be inside your project's directory.

### Next.js API

After runnning the command above, you can use the generated TypeScript file in the API end points of Next.js. The generated function's names are based on the `paths` you defined in the Open API 3 YAML file. For example, say you have the following `paths` in the YAML file:

```yaml
paths:
  /pet:
    put:
      tags:
        - pet
      summary: Update an existing pet
      operationId: updatePet
      requestBody:
        description: Pet object that needs to be added to the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
          application/xml:
            schema:
              $ref: '#/components/schemas/Pet'
        required: true
      responses:
        400:
          description: Invalid ID supplied
          content: {}
        404:
          description: Pet not found
          content: {}
        405:
          description: Validation exception
          content: {}
      security:
        - petstore_auth:
            - write:pets
            - read:pets
      x-codegen-request-body-name: body
    post:
      tags:
        - pet
      summary: Add a new pet to the store
      operationId: addPet
      requestBody:
        description: Pet object that needs to be added to the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
          application/xml:
            schema:
              $ref: '#/components/schemas/Pet'
        required: true
      responses:
        405:
          description: Invalid input
          content: {}
      security:
        - petstore_auth:
            - write:pets
            - read:pets
      x-codegen-request-body-name: body
components:
  schemas:
    Pet:
      required:
        - name
        - photoUrls
      type: object
      properties:
        id:
          type: integer
          format: int64
        category:
          $ref: '#/components/schemas/Category'
        name:
          type: string
          example: doggie
        photoUrls:
          type: array
          xml:
            name: photoUrl
            wrapped: true
          items:
            type: string
        tags:
          type: array
          xml:
            name: tag
            wrapped: true
          items:
            $ref: '#/components/schemas/Tag'
        status:
          type: string
          description: pet status in the store
          enum:
            - available
            - pending
            - sold
      xml:
        name: Pet
```

`stjv` will generate a function called `validatePetRequest` which you can use in the handler of `/api/pet` end point.

```typescript
import { validatePetRequest } from '<output_path_to_write_ts_file>'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const validated = await validatePetRequest(req)

  const validated = await validateMonikaServerBatchRequest(req)
  if (validated.error) {
    return res.status(validated.error.status).send(validated.error.message)
  }

  const validatedBody = await validated.schema.validate(req.body)

  // the validatedBody's type will be based on the Pet schema
  const { name } = validatedBody
}
```

## Commands

<!-- commands -->

- [`stjv generate SWAGGERPATH [TYPESCRIPTOUTPUT]`](#stjv-generate-swaggerpath-typescriptoutput)
- [`stjv help [COMMAND]`](#stjv-help-command)

## `stjv generate SWAGGERPATH [TYPESCRIPTOUTPUT]`

describe the command here

```
USAGE
  $ stjv generate [SWAGGERPATH] [TYPESCRIPTOUTPUT] [--validator yup] [--framework next]

ARGUMENTS
  SWAGGERPATH       path to swagger file
  TYPESCRIPTOUTPUT  path
                    to TypeScript output file

FLAGS
  --framework=<option>  [default: next] Framework target
                        <options: next>
  --validator=<option>  [default: yup] Validator to use
                        <options: yup>

DESCRIPTION
  describe the command here

EXAMPLES
  $ stjv generate
```

_See code: [dist/commands/generate.ts](https://github.com/hyperjumptech/swagger-to-js-validator/blob/v0.0.0/dist/commands/generate.ts)_

## `stjv help [COMMAND]`

Display help for stjv.

```
USAGE
  $ stjv help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for stjv.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `stjv plugins`

List installed plugins.

```
USAGE
  $ stjv plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ stjv plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/index.ts)_

<!-- commandsstop -->

## License

MIT
