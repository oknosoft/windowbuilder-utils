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
  path[1] = path[1].length === 4 ? 22 : 30000 + parseInt(path[1], 10);
  return ssh.connect({
    host: path[0],
    port: path[1],
    username: SSHUSER || 'root',
    password: SSHPWD,
  })
    .then((ssh) => {
      return ssh.execCommand('service couchdb restart');
    })
    .then((res) => {
      return ssh.dispose();
    })
    .catch((err) => {
      console.error(err);
      return err;
    });
}