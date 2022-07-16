import { expect, test } from '@oclif/test'
import fs from 'fs'
import path from 'path'

describe('generate', () => {
  test
    .stdout()
    .command([
      'generate',
      path.resolve('./examples/swagger/pet-store.yaml'),
      path.resolve('./tmp/swagger.ts'),
    ])
    .it('generate correct TypeScript file', () => {
      const generated = fs
        .readFileSync(path.resolve('./tmp/swagger.ts'), 'utf-8')
        .toString()
      const expected = fs
        .readFileSync(
          path.resolve('./test/commands/swagger.ts.expected'),
          'utf-8'
        )
        .toString()
      expect(generated === expected, 'Generated TypeScript file is not correct')
    })
})
