import chalk from 'chalk'

const prefixLogMsg = (message: string) => `GEMFORGE: ${message}`

export const trace = (message: string) => console.log(chalk.gray(prefixLogMsg(message)))
export const info = (message: string) => console.log(chalk.cyan(prefixLogMsg(message)))
export const success = (message: string) => console.log(chalk.green(prefixLogMsg(message)))
export const error = (message: string) => {
  console.log(chalk.redBright(prefixLogMsg(message)))
  process.exit(-1)
}
export const warn = (message: string) => console.log(chalk.yellow(prefixLogMsg(message)))
