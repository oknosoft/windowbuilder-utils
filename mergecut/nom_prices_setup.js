/**
 * копирует документы установки цен из doc в ram
 *
 * @module nom_prices_setup
 *
 * Created by Evgeniy Malyarov on 07.01.2022.
 */

const PouchDB = require('pouchdb').plugin(require('pouchdb-find'));
const {DBUSER, DBPWD} = process.env;

src = new PouchDB('http://cou221:5984/wb_21_doc', {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  skip_setup: true,
});

tgt = new PouchDB('http://cou221:5984/wb_21_ram', {
  auth: {
    username: DBUSER,
    password: DBPWD
  },
  adapter: 'http',
});

function by_range({bookmark, step=1, limit=100}) {

  console.log(`doc-->ram: page №${step}`);

  src.find({
    selector: {$or: [
        {
          class_name: 'doc.nom_prices_setup'
        },
        {
          class_name: {$in: ['cat.characteristics', 'doc.calc_order']},
          obj_delivery_state: 'Шаблон',
        },
      ]},
    limit,
    bookmark,
  })
    .then(async(res) => {
      step++;
      bookmark = res.bookmark;
      for(const doc of res.docs) {
        try{
          const tdoc = await tgt.get(doc._id);
        }
        catch (err) {
          await tgt.bulkDocs([doc], {new_edits: false});
        }
      }
      return res.docs.length === limit ? by_range({bookmark, step, limit}) : process.exit(0);
    });
}

by_range({});
