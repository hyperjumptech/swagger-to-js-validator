# stjv (swagger-to-js-validator)

[![Build & Test](https://github.com/hyperjumptech/swagger-to-js-validator/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/hyperjumptech/swagger-to-js-validator/actions/workflows/main.yml)

## About

This CLI generates request validators based on [OpenAPI 3 schema](https://swagger.io/docs/specification/about/) (previously called Swagger).

## Motivation

stjv was created to prevent you from writing code to validate the requests coming to API end points one by one. You can instead write an OpenAPI file to define the specifications for all the end points of your app, such as what HTTP methods are accepted, required query properties, and also required properties in the body of the request, then let stjv generate the code to validate the incoming requests. **Not only you'll get a nicely documented API, you'll also get the validation code you can use in your API end points**.

So instead of writing

```typescript
// pages/api/pet.ts

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  if (req.method === "POST") {
    if (req.body && req.body.name) {
      // do something
    }
  }
}
```

you can write

```typescript
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  let validated: ValidatedPetRequest;
  try {
    validated = await validatePetRequest(req);
  } catch (error: any) {
    return res.status(error.statusCode ?? 400).json({ error: error.errors });
  }

  // from here on, the validated will be guaranteed to have method, query, and body. Not optional anymore.
}
```


**:construction: WARNING: This package is WIP**

## Features

|  |  |
| --- | ----------- |
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
// pages/api/pet.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ValidatedPetRequest, validatePetRequest } from "../../validation"; // path to the generated TypeScript file

type Response = {
  data?: {
    name: string;
  };
  error?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  let validated: ValidatedPetRequest;
  try {
    validated = await validatePetRequest(req);
  } catch (error: any) {
    return res.status(error.statusCode ?? 400).json({ error: error.errors });
  }

  res.status(200).json({ data: { name: validated.body.name } });
}
```

The generated validation function, e.g., `validatePetRequest`, will throw error when the request validation fails when the incoming request in using GET method, or the incoming body doesn't have `name` property, etc.

The error object will be in the shape of

```typescript
{
  statusCode: number,
  errors: {
    path: string,
    type: string,
    message: string
  }[]
}
```

## License

MIT
