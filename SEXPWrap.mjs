import ref from 'ref';
import refArray from 'ref-array';
import R from './R';
import {REALSXP} from './libR';

var sexpSize = void 0;

export default class SEXPWrap {
	constructor(value){
		if(value instanceof Buffer){
			// This may be SEXP!
			this.sexp = value;
		}else if(typeof(value) == 'number'){
			this.sexp = R.libR.Rf_ScalarReal(value);
		}else if(value instanceof Number){
			this.sexp = R.libR.Rf_ScalarReal(value.valueOf());
		}else if(typeof(value) == 'string'){
			this.sexp = R.libR.Rf_mkString(ref.allocCString(value));
		}else if(typeof(value) == 'boolean'){
			this.sexp = R.libR.Rf_ScalarLogical(value);
		}else if(Array.isArray(value)){
			// TODO: String Array
			this.sexp = R.libR.Rf_allocVector(REALSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), ref.types.double.size * value.length);
			R.range(0, value.length).map( (i) => {
				ref.set(p, ref.types.double.size * i, 1.0 * value[i], ref.types.double);
			});
			this.unprotect();
		}else{
			console.log("Cannot convert " + typeof(value) + " in JavaScript to R SEXP / " + value);
		}
	}
	protect(){ R.libR.Rf_protect(this.sexp); }
	unprotect(depth=1){ R.libR.Rf_unprotect(depth); }
	preserve(){ R.libR.R_PreserveObject(this.sexp); }
	release(){ R.libR.R_ReleaseObject(this.sexp); }
	isList(){ return R.libR.Rf_isList(this.sexp); }
	isVector(){ return R.libR.Rf_isVector(this.sexp); }
	length(){ return R.libR.Rf_length(this.sexp); }
	isNull(){ return R.libR.Rf_isNull(this.sexp); }
	isInteger(){ return R.libR.Rf_isInteger(this.sexp); }
	isLogical(){ return R.libR.Rf_isLogical(this.sexp); }
	isReal(){ return R.libR.Rf_isReal(this.sexp); }
	isValidString(){ return R.libR.Rf_isValidString(this.sexp); }
	dataptr(){ return R.libR.STRING_PTR(this.sexp); }
	asChar(){ return R.libR.R_CHAR(R.libR.Rf_asChar(this.sexp)).slice(); }
	static get SEXPSize(){
		if(sexpSize == void 0){
			const intSEXP = new SEXPWrap(0)
			sexpSize = intSEXP.dataptr().address() - intSEXP.sexp.address();
		}
		return sexpSize;
	}
	get names(){
		let names = new SEXPWrap(R.libR.Rf_getAttrib(this.sexp, R.R_NamesSymbol));
		return names.getValue();
	}
	set names(newtag){
		if (newtag === void 0) return;
		R.libR.Rf_setAttrib(this.sexp, R.R_NamesSymbol, (new SEXPWrap(newtag)).sexp);
	}
	getValue(){
		if(this.isNull()){
			return undefined;
		}
		const len = this.length()
		if(this.sexp.address() == 0 || this.isNull() || len == 0){
			return undefined;
		}if(this.isList()){
			// TODO: support this
			/*
			let v = this.sexp;
			return R.range(0, len).map( (e) => {
				let a = R.libR.CAR(v);
				v = R.libR.CDR(v);
				return this._getValue_scalar(a);
			});*/
			console.log("LIST NOT SUPPORTED")
			return undefined;
		}else if(this.isVector()){		// be careful; is.vector(1) is even True
			let itemtype;
			let values = [];
			if(this.isInteger() || this.isReal()){
				itemtype = this.isInteger() ? ref.types.int : ref.types.double;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype) )
			}else if(this.isLogical()){
				itemtype = ref.types.bool;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype) )
			}else if(this.isValidString()){
				values = R.range(0, len).map((i) => R.libR.STRING_ELT(this.sexp, i))
										.map((e) => {
											const s = new SEXPWrap(e);
											return s.asChar();
										});
			}else{
				values = ["Unsupported vector item!"]
			}
			return values.length == 1 ? values[0] : values;
		}else{
			return "unknown type!"
		}
	}
	_getValue_scalar(sexp){
		// 'Number' includes complex, 'Vector' includes Array and Matrix
		if(R.libR.Rf_isInteger(sexp)){
			return R.libR.Rf_asInteger(sexp);
		}else if(R.libR.Rf_isNumeric(sexp)){
			return R.libR.Rf_asReal(sexp);
		}else if(R.libR.Rf_isValidString(v)){
			return R.libR.R_CHAR(R.libR.Rf_asChar(sexp)).slice();
		}else{
			return "SEXPWRAP: unknown SEXP Type";
		}
	}
}

/*
 * vim: filetype=javascript
 */
