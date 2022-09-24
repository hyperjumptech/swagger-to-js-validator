import { Validator, validatorFunctions } from '../validator'
import { promises as fs } from 'node:fs'
import { load as yamlLoad } from 'js-yaml'

// returns a capitalized string given a string
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// returns the validator string for the given requestBody schema
export const getRequestBodySchema = (
  requestBody: Record<string, unknown> | null,
  schemas: Record<string, unknown>,
  validator: keyof typeof validatorFunctions
): string => {
  const {
    arrayNotRefValidatorString,
    arrayValidatorString,
    objectSchemaString: schemaString,
    schemaValidatorString,
    emptyObjectValidatorString,
  } = validatorFunctions[validator]

  if (!requestBody) {
    return emptyObjectValidatorString()
  }

  const valuesOfContents = Object.values(requestBody.content || ({} as any))
  const firstSchema = ((valuesOfContents[0] || {}) as any).schema
  if (!firstSchema) {
    return emptyObjectValidatorString()
  }

  if (firstSchema.$ref) {
    /** Example:
          schema:
            $ref: '#/components/schemas/Pet'
       */
    const schemaPathComponents = (firstSchema.$ref as string).split('/')
    const schemaName = schemaPathComponents[schemaPathComponents.length - 1]

    return schemaValidatorString(schemaName, schemas)
  }

  if (firstSchema.type === 'array') {
    /** Example:
          schema:
            type: array
            items:
              $ref: '#/components/schemas/Pet'
       */
    const schemaPathComponents = (firstSchema.items.$ref as string).split('/')
    const schemaName = schemaPathComponents[schemaPathComponents.length - 1]

    if (schemaName) {
      return arrayValidatorString(schemaName, schemas)
    }

    if (firstSchema.items.type) {
      /** Example:
            schema:
              type: array
              items:
                type: string
                default: available
                enum:
                  - available
                  - pending
                  - sold
         */
      return arrayNotRefValidatorString(firstSchema.items.type)
    }
  }

  return schemaString(firstSchema, schemas)
}

export const getPathName = (pathname: string): string => {
  /** Example:
        paths:
          /pet/findByStatus:
  
        will become petFindByStatus
     */
  const names = pathname.split('/').map((pathComp) => {
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

  const pathName = names.join('')

  return pathName
}

export type TemplateVariable = {
  pathName: string
  methods: string
  methodsArray: {
    method: string
    pathName: string
    methodCapitalize: string
  }[]
  methodsArrayMinusLast:
    | {
        method: string
        pathName: string
        methodCapitalize: string
      }[]
    | null
  lastMethod: {
    method: string
    pathName: string
    methodCapitalize: string
  } | null
  methodOptions: string
  validatorMethodSchemas: {
    validatorQuerySchemaName: string
    validatorBodySchemaName: string
    validatorRequestSchemaName: string
    validatorBodySchema: string
    validatorQuerySchema: string
    validatorMethod: any
  }[]
}

export const getTemplateVariables = async (
  swaggerPath: string,
  validator: Validator
): Promise<TemplateVariable[]> => {
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
    const pathName = getPathName(p)

    // get the allowed methods
    const methodArr = Object.keys(paths[p])
    const methods = JSON.stringify(methodArr)

    const validatorMethodSchemas = []

    // loop over the defined HTTP methods
    for (const method of JSON.parse(methods)) {
      const reqBody = paths[p][method].requestBody
      const reqQuery = paths[p][method].parameters?.find(
        (p: any) => p.in && p.in === 'query'
      )

      // the name of the variable for validating the query parameters in the given path and method
      const validatorQuerySchemaName = `validate${pathName}RequestQuery${capitalize(
        method
      )}Schema`

      // the name of the variable for validating the body in the given path and method
      const validatorBodySchemaName = `validate${pathName}RequestBody${capitalize(
        method
      )}Schema`

      // the name of the variable for validating the request (body and query) in the given path and method
      const validatorRequestSchemaName = `validate${pathName}Request${capitalize(
        method
      )}Schema`
      const validatorMethod = method.toUpperCase()

      // the validator code for the body
      const validatorBodySchema = getRequestBodySchema(
        reqBody,
        schemas,
        validator
      )

      // the validator code for the query
      const validatorQuerySchema = getRequestBodySchema(
        reqQuery,
        schemas,
        validator
      )

      validatorMethodSchemas.push({
        validatorQuerySchemaName,
        validatorBodySchemaName,
        validatorRequestSchemaName,
        validatorBodySchema,
        validatorQuerySchema,
        validatorMethod,
      })
    }

    const methodsArray = methodArr.map((m) => {
      return {
        method: m.toUpperCase(),
        pathName,
        methodCapitalize: capitalize(m),
      }
    })
    const methodsArrayMinusLast =
      methodsArray.length > 1 ? [...methodsArray] : null
    const lastMethod = methodsArrayMinusLast
      ? methodsArrayMinusLast.splice(-1)[0]
      : null

    routes.push({
      pathName,
      methods: JSON.stringify(methodArr.map((m) => m.toUpperCase())),
      methodsArray,
      methodsArrayMinusLast,
      lastMethod,
      methodOptions: methodArr.map((m) => `"${m.toUpperCase()}"`).join('|'),
      validatorMethodSchemas,
    })
  }

  return routes
}
