
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

/*
 * vim: filetype=javascript
 */
