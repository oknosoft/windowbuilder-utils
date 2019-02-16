/**
 * ### Модуль переноса найденных идентификаторов из файла в JSON
 *
 * @module  ids_to_json
 *
 * Created 15.01.2019
 */

'use strict';

const debug = require('debug')('wb:ids_to_json');
const fs = require('fs');
const readline = require('readline');

debug('required');

const yargs = require('yargs')
  .usage('Usage: $0 <command>')
  .demand(1)
  .strict()
  .version('v', 'Show version', '0.0.1').alias('v', 'version')
  .help('h').alias('h', 'help')
  .example('node ids_to_json file [name]', 'Fetch ids from file')
  .command(
    'file [name]',
    'Fetch ids from file `name`',
    yargs => yargs.positional('name', {type: 'string', describe: 'Empty file name'}),
    async args => {
      const { name } = args;
      if (name) {
        try {
          await file_to_json(name)
            .then(json => {
              console.log(JSON.stringify(json));
            })
            .catch(err => {
              console.log(`error fetch ids from ${name}: ${err && err.message}`);
            });
        }
        catch (err) {
          console.log(`error fetch ids from ${name}: ${err && err.message}`);
        }
      }
      else {
        yargs.showHelp();
        process.exit(1);
      }
    }
  )
  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');

const {argv} = yargs;
if (!argv._.length) {
  yargs.showHelp();
  process.exit(1);
}

function file_to_json(name) {
  return new Promise((resolve, reject) => {
    fs.open(name, 'r', (err, fd) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return reject({
            error: true,
            message: 'file does not exist'
          });
        }
      }
      resolve(fs.createReadStream(name, {encoding: 'utf-8'}));
    });
  })
    .then(stream => {
      return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
          input: stream
        });
        
        const regex = /([a-z0-9_.]+\|[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})/g;
        const ids = new Set();
        
        rl.on('line', line => {
          let match;
          while ((match = regex.exec(line)) !== null) {
            ids.add(match[0]);
          }
        });
        
        rl.on('close', () => {
          resolve(ids);
        });
      });
    })
    .then(ids => {
      const json = {items: {}};

      for (const item of ids.keys()) {
        const id = item.split('|');
        if (!json.items[id[0]]) {
          json.items[id[0]] = [];
        }
        json.items[id[0]].push({ref: id[1]});
      }

      return json;
    });
}
