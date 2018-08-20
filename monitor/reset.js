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

module.exports = function reset({name}) {
  const url = new URL(name);
  const ssh = new node_ssh();
  const path = url.host.split(':');
  return ssh.connect({
    host: path[0],
    port: 22,
    username: SSHUSER,
    password: SSHPWD,
  })
    .then((ssh) => {
      return ssh.exec('service couchdb restart');
    })
    .then((res) => {
      return ssh.dispose();
    })
    .catch((err) => {
      return err;
    });
}