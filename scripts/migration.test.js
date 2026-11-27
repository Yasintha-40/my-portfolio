'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rpcDiagnostic } = require('./migrate-portfolio');

test('safe diagnostics classify RPC failures without leaking payload or credentials', () => {
    assert.match(rpcDiagnostic({code:'23514', message:'sensitive row', details:'secret'}, 400), /check constraint.*HTTP 400, code 23514/);
    assert.match(rpcDiagnostic({code:'PGRST202'}, 404), /signature.*PGRST202/);
    assert.match(rpcDiagnostic({code:'21000', message:'DELETE requires a WHERE clause'}, 400), /safe-update.*21000/);
    assert.match(rpcDiagnostic({code:'P0001', message:'portfolio data already exists; explicit overwrite authorization is required'}, 400), /records already exist/);
    const result = rpcDiagnostic({code:'SECRET-TOKEN', message:'secret name', details:'private data', hint:'secret'}, 0);
    assert.doesNotMatch(result, /SECRET-TOKEN|secret name|private data/);
    assert.match(result, /HTTP unavailable, code unavailable/);
});
