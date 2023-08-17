import { ethers } from 'ethers'
import { info, trace } from '../shared/log.js'
import { getContext } from '../shared/context.js'
import { getFacetsAndFunctions, loadJson, writeFile, writeTemplate } from '../shared/fs.js'
import path from 'node:path'
import { createCommand, logSuccess } from './common.js'

export const command = () =>
  createCommand('deploy', 'Deploy the diamond to a network.')
    .argument('[network]', 'network to deploy to', 'local')
    .action(async args => {
      const ctx = await getContext(args)

      const generatedSupportPath = path.resolve(ctx.folder, ctx.config.paths.output.support)

      info('Loading facets.json...')
      const facets = loadJson(`${generatedSupportPath}/facets.json`)

      info('Deploying facets...')

      logSuccess()
    })

  