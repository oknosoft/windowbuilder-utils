/**
 * Собирает сводную базу из всех баз сервиса, обрезанных по дате изменения
 * - тянет только последнюю версию
 * - решает проблему "исключить черновики"
 *
 * @module index
 *
 * Created by Evgeniy Malyarov on 31.12.2019.
 */

/**
 * ### Переменные окружения
 * DEBUG "wb:*,-not_this"
 * DBPWD admin
 * DBUSER admin
 */

const {tasks} = require('./config');
const clone = require('./clone');

let queue = Promise.resolve();

for(const abonent in tasks) {
  for(const {src, tgt} of tasks[abonent].clone) {
    queue = queue
      .then(() => clone({src, tgt}))
      .catch((err) => {
        console.log(err);
      });
  }
}



