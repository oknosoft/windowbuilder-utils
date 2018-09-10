/**
 * выполняет перезапуск сервиса
 *
 * @module reset
 *
 * Created by Evgeniy Malyarov on 20.08.2018.
 */

const {URL} = require('url');
const node_ssh = require('node-ssh');
const {SSHUSER, SSHPWD} = process.env;

module.exports = function reset({name, ssh}) {
  const shell = new node_ssh();
  const path = (ssh || new URL(name).host).split(':');
  path[1] = path[1].length === 4 ? 22 : 30000 + parseInt(path[1], 10);
  return shell.connect({
    host: path[0],
    port: path[1],
    username: SSHUSER || 'root',
    password: SSHPWD,
  })
    .then((shell) => {
      return shell.execCommand(`service ${ssh ? 'supervisor' : 'couchdb'} restart`);
    })
    .then((res) => {
      return shell.dispose();
    })
    .catch((err) => {
      console.error(err);
      return err;
    });
}