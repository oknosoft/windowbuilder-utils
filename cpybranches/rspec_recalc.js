/**
 * Пересчитывает заказы с изделиями без спецификаций
 *
 * @module index
 *
 * Created by Evgeniy Malyarov on 01.03.2022.
 */

const {username, password, zone, year, source, http, purge} = require('./config');
const problem = require(`./orders_${zone}.json`);
const fetch = require('node-fetch');
const fs = require('fs').promises;

function sleep(time = 100, res) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(res), time);
  });
}

async function main() {
  for(const {branch, suffix, orders} of problem.reverse()) { //
    orders.length && console.log(suffix);
    const rm = [];
    for(const order of orders) {
      await sleep(900);
      const res = await fetch(`http://localhost:3016/prm/doc.calc_order/${order}`, {
        method: 'POST',
        headers: {Authorization: `Basic ${Buffer.from(username + ":" + password).toString('base64')}`},
        body: JSON.stringify({action: 'recalc', branch, force: true}),
      })
        .then((res) => res.json());
      if(res.ref === order) {
        rm.push(order);
      }
    }
    for(const order of rm) {
      const ind = orders.indexOf(order);
      orders.splice(ind, 1);
    }
    await fs.writeFile(require.resolve(`./orders_${zone}.json`), JSON.stringify(problem, null, '\t'), 'utf8');

  }
}

Promise.resolve().then(main);
