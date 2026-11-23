'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const compile = require('..')();

describe('given input query with named parameters', () => {
  it('should build corresponding query with `?` placeholders and fill array of parameters from input object', () => {
    let query =
      'Select users.json,EXISTS(Select 1 from moderators where moderators.id = :id) as is_moderator from users where users.id = :id and users.status = :status and users.complete_status = :complete_status';

    const result1 = compile(query, {
      id: 123,
      status: 'Yes!',
      complete_status: 'No!',
    });

    assert.deepEqual(result1, [
      'Select users.json,EXISTS(Select 1 from moderators where moderators.id = ?) as is_moderator from users where users.id = ? and users.status = ? and users.complete_status = ?',
      [123, 123, 'Yes!', 'No!'],
    ]);

    // from https://github.com/mysqljs/named-placeholders/issues/2
    query =
      'SELECT * FROM items WHERE id = :id AND deleted = "0000-00-00 00:00:00"';
    const result2 = compile(query, { id: Number(123) });
    assert.deepEqual(result2, [
      'SELECT * FROM items WHERE id = ? AND deleted = "0000-00-00 00:00:00"',
      [123],
    ]);

    query =
      'SELECT * FROM items WHERE deleted = "0000-00-00 00:00:00" AND id = :id';
    const result3 = compile(query, { id: Number(123) });
    assert.deepEqual(result3, [
      'SELECT * FROM items WHERE deleted = "0000-00-00 00:00:00" AND id = ?',
      [123],
    ]);
  });

  it('should throw error when query contains placeholders but parameters object not passed', () => {
    const query = 'test ::p2 test :p1';

    assert.throws(() => {
      compile(query);
    }, /Named query contains placeholders, but parameters object is undefined/);
  });

  it('should replace ::name style placeholders with `??` placeholders', () => {
    let query = 'normal placeholder :p1 and double semicolon ::p2';
    assert.deepEqual(compile(query, { p1: 'test1', p2: 'test2' }), [
      'normal placeholder ? and double semicolon ??',
      ['test1', 'test2'],
    ]);

    query = 'normal placeholder ::p1 and double semicolon :p2';
    assert.deepEqual(compile(query, { p1: 'test1', p2: 'test2' }), [
      'normal placeholder ?? and double semicolon ?',
      ['test1', 'test2'],
    ]);

    query = 'normal placeholder ::p2 and double semicolon :p1';
    assert.deepEqual(compile(query, { p1: 'test1', p2: 'test2' }), [
      'normal placeholder ?? and double semicolon ?',
      ['test2', 'test1'],
    ]);

    query = 'normal placeholder :p1 and double semicolon ::p2 test';
    assert.deepEqual(compile(query, { p1: 'test1', p2: 'test2' }), [
      'normal placeholder ? and double semicolon ?? test',
      ['test1', 'test2'],
    ]);
  });

  it('compiles the query the same twice', () => {
    const query = 'SELECT * FROM foo WHERE id = :id';
    const expected = ['SELECT * FROM foo WHERE id = ?', [123]];
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
      status: 'active',
    });

    assert.strictEqual(result[1].length, 4, 'Should extract all 4 parameters');
    assert.deepEqual(result[1], [100, '2024-01-01', '2024-12-31', 'active']);
  });

  it('should continue parsing placeholders after an escaped colon inside a quoted string', () => {
    const query =
      "SELECT * FROM certificate WHERE certificate_no = '\\:certificateNo' AND status = :status";
    const result = compile(query, { status: 'active' });

    assert.deepEqual(result, [
      "SELECT * FROM certificate WHERE certificate_no = '\\:certificateNo' AND status = ?",
      ['active'],
    ]);
  });

  it('should not read a named placeholder inside a backtick-quoted identifier', () => {
    const query = 'UPDATE items SET `label:fr` = :label WHERE id = :id';
    const result = compile(query, { fr: 'unused', label: 'hello', id: 1 });

    assert.deepEqual(result, [
      'UPDATE items SET `label:fr` = ? WHERE id = ?',
      ['hello', 1],
    ]);
  });

  it('should not read a `?` inside a backtick-quoted identifier', () => {
    // MySQL accepts a `?` in a quoted column name: read as a placeholder,
    // it takes a slot and every value after it moves one place
    const query = 'UPDATE items SET `label?` = :label WHERE id = :id';
    const result = compile(query, { label: 'hello', id: 1 });

    assert.deepEqual(result, [
      'UPDATE items SET `label?` = ? WHERE id = ?',
      ['hello', 1],
    ]);
  });

  it('should read a backslash inside a backtick-quoted identifier as a plain character', () => {
    const query = 'SELECT `a\\` FROM items WHERE id = :id';
    const result = compile(query, { id: 1 });

    assert.deepEqual(result, ['SELECT `a\\` FROM items WHERE id = ?', [1]]);
  });

  it('should handle a doubled backtick inside an identifier', () => {
    const query = 'SELECT `a``:b` FROM items WHERE id = :id';
    const result = compile(query, { b: 'unused', id: 1 });

    assert.deepEqual(result, ['SELECT `a``:b` FROM items WHERE id = ?', [1]]);
  });
});

