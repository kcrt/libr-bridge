import R from '../R';
import assert from 'assert';
import assert_ext from './assert_ext';

var r;
assert_ext(assert);

describe('Initialize', () => {
	it('Initialize', () => {
		r = new R();
	});
});

describe('Unicode', () => {
	it('Variable and value', () => {
		r.setVar("挨拶", "こんにちわ");
		assert.equal(r.getVar("挨拶"), "こんにちわ");
	});
});


/*
 * vim: filetype=javascript
 */
