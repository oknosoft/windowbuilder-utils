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
 * MAILUSER support@oknosoft.ru
 * MAILPWD xxx
 * MAILTO info@oknosoft.ru
 * MAILCC shirokov@ecookna.ru,nmivan@oknosoft.ru
 * SSHUSER root
 * SSHPWD xxx
 */

const PouchDB = require('../pouchdb');
const fs = require('fs');
const {CronJob} = require('cron');
const mailer = require('./mailer');
const reset = require('./reset');
const repl_users = require('./repl_users');
const reindexer = require('./reindexer');
const log_err = require('./log_err');
const config = require('./config');
const {DBUSER, DBPWD} = process.env;

// массив серверов COUCHDB
const servers = config.couchdbs.map((url) => ({url, errors: {}}));
// подмешиваем сюда другие серверы
servers.push({http: config.reports, ssh: config.reportsssh, errors: {}});

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
  return servers.reduce((sum, server) => {
    return sum.then(() => {
      const db = new PouchDB(server.url || 'http://localhost', {
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
          check.method(db, server).then((res) => {
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
  }, Promise.resolve())
    .then(() => {
      // дополнительные регламентные задачи
      repl_users(servers);
    });
}

/**
 * Анализирует errors внутри servers и предпринимает действия
 */
function monitor() {
  let text = '';
  const reboot = new Set();
  const srvs = new Set();
  servers.forEach((server) => {
    const parts = (server.url || server.ssh).replace(/^(.*)\/\//, '').replace(/\./g, ':').split(':');
    srvs.add(`${parts[0]}:${parts[parts.length-1]}`);
  })

  log_err({monitor: Array.from(srvs).sort().join(', '), log: true});

  for(const server of servers) {
    for (const check of checks) {
      if(server.errors[check.name] && server.errors[check.name].length >= check.mail_on) {
        text +=
`time: ${log_err.dateStr()}
server: ${server.url || server.ssh}
check: ${check.name} ${JSON.stringify(server.errors[check.name].map(log_err.hideCredentials))}
-----
`;
        check.reset && reboot.add(server);
      }
    }
  }

  if(text) {
    mailer({text, status: 'error'})
      .then(() => {
        for(const server of servers) {
          for (const check of checks) {
            if(server.errors[check.name] && server.errors[check.name].length) {
              server.errors[check.name].length = 0;
            }
          }
        }
      })
      .catch(log_err);
    for(const server of reboot) {
      reset({name: server.url, ssh: server.ssh});
    }
  }
}

/**
 * Бежит по всем серверам и выполняет обслуживание
 */
function reindex() {
  let res = Promise.resolve();
  for(const {url} of servers) {
    if(url) {
      res = res.then(() => reindexer(url));
    }
  }
  return res.catch(log_err);
}

//repl_users(servers);
//reindex();
//execute();
//monitor();

// подключаем http-интерфейс
require('./show_log')(servers);

log_err({start: 'execute every 2 minute', log: true});
new CronJob('0 */2 * * * *', execute, null, true);
log_err({start: 'monitor every 6 minute', log: true});
new CronJob('0 */6 * * * *', monitor, null, true);
log_err({start: 'reindex every day', log: true});
new CronJob('0 0 1 * * *', reindex, null, true);

