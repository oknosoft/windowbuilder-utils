/**
 * Показывает фрагмент лога по запросу http
 *
 * @module show_log
 *
 * Created by Evgeniy Malyarov on 25.04.2019.
 */

const Koa = require('koa');
const fs = require('fs');
const fetch = require('node-fetch');
const lineReader = require('reverse-line-reader');
const port = 3013; // слушаем порт 3013
const limit = 100; // по умолчанию, показываем 100 последних записей
//const path = '/var/log/supervisor/monitor.';
const path = 'D:\\\\TEMP\\monitor.';

// для проверки авторизованности, бежим по всем серверам
async function isAuthorised({authorization}, servers) {

  if(!authorization) {
    return false;
  }

  let res = Promise.resolve();
  let is_auth;

  for (const server of servers) {
    if(!server.url) {
      continue;
    }

    res = res.then(() => new Promise((resolve, reject) => {
      if(is_auth) {
        return resolve(is_auth);
      }

      fetch(`${server.url}/_session`, {
        credentials: 'include',
        headers: {Accept: 'application/json', authorization},
      })
        .then(res => res.json())
        .then(({ok, userCtx}) => {
          if(ok && (userCtx.roles.includes('_admin') || userCtx.roles.includes('doc_full'))) {
            is_auth = true;
            resolve(is_auth);
          }
        })
        .catch(() => resolve(is_auth));
    }));
  }
  return res;
}

module.exports = function (servers) {

  const app = new Koa();

  app.use(async ctx => {
    if(await isAuthorised(ctx.req.headers, servers)) {

      // read 10 log lines:
      const res = {
        out: [],
        err: []
      };

      for(const area of 'out,err'.split(',')) {
        let counter = 0;
        await lineReader.eachLine(`${path}${area}.log`, (line) => {
          if(line) {
            counter++;
            res[area].push(line);
            if(counter > 10) {
              return false;
            }
          }
        });
      }

      ctx.body = res;
    }
    else {
      ctx.throw(403, 'access denied');
    }
  });

  app.listen(port);
};