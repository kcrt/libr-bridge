import R from './R';

/* Execute this script with:
 *   node -r @std/esm example.mjs
 *     or 
 *   node --experimental-modules example.mjs
 * If something is wrong, try with:
 *   DEBUG=libr-bridge:* node -r @std/esm example.mjs
 */

let r = new R();

const arrA = [1.00, 3.36, 8.01, 1.22, 3.74, 2.43, 7.95, 8.32, 7.45, 4.36];
const arrB = [1.04, 3.65, 6.82, 1.46, 2.70, 2.49, 7.48, 8.28, 8.93, 5.63];

/* Some functions are already loaded to libr-bridge */
console.log("Mean of arrA: " + r.f.mean(arrA));
console.log("Mean of arrB: " + r.f.mean(arrB));
console.log("Peason's correlation coefficient: " + r.f.cor(arrA, arrB));
//TODO: r.f['wilcox.test'](arrA, arrB);

/* You can pass data to R */
r.setVar("a", arrA);

/* And data can be used in R */
console.log(r.eval('sum(a)'));
r.eval('b <- a / 2');
console.log(r.eval('b'));

/* You can receive data from R */
let b = r.getVar("b");

/* Execute complex command with eval. */
r.eval(`
	myfactorial <- function(x) {
		if (x == 0) {
			return(1)
		} else {
			return(x * myfactorial(x - 1))
		}
	}
`);
let factorial_50 = r.func("myfactorial")(10);
console.log(factorial_50);


/*
 * vim: filetype=javascript
 */
