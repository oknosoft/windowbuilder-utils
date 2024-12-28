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
const execute = require('./clone');

let queue = Promise.resolve();

for(const abonent in tasks) {
  const {clone, ...other} = tasks[abonent];
  for(const task of clone) {
    queue = queue
      .then(() => execute({...other, ...task}))
      .catch((err) => {
        console.error(err);
      });
  }
}
