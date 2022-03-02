
module.exports = {
  username: process.env.DBUSER || 'eco_couchdb_robot',
  password: process.env.DBPWD || '',
  zone: process.env.ZONE || '21',
  year: process.env.YEAR || '2022',
  source: process.env.SOURCE || 'https://zakaz.ecookna.ru/couchdb/',
  // здесь можно подменить адрес, в том числе - табличным способом
  http(server) {
    return server.http; //'http://cou221:5984/wb_';
  },
  // если указать {purge: true}, база-приёмник будет очищаться перед репликацией
  purge: false,
};