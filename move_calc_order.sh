#
# Перенос списка заказов из файла
#
# Формат файла: номера заказов разделены символом перехода новой строки
#

#export DEBUG=wb:*,-not_this
#export ZONE=21
#export DBPWD=admin
#export DBUSER=admin
#export COUCHPATH=http://cou221:5984/wb_
#export DBUSERDST=admin
#export DBPWDDST=admin
#export COUCHPATHDST=http://cou221:5984/wb_

while read LINE; do
    # удаляем символ перехода на новую строку и передаем в скрипт
    node ./move_calc_order.js number_doc $(echo -e "$LINE" | sed 's/\n//g')
done < $1
