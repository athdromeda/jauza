# Jauza

Jauza is a zero-dependency JavaScript/TypeScript library for Islamic astronomy calculations including calendar conversions, celestial positions, coordinate transforms, crescent moon observation, and Qibla direction.

**Documentation:** https://jauza.nqth.my.id

## Install

```bash
npm install @jauza/core
```

Algorithms are pluggable and shipped as separate packages at separate [repo](https://github.com/athdromeda/jauza-algos), for example the Kemenag's Ephemeris Hisab Rukyat:

```bash
npm install @jauza/ehrk
```

## Quick Start

```ts
import { Earth, Sun, Time } from "@jauza/core";
import { ehrk } from "@jauza/ehrk";

const time = new Time(2024, 3, 29, 9, 0, 0, { timezone: 7 });
const jakarta = new Earth(-6.1697, 106.8303);

const sun = jakarta.at(time).with(ehrk).observe(Sun);

console.log(sun.lambda.decimal);
console.log(sun.ra.decimal, sun.dec.decimal);
console.log(jakarta.qibla);
```

## Features

### Calendar Conversion

`Time` is a Julian Day backed clock; `GregorianCalendar`, `JulianCalendar`, and `HijriCalendar` extend it.

```ts
import { Time, GregorianCalendar, HijriCalendar } from "@jauza/core";

const greg = new GregorianCalendar(2024, 3, 29, 9, 0, 0, { timezone: 7 });
const hijri = greg.toHijri();
console.log(hijri.year, hijri.month, hijri.day); // 1445 9 19

console.log(new HijriCalendar(1445, 9, 1).toGregorian().year);
console.log(new Time(2460329.5).year); // initialize with JD
```

### Celestial Positions


```ts
import { Earth, Sun, Moon, Time } from "@jauza/core";
import { ehrk } from "@jauza/ehrk";

const time = new Time(2024, 3, 29, 9, 0, 0, { timezone: 7 });

const sun = new Earth(-6.1697, 106.8303).at(time).with(ehrk).observe(Sun);
const moon = new Earth(-6.1697, 106.8303).at(time).with(ehrk).observe(Moon);

console.log(sun.lambda.decimal, sun.beta.decimal);
console.log(sun.ra.decimal, sun.dec.decimal);
console.log(moon.r);
```

### Qibla Direction

```ts
import { getQibla, Qibla, vincenty, Earth } from "@jauza/core";

console.log(getQibla(-6.1697, 106.8303));
console.log(getQibla(40.7833, -73.9667, { method: "VINCENTY" }));

console.log(new Qibla(-6.1697, 106.8303).qibla);
console.log(new Qibla(-6.1697, 106.8303).with(vincenty).qibla);
```

### Rukyat

Find ijtima for a Hijri month determination, hilal data, an its visibility criteria.

```ts
import { Rukyat, Earth } from "@jauza/core";
import { ehrk } from "@jauza/ehrk";

const observer = new Earth(-6.1697, 106.8303);
const rukyat = new Rukyat(1445, 9) // Ramadan 1445 H
  .at(observer)
  .with(ehrk);

const conj = rukyat.conjunction();
console.log(conj.ut, conj.jde, conj.moonLon, conj.sunLon);

const vis = rukyat.visibility();
console.log(vis.yallop.zone, vis.odeh.zone, vis.newMabims);
```

The criteria are also exported as standalone functions:

```ts
import { yallop, odeh, newMabims } from "@jauza/core";

yallop({ arcvDeg: 8.5, crescentWidthArcmin: 0.18 });
newMabims(4, 6);
```

### Salat

```ts
import { Salat, Earth, Time } from "@jauza/core";
import { ehrk } from "@jauza/ehrk";

const time = new Time(2024, 3, 29, 0, 0, 0, { timezone: 7 });
const observer = new Earth(-6.1697, 106.8303);

const salat = new Salat(time, { timezone: 7 }).at(observer).with(ehrk);

console.log(salat.fajr(), salat.dhuhr(), salat.asr(), salat.maghrib(), salat.isha());
console.log(salat.info());
```

## License

MIT
