#!/usr/bin/env node
import { Command } from 'commander'
import { compileCommand } from './commands/compile'
import { devCommand } from './commands/dev'

const program = new Command()

program
	.name('tsculpt')
	.description('CLI tool for tsculpt 3D mesh generation')
	.version('0.0.0')

program.addCommand(compileCommand)
program.addCommand(devCommand)

program.parse()
