/**
 * Запускает мониторинг серверов по расписанию
 *
 * @module index
 *
 * Created by Evgeniy Malyarov on 20.08.2018.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 * COUCHDBS http://cou221:5984/,http://fl211:5984/
 * MAILUSER support@oknosoft.ru
 * MAILPWD xxx
 * MAILTO info@oknosoft.ru
 * MAILCC shirokov@ecookna.ru,nmivan@oknosoft.ru
 */

const debug = require('debug')('wb:mon');
const PouchDB = require('../pouchdb');
const fs = require('fs');
const {CronJob} = require('cron');
const mailer = require('./mailer');
const reset = require('./reset');

const {DBUSER, DBPWD, COUCHDBS} = process.env;

const servers = (COUCHDBS || '').split(',').map((url) => ({url, errors: {}}));

const checks = (() => {
  const res = [];
  const files = fs.readdirSync(__dirname);
  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    if(/^check_.*\.js$/.test(name)){
      res.push(require(`./${name}`));
    }
  }
  return res.sort((a, b) => a.order - b.order);
})();

/**
 * Выполняет проверки и накапливает результат в errors внутри servers
 */
function execute() {

  // бежим в промисе по серверам
  servers.reduce((sum, server) => {
    return sum.then(() => {
      const db = new PouchDB(server.url, {
        auth: {
          username: DBUSER,
          password: DBPWD
        },
        skip_setup: true,
        ajax: {timeout: 10000}
      });
      let stop;
      return checks.reduce((sum, check) => {
        return stop ? Promise.resolve() : sum.then(() => {
          check.method(db).then((res) => {
            if(!res || !res.ok) {
              if(!server.errors[check.name]) {
                server.errors[check.name] = [];
              }
              server.errors[check.name].push(res);
              if(check.break_on_error) {
                stop = true;
              }
            }
            // если проверка успешна, очищаем стек - случайные ошибки нам не интересны
            else if(server.errors[check.name]) {
              server.errors[check.name].length = 0;
            }
          })
        });
      }, Promise.resolve());
    });
  }, Promise.resolve());
}

/**
 * Анализирует errors внутри servers и предпринимает действия
 */
function monitor() {
  let text = '';
  const reboot = new Set();
  for(const server of servers) {
    for (const check of checks) {
      if(server.errors[check.name] && server.errors[check.name].length >= check.mail_on) {
        text +=
`time: ${new Date().toISOString()}
server: ${server.url}
check: ${check.name} ${JSON.stringify(server.errors[check.name])}
-----
`;
        check.reset && reboot.add(server);
      }
    }
  }

  if(text) {
    mailer({text})
      .then(() => {
        for(const server of servers) {
          for (const check of checks) {
            if(server.errors[check.name] && server.errors[check.name].length) {
              server.errors[check.name].length = 0;
            }
          }
        }
      })
      .catch((err) => debug(err));
    for(const server of reboot) {
      reset({name: server.url});
    }
  }
}

reset({name: servers[0].url});

debug('execute every 2 minute');
new CronJob('1 */1 * * * *', execute, null, true);

debug('monitor every 6 minute');
new CronJob('30 */3 * * * *', monitor, null, true);
