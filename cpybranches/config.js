
module.exports = {
  username: process.env.DBUSER || 'eco_couchdb_robot',
  password: process.env.DBPWD || '',
  zone: '10',
  year: '2022',
  //source: process.env.SOURCE || 'https://zakaz.ecookna.ru/couchdb/',
  source: process.env.SOURCE || 'https://develop.ecookna.ru/couchdb/',
  // здесь можно подменить адрес, в том числе - табличным способом
  http(server) {
    return server.http; //'http://cou221:5984/wb_';
  },
  // если указать {purge: true}, база-приёмник будет очищаться перед репликацией
  purge: false,
  mode: 'move',
};