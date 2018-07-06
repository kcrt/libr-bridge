"use strict";

import ref from 'ref';
import refArray from 'ref-array';
import R from './R';
import {REALSXP} from './libR';
import SEXPWrap from './SEXPWrap';

/**
 * JavaScript class for R Factor type.
 * A factor has numerical(integer) array with keys.
 */
class RFactor extends Array{
	isOrdered = false;
	labels = {};
	/**
	 * Create a factor.
	 *	@param data {string[]}		String array indicate category, like ["male", "female", "male", ...]
	 *	@param labels {Object}		Category item with index number, like {"male": 1, "female": 2} or ["male", "female"]
	 *	@param ordered {boolean}	If true, this factor is ordered factor (nominal)
	 */
	constructor(data, labels=void 0, ordered=false){
		var s = new Set();
		if(labels === void 0){
		data.forEach((item) => s.add(item));

		super(arr);
	}
}

/*
 * vim: filetype=javascript
 */
