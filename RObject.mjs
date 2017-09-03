
import ref from 'ref';
import refArray from 'ref-array';
import R from './R';
import {REALSXP} from './libR';
import SEXPWrap from './SEXPWrap';

function EnableAttributeAccess(obj){
	Object.defineProperty(obj, "names", {
			get: function(){
				return this.__names;
			},
			set: function(value) {
				this.__names = value;
			}
		}
	);
}

export class RNumber extends Number{
	constructor(value){
		super(value);
		EnableAttributeAccess(this);
	}
}

/*
 * I stopped using this... Boolean object with false will be diagnosed as 'true'
export class RLogical extends Boolean{
	constructor(value){
		super(value);
		EnableAttributeAccess(this);
	}
}
*/
export class RString extends String{
	constructor(value){
		super(value);
		EnableAttributeAccess(this);
	}
}

/*
 * vim: filetype=javascript
 */
