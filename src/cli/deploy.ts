import { info, trace } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { getFacetsAndFunctions, writeFile, writeTemplate } from '../shared/fs.js'
import path from 'node:path'
import { createCommand } from './common.js'

export const command = () =>
  createCommand('deploy', 'Deploy the diamond to a network.')
    .argument('[network]', 'network to deploy to', 'local')
    .action(async args => {
      const ctx = await getContext(args)
      console.log(1234)
    })

  