describe('given input query with comments', () => {
  const p = { a: 'A', b: 'B' };

  it('should skip placeholders inside a block comment', () => {
    assert.deepEqual(compile('SELECT /* :a */ :b AS b', p), [
      'SELECT /* :a */ ? AS b',
      ['B'],
    ]);
  });

  it('should skip placeholders inside a "-- " line comment', () => {
    assert.deepEqual(compile('SELECT 1 -- :a\n, :b AS b', p), [
      'SELECT 1 -- :a\n, ? AS b',
      ['B'],
    ]);
  });

  it('should skip placeholders inside a "#" line comment', () => {
    assert.deepEqual(compile('SELECT 1 # :a\n, :b AS b', p), [
      'SELECT 1 # :a\n, ? AS b',
      ['B'],
    ]);
  });

  it('should not take a value slot for "?" inside a comment', () => {
    assert.deepEqual(compile('SELECT /* ? */ :a, :b -- ?', p), [
      'SELECT /* ? */ ?, ? -- ?',
      ['A', 'B'],
    ]);
  });

  it('should treat an apostrophe inside a line comment as text', () => {
    assert.deepEqual(compile("SELECT 1 -- dan's comment\n, :a, :b", p), [
      "SELECT 1 -- dan's comment\n, ?, ?",
      ['A', 'B'],
    ]);
    assert.deepEqual(compile("SELECT /* dan's */ :a, :b", p), [
      "SELECT /* dan's */ ?, ?",
      ['A', 'B'],
    ]);
  });

  it('should not let a backslash inside a comment escape the next character', () => {
    assert.deepEqual(compile('SELECT /* \\*/ :a', p), [
      'SELECT /* \\*/ ?',
      ['A'],
    ]);
  });

  it('should close a block comment at the first "*/"', () => {
    assert.deepEqual(compile('SELECT /* c */* FROM t WHERE id = :a', p), [
      'SELECT /* c */* FROM t WHERE id = ?',
      ['A'],
    ]);
    assert.deepEqual(compile('SELECT /*/ :a */ :b', p), [
      'SELECT /*/ :a */ ?',
      ['B'],
    ]);
  });

  it('should not start a line comment inside a block comment', () => {
    assert.deepEqual(compile('SELECT /* -- */ :a', p), [
      'SELECT /* -- */ ?',
      ['A'],
    ]);
  });

  it('should find placeholders after a comment that follows a quoted string', () => {
    assert.deepEqual(compile("SELECT 'x' /* :a */, :b", p), [
      "SELECT 'x' /* :a */, ?",
      ['B'],
    ]);
    assert.deepEqual(compile('SELECT "x" -- :a\n, :b', p), [
      'SELECT "x" -- :a\n, ?',
      ['B'],
    ]);
  });

  it('should treat a comment starter inside a quoted string as text', () => {
    assert.deepEqual(compile('SELECT "/* " , :a, " */"', p), [
      'SELECT "/* " , ?, " */"',
      ['A'],
    ]);
    assert.deepEqual(compile("SELECT '-- ', :a, '# '", p), [
      "SELECT '-- ', ?, '# '",
      ['A'],
    ]);
  });

  it('should still convert placeholders inside "/*!" and "/*+"', () => {
    assert.deepEqual(compile('SELECT /*! :a */ :b', p), [
      'SELECT /*! ? */ ?',
      ['A', 'B'],
    ]);
    assert.deepEqual(compile('SELECT /*+ MAX_EXECUTION_TIME(:a) */ :b', p), [
      'SELECT /*+ MAX_EXECUTION_TIME(?) */ ?',
      ['A', 'B'],
    ]);
  });

  it('should not treat "--" without trailing whitespace as a comment', () => {
    assert.deepEqual(compile('SELECT --:a, 5--:b', p), [
      'SELECT --?, 5--?',
      ['A', 'B'],
    ]);
  });

  it('should treat an unterminated block comment as running to the end', () => {
    assert.deepEqual(compile('SELECT :a /* :b', p), ['SELECT ? /* :b', ['A']]);
  });

  it('should find a placeholder right after a closed comment', () => {
    assert.deepEqual(compile('SELECT /* c */:a', p), [
      'SELECT /* c */?',
      ['A'],
    ]);
  });

  it('should keep "::name" working next to a comment', () => {
    assert.deepEqual(compile('SELECT /* :a */ ::b, :a', p), [
      'SELECT /* :a */ ??, ?',
      ['B', 'A'],
    ]);
  });

  it('should close a block comment at the first "*/" without nesting', () => {
    assert.deepEqual(compile('SELECT /* /* :a */ :b */', p), [
      'SELECT /* /* :a */ ? */',
      ['B'],
    ]);
  });

  it('should compile a query with comments the same twice', () => {
    const query = 'SELECT /* :a */ :b -- ?\n, :a';
    const expected = ['SELECT /* :a */ ? -- ?\n, ?', ['B', 'A']];
    assert.deepEqual(compile(query, p), expected);
    assert.deepEqual(compile(query, p), expected);
  });

  it('should return a query with only commented placeholders untouched', () => {
    assert.deepEqual(compile('SELECT 1 /* :a ? */', p), [
      'SELECT 1 /* :a ? */',
      [],
    ]);
  });

  it('should read a comment starter inside a backtick-quoted identifier as plain text', () => {
    assert.deepEqual(
      compile('SELECT `Invoice #`, `a -- b`, `c /* d` FROM t WHERE id = :id', {
        id: 7,
      }),
      ['SELECT `Invoice #`, `a -- b`, `c /* d` FROM t WHERE id = ?', [7]]
    );
  });

  it('should read "--" followed by a tab as a comment', () => {
    assert.deepEqual(
      compile('SELECT 1 --\t:a\n, :b AS b', { a: 'A', b: 'B' }),
      ['SELECT 1 --\t:a\n, ? AS b', ['B']]
    );
  });

  it('should keep the text after the last placeholder when the query ends inside an open quote', () => {
    assert.deepEqual(compile("SELECT :a, ':b", { a: 'A', b: 'B' }), [
      "SELECT ?, ':b",
      ['A'],
    ]);
  });

  it('should skip comments the same way through compile.parse', () => {
    assert.deepEqual(compile.parse('SELECT 1 # :a\n, :b'), [
      ['SELECT 1 # :a\n, '],
      ['b'],
    ]);
  });
});

