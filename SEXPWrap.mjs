import ref from 'ref';
import refArray from 'ref-array';
import Complex from 'Complex';
import R from './R';
import {SEXPTYPE, RComplex, cetype_t} from './libR';
import debug_ from 'debug'
const debug = debug_("libr-bridge:class SEXPWrap")

var sexpSize = void 0;

export default class SEXPWrap {
	constructor(value){
		
		if(value === void 0){
			throw new Error("SEXPWrap: Value not specified.")
		}else if(value instanceof Buffer){
			// This may be SEXP!
			this.sexp = value;
		}else{
			this.__initializeWithValue(value);
		}
	}
	/**
	 *	Initialize this instance with specified value.
	 *	@private
	 */
	__initializeWithValue(value){
		if(!Array.isArray(value)){
			// not an array.
			// convert to array and try again.
			// (You can use Rf_mkString, Rf_ScalarReal, Rf_ScalarLogical if you don't want SEXPWrap)
			this.__initializeWithValue([value]);
		}else if(value.length == 0){
			this.sexp = R.R_NilValue;
		}else if(typeof(value[0]) == 'number'){
			// assume this is array of numbers (e.g. [1, 2, 3, ...])
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.REALSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), ref.types.double.size * value.length);
			value.map((e, i) => {
				ref.set(p, ref.types.double.size * i, 1.0 * e /* convert to double */, ref.types.double);
			});
			this.unprotect();
		}else if(typeof(value[0]) == 'boolean'){
			// assume this is array of boolean (e.g. [false, true, true, ...])
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.LGLSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), ref.types.bool.size * value.length);
			value.map((e, i) => {
				ref.set(p, ref.types.bool.size * i, (e ? true : false) /* convert to boolean */, ref.types.bool);
			});
			this.unprotect();
		}else if(typeof(value[0]) == 'string'){
			// assuming this is array of strings (e.g. ["abc", "def", ...])
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.STRSXP, value.length);
			this.protect();
			value.map((e, i) => {
				R.libR.SET_STRING_ELT(this.sexp, i, R.libR.Rf_mkCharCE(e, cetype_t.CE_UTF8));
			});
			this.unprotect();
		}else if(value[0] instanceof Complex){
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.CPLXSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), RComplex.size * value.length);
			value.map((e) => new RComplex({r: e.real, i: e.im}))
				 .map((e, i) => {
					ref.set(p, RComplex.size * i, e, RComplex);
				});
			this.unprotect();
		}else{
			console.log("Cannot convert " + typeof(value) + " in JavaScript to R SEXP / " + value);
		}
	}
	/** Protect this SEXP */
	protect(){ R.libR.Rf_protect(this.sexp); }
	/** Unprotect SEXPs */
	unprotect(depth=1){ R.libR.Rf_unprotect(depth); }
	/** Preserve this SEXP. Please use protect() if you can. */
	preserve(){ R.libR.R_PreserveObject(this.sexp); }
	/** Release preserved SEXP. protect()ed SEXP should be releaseed with unprotect() */
	release(){ R.libR.R_ReleaseObject(this.sexp); }
	/** Return true if this SEXP is List. */
	isList(){ return R.libR.Rf_isList(this.sexp); }
	/** Return true if this SEXP is Vector. Please note single scalar value in R is vector. */
	isVector(){ return R.libR.Rf_isVector(this.sexp); }
	/** Return the length of vector. */
	length(){ return R.libR.Rf_length(this.sexp); }
	/** Return true if this SEXP is null. */
	isNull(){ return R.libR.Rf_isNull(this.sexp); }
	isComplex(){ return R.libR.Rf_isComplex(this.sexp); }
	isExpression(){ return R.libR.Rf_isExpression(this.sexp); }
	isInteger(){ return R.libR.Rf_isInteger(this.sexp); }
	isLogical(){ return R.libR.Rf_isLogical(this.sexp); }
	isReal(){ return R.libR.Rf_isReal(this.sexp); }
	isValidString(){ return R.libR.Rf_isValidString(this.sexp); }
	dataptr(){ return R.libR.STRING_PTR(this.sexp); }
	asChar(){ return R.libR.Rf_translateCharUTF8(R.libR.Rf_asChar(this.sexp)).slice(); }
	/** Return sizeof(SEXP) in byte. */
	static get SEXPSize(){
		if(sexpSize == void 0){
			const intSEXP = new SEXPWrap(0)
			sexpSize = intSEXP.dataptr().address() - intSEXP.sexp.address();
		}
		return sexpSize;
	}
	get names(){
		let names = new SEXPWrap(R.libR.Rf_getAttrib(this.sexp, R.R_NamesSymbol));
		return names.isNull() ? undefined : names.getValue();
	}
	set names(newtag){
		if (newtag === void 0) return;
		R.libR.Rf_setAttrib(this.sexp, R.R_NamesSymbol, (new SEXPWrap(newtag)).sexp);
	}
	getValue(){
		if(this.sexp.address() == 0 || this.isNull()){
			return null;
		}
		const len = this.length()
		if(len == 0){
			return [];
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
			if(this.isInteger() || this.isLogical()){
				itemtype = ref.types.int;
				const f = this.isLogical() ? (e) => !!e : (e) => e;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype) )
										.map( (e) => e == R.R_NaInt ? undefined : f(e));
			}else if(this.isReal()){
				itemtype = ref.types.double;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype) )
				/* Discriminate NA from NaN (1954; the year Ross Ihaka was born) */
				/* see main/arithmetic.c for detail. */
				itemtype = ref.types.uint;
				const q = ref.reinterpret(this.dataptr(), itemtype.size * len * 2);
				R.range(0, len).map( (i) => {
					if(isNaN(values[i])){
						if(ref.get(q, itemtype.size * i * 2, itemtype) == 1954) values[i] = undefined;
					}
				});
			}else if(this.isComplex()){
				itemtype = RComplex;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype))
										.map( (e) => new Complex(e.r, e.i));
			}else if(this.isValidString()){
				values = R.range(0, len).map((i) => R.libR.STRING_ELT(this.sexp, i))
										.map((e) => {
											const s = new SEXPWrap(e);
											return s.asChar();
										});
			}else if(this.isExpression()){
				debug("getValue() for RExpression")
				values = ["(R Expression)"]
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
			return R.libR.Rf_translateCharUTF8(R.libR.Rf_asChar(sexp)).slice();
		}else{
			return "SEXPWRAP: unknown SEXP Type";
		}
	}
}

/*
 * vim: filetype=javascript
 */
