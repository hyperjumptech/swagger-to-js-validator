import { Command, Flags } from '@oclif/core'
import { promises as fs } from 'node:fs'
import { load as yamlLoad } from 'js-yaml'
import Handlebars from 'handlebars'
import path from 'path'
import prettier from 'prettier'
import {
  yupArrayNotRefValidatorString,
  yupArrayValidatorString,
  yupObjectSchemaString,
  yupSchemaValidatorString,
} from '../validators/yup'

const validatorFunctions = {
  yup: {
    // function that returns the validator string if array's items' schema is not using $ref
    arrayNotRefValidatorString: yupArrayNotRefValidatorString,
    // function that returns the validator string if array's items' schema is using $ref
    arrayValidatorString: yupArrayValidatorString,
    // function that returns the validator string for object type
    objectSchemaString: yupObjectSchemaString,
    // function that returns the validator string given the name of the schema
    schemaValidatorString: yupSchemaValidatorString,
  },
}

// Helper to use in handlebars template
Handlebars.registerHelper({
  eq: (v1, v2) => v1 === v2,
  ne: (v1, v2) => v1 !== v2,
  lt: (v1, v2) => v1 < v2,
  gt: (v1, v2) => v1 > v2,
  lte: (v1, v2) => v1 <= v2,
  gte: (v1, v2) => v1 >= v2,
  and(...args) {
    return Array.prototype.every.call(args, Boolean)
  },
  or(...args) {
    return Array.prototype.slice.call(args, 0, -1).some(Boolean)
  },
})

// returns a capitalized string given a string
const capitalize = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// returns the validator string for the given requestBody schema
const getRequestBodySchema = (
  requestBody: Record<string, unknown>,
  schemas: Record<string, unknown>,
  validator: keyof typeof validatorFunctions
) => {
  const {
    arrayNotRefValidatorString,
    arrayValidatorString,
    objectSchemaString: schemaString,
    schemaValidatorString,
  } = validatorFunctions[validator]
  const valuesOfContents = Object.values(requestBody.content as any)
  const firstSchema = (valuesOfContents[0] as any).schema

  if (!firstSchema) {
    return ''
  }

  if (firstSchema.$ref) {
    const schemaPathComponents = (firstSchema.$ref as string).split('/')
    const schemaName = schemaPathComponents[schemaPathComponents.length - 1]

    return schemaValidatorString(schemaName, schemas)
  }

  if (firstSchema.type === 'array') {
    const schemaPathComponents = (firstSchema.items.$ref as string).split('/')
    const schemaName = schemaPathComponents[schemaPathComponents.length - 1]

    if (schemaName) {
      return arrayValidatorString(schemaName, schemas)
    }

    if (firstSchema.items.type) {
      return arrayNotRefValidatorString(firstSchema.items.type)
    }
  }

  return schemaString(firstSchema, schemas)
}

export default class Generate extends Command {
  static description =
    'Generate a TypeScript file which contains functions to validate incoming requests.'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    validator: Flags.enum<keyof typeof validatorFunctions>({
      description: 'Validator to use',
      options: ['yup'],
      default: 'yup',
    }),
    framework: Flags.string({
      description: 'Framework target',
      options: ['next'],
      default: 'next',
    }),
  }

  static args = [
    {
      name: 'swaggerPath',
      required: true,
      description: 'path to swagger file',
    },
    {
      name: 'typescriptOutput',
      // eslint-disable-next-line unicorn/prefer-module
      default: path.resolve(__dirname, 'swagger-validator.ts'),
      description: 'path to TypeScript output file',
    },
  ]

  public async run(): Promise<void> {
    const {
      args: { swaggerPath, typescriptOutput },
      flags: { framework, validator },
    } = await this.parse(Generate)

    // read the swagger file
    const swagger = (await fs.readFile(swaggerPath, 'utf8')).toString()
    const yamlSwagger = yamlLoad(swagger)

    // get the paths in the swagger file
    const { paths, components } = yamlSwagger as any

    // get the schemas from components
    const { schemas } = components

    // iterate over the paths
    const routes = []
    for (const p of Object.keys(paths)) {
      // generate the function name based on the path
      const names = p.split('/').map((pathComp) => {
        let toCapitalize = pathComp
        if (pathComp.startsWith('{')) {
          toCapitalize = pathComp.replace('{', '').replace('}', '')
        }

        return [...toCapitalize]
          .map((to, i) => {
            if (i === 0) {
              return to.toUpperCase()
            }

            return to
          })
          .join('')
      })
      const validatorFunctionName = `validate${names.join('')}Request`

      // get the allowed methods
      const methodArr = Object.keys(paths[p])
      const methods = JSON.stringify(methodArr)

      // create the validators
      const validators = []
      for (const method of JSON.parse(methods)) {
        let schemaValidator = ''
        if (paths[p][method].requestBody) {
          const reqBody = paths[p][method].requestBody
          if (reqBody) {
            schemaValidator = getRequestBodySchema(reqBody, schemas, validator)
          }
        }

        if (schemaValidator) {
          validators.push({
            method,
            schemaValidator,
          })
        }
      }

      // don't know how to check if the validators' length is 1 in handlebars, so we do it here
      const singleValidator =
        methodArr.length === 1 && validators.length === 1 ? validators[0] : null

      let shouldReturnTrue = false
      if (methodArr.length > 1 && validators.length <= 1) {
        shouldReturnTrue = true
      }

      // generate the type for the resolved validator function
      const validatorFunctionResolvedReturnType = `export type ${capitalize(
        validatorFunctionName
      )}ResolvedType = Exclude<
      Awaited<ReturnType<typeof ${validatorFunctionName}>>['schema'],
      null | undefined
    >`

      routes.push({
        validatorFunctionName,
        validatorFunctionResolvedReturnType,
        singleMethod: methodArr.length === 1 ? methodArr[0] : null,
        methods,
        singleValidator,
        validators,
        shouldReturnTrue,
      })
    }

    // get the template
    const templateString = (
      await fs.readFile(
        // eslint-disable-next-line unicorn/prefer-module
        path.resolve(__dirname, `../../templates/${framework}.ts.handlebars`),
        'utf-8'
      )
    ).toString()

    // compile the template
    const template = Handlebars.compile(templateString)
    const result = template({ routes })
    const formatted = prettier.format(result, { parser: 'typescript' })

    // write the TypeScript file to output
    const directory = path.dirname(typescriptOutput)
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(typescriptOutput, formatted)
    this.log(`TypeScript file is created at ${typescriptOutput}`)
  }
}
