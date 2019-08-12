/*
 * ### Модуль перебора баз данных сервера
 * 
 * - запуск процесса для каждой базы данных
 *
 * @module all_dbs
 *
 * Created 10.08.2019
 */

'use strict';

const fetch = require('node-fetch');
const {exec} = require('child_process');

const yargs = require('yargs')
  .usage('Usage: $0 [options] <command>')
  .demand(1)
  .strict()
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node all_dbs exec echo "Database {0}"', 'Get all databases with execute `echo "Database {0}"`')
  .command(
    'exec [name]',
    'Get all databases with execute `name`',
    yargs => yargs.positional('name', {type: 'string', describe: 'Empty execute name'}),
    args => {
      const {name} = args;
      if(name){
        // инициализируем параметры сеанса и метаданные
        const {COUCHPATH} = process.env;
        const prefix = 'wb_';

        fetch(`${COUCHPATH.replace(prefix, '')}_all_dbs`)
          .then(res => res.json())
          .then(async res => {
            for(const db of res){
              console.log(`${db}`);
              await _exec(name.replace('{0}', db))
                .then(res => {
                  console.log(res);
                })
                .catch(err => {
                  console.error(err);
                });
            }
          })
          .catch(err => {
            console.log(`error fetch dbs: ${err && err.message}`);
          });
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

function _exec(name) {
  return new Promise((resolve, reject) => {
    exec(name, {env: process.env}, (err, stdout, stderr) => {
      if(err){
        return reject(err);
      }
      resolve(stdout);
    });
  });
}
