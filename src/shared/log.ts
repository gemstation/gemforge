import chalk from 'chalk'

const prefixLogMsg = (message: string) => `GEMFORGE: ${message}`

let verbose = false
let disabled = false

export const trace = (message: string) => {
  if (disabled) return
  if (verbose) {
    console.log(chalk.gray(prefixLogMsg(message)))
  }
}
export const info = (message: string) => {
  if (disabled) return
  console.log(chalk.cyan(prefixLogMsg(message)))
}
export const warn = (message: string) => {
  if (disabled) return  
  console.log(chalk.yellow(prefixLogMsg(message)))
}
export const error = (message: string): any => {
  console.log(chalk.redBright(prefixLogMsg(message)))
  process.exit(-1)
}

export const enableVerboseLogging = () => {
  verbose = true
}

export const disableLogging = () => {
  disabled = true
}
