/*
 * ### Модуль запуска процесса по времени
 *
 * @module cron_exec_process
 *
 * Created 02.07.2019
 */

'use strict';

const { CronJob } = require('cron');
const { exec } = require('child_process');
const moment = require('moment');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(1)
  .strict()
  .alias('i', 'interval').nargs('i', 1).describe('i', 'Interval or the time at which the cron job is needed to run')
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node cron_exec_process job echo "Hi"', 'Execute process with job `echo "Hi"`')
  .command(
    'job [name]',
    'Execute process with job `name`',
    yargs => yargs.positional('name', {type: 'string', describe: 'Empty job name'}),
    args => {
      const { i, name } = args;
      if (name) {
        // по умолчанию каждые 5 минут
        const interval = i || '1 */5 * * * *';

        function exec_process() {
          console.log(`execute at ${moment().format('DD MMMM YYYY, HH:mm:ss')}`);

          exec(name, {env: process.env}, (err, stdout, stderr) => {
            if (err) {
              console.error(err);
              return;
            }
            console.log(stdout);
          });
        }
        
        console.log('cron job started');
        new CronJob(interval, exec_process, null, true);
      }
      else {
        yargs.showHelp();
        process.exit(1);
      }
    }
  )
  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');

const {argv} = yargs;
if(!argv._.length){
  yargs.showHelp();
  process.exit(1);
}
