libr-bridge
========================================

![Travis CI](https://travis-ci.org/kcrt/libr-bridge.svg?branch=master)

Bridging module: JavaScript <-> R

![🄬🌉⬢](./logo.png)


Sorry! It's under development.
----------------------------------------
  * Some important features including factor, dataframe, console handling, S3/S4 object handling and expression are not supported yet!
  * Incompatible API changes may be held.
  * Please do not use in the production environment until specifications are fixed.
  * Pull requests are always welcome.

What is libr-bridge?
----------------------------------------

[**libr-bridge**](https://github.com/kcrt/libr-bridge) is a very powerful npm package which enables you to use R function/statistical method in Node.js environment.

[R (The R Foundation, Vienna, Austria)](https://www.r-project.org) is a free software environment for statistical computing. With **libr-bridge**, you can use function in R as if they were JavaScript native function.

How to Use
----------------------------------------

Following samples and **libr-bridge** are written with ECMAScript 6 modules syntex (import/export).
Please use [**@std/esm**](https://github.com/standard-things/esm) or **--experimental-modules**.

```javascript
let r = new R();

const arrA = [1.00, 3.36, 8.01, 1.22, 3.74, 2.43, 7.95, 8.32, 7.45, 4.36];
const arrB = [1.04, 3.65, 6.82, 1.46, 2.70, 2.49, 7.48, 8.28, 8.93, 5.63];

/* Some functions are already loaded to libr-bridge */
console.log("Mean of arrA: " + r.mean(arrA));
console.log("Mean of arrB: " + r.mean(arrB));
console.log("Peason's correlation coefficient: " + r.cor(arrA, arrB));

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
let factorial_50 = r.func("myfactorial")(50);
console.log(factorial_50);
```

API
----------------------------------------
### `Document`
Please see doc directory.

Depending package
----------------------------------------
### npm
1. [node-ffi: Node.js Foreign Function Interface](https://github.com/node-ffi/node-ffi)
1. [ref * Turn Buffer instances into "pointers"](https://tootallnate.github.io/ref/)
1. [arian/Complex: Calculations with Complex Numbers in JavaScript](https://github.com/arian/Complex)

My TODO list
----------------------------------------

 - [ ] Factor
 - [ ] Dataframe
 - [ ] Console handling
 - [ ] S3 class
 - [ ] S4 class
 - [ ] Graphic handling

Author information
----------------------------------------
Programmed by kcrt (TAKAHASHI, Kyohei)
http://profile.kcrt.net/
	
License
----------------------------------------
	Copyright © 2017 kcrt (TAKAHASHI, Kyohei)
	Released under the MIT license
	http://opensource.org/licenses/mit-license.php

Reference
----------------------------------------
### English
1. [R Internals](https://cran.r-project.org/doc/manuals/r-release/R-ints.html)
1. [R internals (by Hadley)](https://github.com/hadley/r-internals)
1. [Advanced R by Hadley Wickham](http://adv-r.had.co.nz)
	- You can buy [Physical copy](https://www.amazon.com/dp/1466586966) of this material. Especially recommended!
1. [Rccp: Seamless R anc C++ Integration](https://github.com/RcppCore/Rcpp)
1. [Rcpp documentation](http://dirk.eddelbuettel.com/code/rcpp/html/index.html)
1. [Rcpp for everyone (Masaki E. Tsuda)](https://teuder.github.io/rcpp4everyone_en/)

### Japanese
1. [R入門 Ver.1.7.0](https://cran.r-project.org/doc/contrib/manuals-jp/R-intro-170.jp.pdf)
1. [R言語定義 Ver.1.1.0 DRAFT](https://cran.r-project.org/doc/contrib/manuals-jp/R-lang.jp.v110.pdf)
1. [Rの拡張を書く Ver2.1.0](https://cran.r-project.org/doc/contrib/manuals-jp/R-exts.jp.pdf)
1. [R言語徹底解説 Hadley Wickham (著), 石田 基広ら (翻訳)](http://amzn.to/2xhIZtg) 特におすすめです。
1. [みんなのRcpp (Masaki E. Tsuda)](https://teuder.github.io/rcpp4everyone_ja/)


