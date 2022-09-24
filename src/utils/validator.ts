import {
  yupArrayNotRefValidatorString,
  yupArrayValidatorString,
  yupObjectSchemaString,
  yupSchemaValidatorString,
  yupEmptyObjectValidatorString,
} from '../utils/validators/yup'

export type Validator = 'yup'

export const validatorFunctions = {
  yup: {
    // function that returns the validator string if array's items' schema is not using $ref
    arrayNotRefValidatorString: yupArrayNotRefValidatorString,
    // function that returns the validator string if array's items' schema is using $ref
    arrayValidatorString: yupArrayValidatorString,
    // function that returns the validator string for object type
    objectSchemaString: yupObjectSchemaString,
    // function that returns the validator string given the name of the schema
    schemaValidatorString: yupSchemaValidatorString,
    // function that returns the validator for empty object
    emptyObjectValidatorString: yupEmptyObjectValidatorString,
  },
}
