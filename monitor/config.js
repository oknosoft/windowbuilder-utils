/**
 * ### Настройки монитора
 * в переменных окружения оставись только пароли
 *
 * @module config
 *
 * Created by Evgeniy Malyarov on 02.05.2019.
 */

module.exports = {
  couchdbs: [
    {url: 'https://c208.oknosoft.com', ssh: 'dh21.oknosoft.ru:30208'},
    {url: 'https://c178.oknosoft.com', ssh: 'dh21.oknosoft.ru:30178'},
    {url: 'https://c180.oknosoft.com', ssh: 'dh21.oknosoft.ru:30180'},
    {url: 'https://c112.oknosoft.com', ssh: 'dh21.oknosoft.ru:30112'},
    {url: 'https://c077.oknosoft.com', ssh: 'dh4.oknosoft.ru:30177'},
    {url: 'https://c183.oknosoft.com', ssh: 'dh4.oknosoft.ru:30183'},
    {url: 'https://c185.oknosoft.com', ssh: 'dh4.oknosoft.ru:30185'},
    {url: 'https://c221.oknosoft.com', ssh: 'dh5.oknosoft.ru:30221'},
    {url: 'https://c211.oknosoft.com', ssh: 'dh5.oknosoft.ru:30211'},
    {url: 'https://c212.oknosoft.com', ssh: 'dh5.oknosoft.ru:30212'},
    {url: 'https://c076.oknosoft.com', ssh: 'dh6.oknosoft.ru:30076'},
    {url: 'https://c181.oknosoft.com', ssh: 'dh6.oknosoft.ru:30181'},
    {url: 'https://c182.oknosoft.com', ssh: 'dh6.oknosoft.ru:30182'},
    {url: 'https://c184.oknosoft.com', ssh: 'dh6.oknosoft.ru:30184'},
  ],
  ign_root: ['c076','c077'],
  repl_users: [{
    src: 'https://c221.oknosoft.com',
    tgt: [
      'https://c212.oknosoft.com',
      'https://c211.oknosoft.com',
      'https://c076.oknosoft.com',
      'https://c181.oknosoft.com',
      'https://c182.oknosoft.com',
      'https://c184.oknosoft.com',
      'https://c077.oknosoft.com',
      'https://c183.oknosoft.com',
      'https://c185.oknosoft.com',
      'https://c178.oknosoft.com',
      'https://c180.oknosoft.com',
      'https://c112.oknosoft.com',
    ]
  }],
  reports: 'https://zakaz.ecookna.ru/r/img/doc.calc_order/6dbe34b0-2263-11ea-b4ce-f7cb551a00b9?glasses',
  reportsssh: 'dh5.oknosoft.ru:30191',
  compact_interval: 3,
}