describe('postgres-style toNumbered conversion', () => {
  it('basic test', () => {
    const toNumbered = require('..').toNumbered;
    const query =
      'SELECT usr.p_pause_stop_track(:doc_dtl_id, :plan_id, :wc_id, 20, :time_from)';
    assert.deepEqual(
      toNumbered(query, {
        doc_dtl_id: 123,
        time_from: 345,
        plan_id: 456,
        wc_id: 678,
      }),
      [
        'SELECT usr.p_pause_stop_track($1, $2, $3, 20, $4)',
        [123, 456, 678, 345],
      ]
    );
  });
});

describe('postgres-style toNumbered with comments', () => {
  const toNumbered = require('..').toNumbered;

  it('should keep "#" as an operator', () => {
    assert.deepEqual(
      toNumbered('SELECT a #> :path FROM t WHERE id = :id AND b # :b', {
        path: 'p',
        id: 1,
        b: 2,
      }),
      ['SELECT a #> $1 FROM t WHERE id = $2 AND b # $3', ['p', 1, 2]]
    );
  });

  it('should skip "-- " and block comments', () => {
    assert.deepEqual(
      toNumbered('SELECT /* :a */ :b -- :a\n, :c', { a: 1, b: 2, c: 3 }),
      ['SELECT /* :a */ $1 -- :a\n, $2', [2, 3]]
    );
  });
});
