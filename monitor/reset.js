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
const log_err = require('./log_err');

module.exports = function reset({ssh, service}) {
  if(!ssh) {
    return;
  }
  const shell = new node_ssh();
  const path = ssh.split(':');
  path[1] = parseInt(path[1], 10);
  return shell.connect({
    host: path[0],
    port: path[1],
    username: SSHUSER || 'root',
    password: SSHPWD,
  })
    .then((shell) => {
      return shell.execCommand(`service ${service || 'couchdb'} restart`);
    })
    .then((res) => {
      return shell.dispose();
    })
    .catch(log_err);
}