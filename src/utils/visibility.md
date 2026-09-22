**1. Yallop**

For all topocentric observations, calculations are typically performed at the "Best Time" ($T_{best}$) of observation, usually defined as $T_{best} = T_{sunset} + \frac{4}{9}(T_{moonset} - T_{sunset})$.

This is a polynomial algorithm that generates a test parameter $q$ to classify visibility into six zones.

* **Variables:**
* $ARCV$: Topocentric Arc of Vision (Altitude of Moon - Altitude of Sun) at Best Time, in degrees.
* $W'$: Topocentric crescent width at Best Time, in arcminutes. Calculated as $W' = SD \times (1 - \cos(ARCL))$, where $SD$ is the lunar semi-diameter.


* **Formula:**

$$q = \frac{ARCV - (11.8371 - 6.3226W' + 0.7319W'^2 - 0.1018W'^3)}{10}$$


* **Evaluation Logic:**
* `if q > 0.216`: Zone A (Easily visible to the naked eye)
* `else if q > -0.014`: Zone B (Visible under perfect conditions)
* `else if q > -0.160`: Zone C (May need optical aid to locate, visible to naked eye)
* `else if q > -0.232`: Zone D (Optical aid strictly required)
* `else if q > -0.293`: Zone E (Below optical visibility, but physically exists)
* `else`: Zone F (Invisible, below Danjon limit)



**2. Odeh**
Odeh refined Yallop’s polynomial using a larger empirical dataset, generating a parameter $V$.

* **Variables:**
* $ARCV$: Topocentric Arc of Vision, in degrees.
* $W$: Topocentric crescent width, in arcminutes.


* **Formula:**

$$V = ARCV - (-0.1018W^3 + 0.7319W^2 - 6.3226W + 7.1651)$$


* **Evaluation Logic:**
* `if V >= 5.65`: Easily visible by the naked eye.
* `else if V >= 2.0`: Visible by optical aid, could be seen by the naked eye.
* `else if V >= -0.96`: Visible by optical aid only.
* `else`: Not visible.



**3. New MABIMS**
evaluated at local sunset

* **Variables:**
* $Alt$: Topocentric Moon altitude at sunset, in degrees.
* $ARCL$: Geocentric Elongation (Arc of Light) at sunset, in degrees.


* **Formula:**

$$Visibility = (Alt \ge 3.0) \land (ARCL \ge 6.4)$$



**4. Diyanet**

* **Variables:**
* $Alt$: Moon altitude at sunset for a specific coordinate, in degrees.
* $ARCL$: Elongation at sunset for a specific coordinate, in degrees.


* **Formula:**

$$Visibility = \exists (\text{location}) \mid (Alt \ge 5.0) \land (ARCL \ge 8.0)$$



**5. Danjon Limit**

* **Variables:**
* $ARCL$: Elongation (Arc of Light), in degrees.


* **Formula:**

$$Visibility = ARCL \ge 7.0$$



*(Note: Modern iterations sometimes use $6.4$ as the absolute limit).*
