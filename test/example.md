# given input query with named parameters

it should build corresponding query with `?` placeholders and fill array of parameres from input object

```js
  var compile = require('..')();

  var query = 'Select users.json,EXISTS(Select 1 from moderators where moderators.id = :id) as is_moderator from users where users.id = :id and users.status = :status and users.complete_status = :complete_status';

  compile(query, {id: 123, status: 'Yes!', complete_status: 'No!'})
    .should.eql([ 'Select users.json,EXISTS(Select 1 from moderators where moderators.id = ?) as is_moderator from users where users.id = ? and users.status = ? and users.complete_status = ?',
 [ 123, 123, 'Yes!', 'No!' ] ]);
```
