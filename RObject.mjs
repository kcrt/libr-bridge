"use strict";

// import ref from "ref";
// import refArray from "ref-array";
// import R from "./R";
// import {REALSXP} from "./libR";
// import SEXPWrap from "./SEXPWrap";

// import debug_ from "debug";
// const debug = debug_("libr-bridge:RObject");

/**
 * JavaScript class for R Array type.
 * Please use appropriate deriverd class if possible.
 */
export class RArray extends Array{
	// nothing special.
}
export class RIntArray extends RArray{
}
export class RBoolArray extends RArray{
}
export class RStrArray extends RArray{
}
export class RRealArray extends RArray{
}
export class RComplexArray extends RArray{
}
/**
 * JavaScript class for R Factor type.
 * A factor has numerical(integer) array with keys.
 */
export class RFactor extends RArray{
	/**
	 * Create a factor.
	 *	@param data {string[]}		String array indicate category, like ["male", "female", "male", ...]
	 *	@param levels {Object}		Category item like ["male", "female"]
	 *	@param ordered {boolean}	If true, this factor is ordered factor (nominal)
	 */
	constructor(data, levels=undefined, ordered=false){

		var mylevels;

		if(!Array.isArray(data)){
			super(data);
		}else{
			if(levels === undefined){
				var s = new Set();
				data.forEach((item) => s.add(item));
				mylevels = Array.from(s);
			}else if(Array.isArray(levels)){
				mylevels = levels;
			}else{
				throw new Error("Unknown label of factor.");
			}
			mylevels = mylevels.filter((v) => v !== undefined);

			// RFactor is 1-origin!
			const values = data.map((v) => mylevels.indexOf(v) + 1)
				.map((v) => v === 0 ? undefined : v); 

			super(...values);
		}
		this.levels = mylevels;
		this.ordered = ordered;

	}
}


/**
 * JavaScript class for R Data Frame type.
 * With a data frame, we can  is able to contain different type of items.
 */
export class RList extends Array{
	constructor(data){
		console.assert(Array.isArray(data));

		// JavaScript Array can contain dirrent type of items, so do nothing special.
		// However, array with 1-numerical item cannot be made with normal way.
		if(data.length === 1 && typeof(data[0]) === "number"){
			super(1984, data[0]);
			this.pop();
		}else{
			super(...data);
		}
	}
}



/*
 * vim: filetype=javascript
 */
