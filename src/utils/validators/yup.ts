/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export const yupTypeFromSwaggerType = (swaggerType: string): string => {
  if (['integer', 'number'].includes(swaggerType)) {
    return 'number'
  }

  return swaggerType
}

export const yupObjectSchemaString = (
  schemaObj: any,
  schemas: Record<string, unknown>
) => {
  const requiredProperties = schemaObj.required as string[]
  const properties = schemaObj.properties as Record<string, unknown>

  return yupObjectValidatorString(properties, requiredProperties, schemas)
}

export const yupArrayValidatorString = (
  schemaName: string,
  schemas: Record<string, unknown>
) => {
  return `Yup.array().of(${yupSchemaValidatorString(
    schemaName,
    schemas
  )}.required())`
}

export const yupEmptyObjectValidatorString = () => {
  return `Yup.object({}).noUnknown()`
}

export const yupArrayNotRefValidatorString = (type: string) => {
  return `Yup.array().of(Yup.${yupTypeFromSwaggerType(type)}().required())`
}

export const yupSchemaValidatorString = (
  name: string,
  schemas: Record<string, unknown>
) => {
  const schemaObj = schemas[name] as Record<string, unknown>
  if (!schemaObj) return ''

  return yupObjectSchemaString(schemaObj, schemas)
}

export const yupObjectValidatorString = (
  properties: Record<string, any>,
  requiredProperties: string[],
  schemas: Record<string, unknown>
) => {
  let validatorString = `Yup.object({`

  for (const prop of Object.keys(properties)) {
    const propDef = properties[prop] as Record<string, any>

    if (propDef.$ref) {
      const schemaPathComponents = (propDef.$ref as string).split('/')
      const schemaName = schemaPathComponents[schemaPathComponents.length - 1]
      validatorString += `${prop}: ${yupSchemaValidatorString(
        schemaName,
        schemas
      )}`
    } else if (propDef.type === 'array') {
      if (propDef.items.$ref) {
        const schemaPathComponents = (propDef.items.$ref as string)?.split('/')
        const schemaName = schemaPathComponents[schemaPathComponents.length - 1]

        if (schemaName) {
          validatorString += `${prop}: Yup.array().of(${yupSchemaValidatorString(
            schemaName,
            schemas
          )}.required())`
        }
      } else if (propDef.items.type) {
        let itemValidator = `Yup.${yupTypeFromSwaggerType(
          propDef.items.type
        )}()`
        if (propDef.items.required) {
          itemValidator += `.required()`
        }

        validatorString += `${prop}: Yup.array().of(${itemValidator}.required())`
      }
    } else {
      validatorString += `${prop}: Yup.${yupTypeFromSwaggerType(
        propDef.type as string
      )}()`
    }

    // eslint-disable-next-line no-prototype-builtins
    if (propDef.hasOwnProperty('default')) {
      const quotes = propDef.type === 'string' ? `"` : ''
      validatorString += `.default(${quotes}${propDef.default}${quotes})`
    }

    // eslint-disable-next-line no-prototype-builtins
    if (propDef.hasOwnProperty('description')) {
      validatorString += `.label("${propDef.description}")`
    }

    // eslint-disable-next-line no-prototype-builtins
    if (propDef.hasOwnProperty('nullable') && propDef.nullable) {
      validatorString += `.nullable()`
    }

    if (requiredProperties?.includes(prop)) {
      validatorString += `.required()`
    }

    validatorString += `,\n`
  }

  validatorString += `})
  .noUnknown()`

  return validatorString
}
