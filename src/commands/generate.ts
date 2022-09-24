import { Command, Flags } from '@oclif/core'
import { promises as fs } from 'node:fs'
import Handlebars from 'handlebars'
import path from 'path'
import prettier from 'prettier'
import { getTemplateVariables } from '../utils/source/swagger'
import { validatorFunctions } from '../utils/validator'

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

    const routes = await getTemplateVariables(swaggerPath, validator)

    // get the template
    const templateString = (
      await fs.readFile(
        // eslint-disable-next-line unicorn/prefer-module
        path.resolve(__dirname, `../../templates/${framework}.ts.handlebars`),
        'utf-8'
      )
    ).toString()

    // compile the template
    const template = Handlebars.compile(templateString, { noEscape: true })
    const result = template({ routes })
    const formatted = prettier.format(result, { parser: 'typescript' })

    // write the TypeScript file to output
    const directory = path.dirname(typescriptOutput)
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(typescriptOutput, formatted)
    this.log(`TypeScript file is created at ${typescriptOutput}`)
  }
}
