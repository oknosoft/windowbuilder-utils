/**
 * Создаёт файлы эскизов стеклопакетов запрсосм к рендер-сервису
 *
 * @module img_glasses
 *
 * Created by Evgeniy Malyarov on 21.03.2018.
 */

const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const yargs = require('yargs')
  .demand(1)
  .strict()

  .version('v', 'Show version', '0.0.1').alias('v', 'version')

  .help('h').alias('h', 'help')
  .example('node img_glasses url http://...?glasses', 'loading imgs to files')

  .command('url [url]', 'loading imgs', (yargs) => {
    yargs.positional('url', {type: 'string', describe: 'empty url'})
  }, ({url}) => {
    if(url) {
      // получаем ответ сервиса
      fetch(url)
        .then(res => res.json())
        .then(prods => {
          for(const ref in prods) {
            if(prods[ref].imgs) {
              for(const img in prods[ref].imgs) {
                const buf = Buffer.from(prods[ref].imgs[img], 'base64');
                fs.writeFile(`./img/${ref}_${img}.png`, buf, (err) => {
                  if(err) {
                    console.log(err)
                  }
                });
              }
            }
          }
        })
      .catch((err) => console.log(err))
    }
    else {
      yargs.showHelp();
      process.exit(1);
    }
  })

  .epilog('\nMore information about the library: https://github.com/oknosoft/windowbuilder');


const {argv} = yargs;

if(0===argv._.length){
  yargs.showHelp();
  process.exit(1);
}