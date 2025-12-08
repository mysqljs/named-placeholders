'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const compile = require('..')();

describe('given input query with named parameters', () => {
  it('should build corresponding query with `?` placeholders and fill array of parameters from input object', () => {
    let query = 'Select users.json,EXISTS(Select 1 from moderators where moderators.id = :id) as is_moderator from users where users.id = :id and users.status = :status and users.complete_status = :complete_status';

    const result1 = compile(query, {id: 123, status: 'Yes!', complete_status: 'No!'});

    assert.deepEqual(result1, [ 'Select users.json,EXISTS(Select 1 from moderators where moderators.id = ?) as is_moderator from users where users.id = ? and users.status = ? and users.complete_status = ?',
    [ 123, 123, 'Yes!', 'No!' ] ]);

    // from https://github.com/sidorares/named-placeholders/issues/2
    query = 'SELECT * FROM items WHERE id = :id AND deleted = "0000-00-00 00:00:00"';
    const result2 = compile(query, { id: Number(123) })
    assert.deepEqual(result2, [ 'SELECT * FROM items WHERE id = ? AND deleted = "0000-00-00 00:00:00"',
    [ 123 ] ]);

    query = 'SELECT * FROM items WHERE deleted = "0000-00-00 00:00:00" AND id = :id';
    const result3 = compile(query, { id: Number(123) })
    assert.deepEqual(result3, [ 'SELECT * FROM items WHERE deleted = "0000-00-00 00:00:00" AND id = ?',
    [ 123 ] ]);
  });

  it('should throw error when query contains placeholders but parameters object not passed', () => {
    const query = 'test ::p2 test :p1';

    assert.throws(
      () => {
        compile(query);
      },
      /Named query contains placeholders, but parameters object is undefined/
    );
  });

  it('should replace ::name style placeholders with `??` placeholders', () => {
    let query = 'normal placeholder :p1 and double semicolon ::p2';
    assert.deepEqual(compile(query, {p1: 'test1', p2: 'test2'}),
      [ 'normal placeholder ? and double semicolon ??', [ 'test1', 'test2' ] ]);

    query = 'normal placeholder ::p1 and double semicolon :p2';
    assert.deepEqual(compile(query, {p1: 'test1', p2: 'test2'}),
      [ 'normal placeholder ?? and double semicolon ?', [ 'test1', 'test2' ] ]);

    query = 'normal placeholder ::p2 and double semicolon :p1';
    assert.deepEqual(compile(query, {p1: 'test1', p2: 'test2'}),
      [ 'normal placeholder ?? and double semicolon ?', [ 'test2', 'test1' ] ]);

    query = 'normal placeholder :p1 and double semicolon ::p2 test';
    assert.deepEqual(compile(query, {p1: 'test1', p2: 'test2'}),
      [ 'normal placeholder ? and double semicolon ?? test', [ 'test1', 'test2' ] ]);
  });

  it('compiles the query the same twice', () => {
    const query = 'SELECT * FROM foo WHERE id = :id';
    const expected = [ 'SELECT * FROM foo WHERE id = ?', [ 123 ] ];
    assert.deepEqual(compile(query, { id: 123 }), expected);
    assert.deepEqual(compile(query, { id: 123 }), expected);
  });

  it('should handle queries with mixed/nested quotes correctly', () => {
    // Bug fix test: queries with single and double quotes mixed should parse all parameters
    const query = `SELECT * FROM items WHERE name = 'foo "bar"' AND id = :id AND status = :status`;
    const result = compile(query, { id: 123, status: 'active' });

    assert.strictEqual(result[1].length, 2, 'Should extract both parameters');
    assert.deepEqual(result[1], [123, 'active']);
  });

  it('should handle large queries with multiple parameters after quoted strings', () => {
    // Real-world scenario: complex query with nested quotes and multiple parameters
    const query = `Select users.json,
      CASE
        WHEN users.role = 'admin'
        THEN CONCAT('"', users.name, '"')
        ELSE users.name
      END AS label
      from users
      where users.id = :id
        and users.created = :created
        and users.updated = :updated
        and users.status = :status`;

    const result = compile(query, {
      id: 100,
      created: '2024-01-01',
      updated: '2024-12-31',
      status: 'active'
    });

    assert.strictEqual(result[1].length, 4, 'Should extract all 4 parameters');
    assert.deepEqual(result[1], [100, '2024-01-01', '2024-12-31', 'active']);
  });
});

describe('postgres-style toNumbered conversion', () => {
  it('basic test', () => {
    const toNumbered = require('..').toNumbered;
    const query = 'SELECT usr.p_pause_stop_track(:doc_dtl_id, :plan_id, :wc_id, 20, :time_from)';
    assert.deepEqual(toNumbered(query, {
      doc_dtl_id: 123,
      time_from: 345,
      plan_id: 456,
      wc_id: 678
    }), [ 'SELECT usr.p_pause_stop_track($1, $2, $3, 20, $4)', [ 123, 456, 678, 345 ]]);
  });
});