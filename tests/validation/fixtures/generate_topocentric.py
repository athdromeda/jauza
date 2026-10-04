#!/usr/bin/env python3
"""Generate independent topocentric alt/az validation fixtures with Skyfield.

Reference values come from the DE421 ephemeris via Skyfield (independent of
Jauza). For each case we record the GEOCENTRIC apparent-of-date RA/Dec and
distance (which the Jauza test feeds in as the algorithm's native pair) plus the
TOPOCENTRIC geometric altitude/azimuth (no refraction: pressure=0).

The comparison isolates Jauza's topocentric transformation (WGS-84 observer +
ENU + apparent sidereal time) from ephemeris accuracy.

Usage:
    DE421=de421.bsp python generate_topocentric.py > topocentric-horizons.json
"""
import json
import os
import sys

from skyfield.api import load, wgs84

DE421 = os.environ.get("DE421", "de421.bsp")
eph = load(DE421)
ts = load.timescale()

EARTH = eph["earth"]
MOON = eph["moon"]
SUN = eph["sun"]

CASES = [
    # label, utc, site, body
    ("jakarta-moon-2025-08-17", "2025-08-17 12:00:00", (106.816667, -6.166667, 0), "MOON"),
    ("cibeas-moon-sunset-2025-08-17", "2025-08-17 11:30:00", (106.5311111, -7.0738889, 137), "MOON"),
    ("reykjavik-moon-2025-08-17", "2025-08-17 22:00:00", (-21.9426, 64.1466, 0), "MOON"),
    ("jakarta-sun-2025-08-17", "2025-08-17 11:00:00", (106.816667, -6.166667, 0), "SUN"),
    ("reykjavik-sun-2025-08-17", "2025-08-17 12:00:00", (-21.9426, 64.1466, 0), "SUN"),
]

out = []
for label, utc, (lng, lat, elev), body_name in CASES:
    t = ts.utc(*[int(x) for x in utc.replace("-", " ").replace(":", " ").split()])
    body = MOON if body_name == "MOON" else SUN

    geocentric = EARTH.at(t).observe(body).apparent()
    ra, dec, dist = geocentric.radec("date")
    geocentric_ra = ra._degrees % 360.0
    geocentric_dec = dec.degrees
    dist_km = dist.km

    observer = wgs84.latlon(lat, lng, elevation_m=elev)
    alt, az, _ = (EARTH + observer).at(t).observe(body).apparent().altaz()
    expected_alt = alt.degrees
    expected_az = az.degrees % 360.0

    out.append(
        {
            "label": label,
            "utc": utc.replace(" ", "T") + "Z",
            "site": {"lat": lat, "lng": lng, "elevationM": elev},
            "body": body_name,
            "geocentric_ra_deg": geocentric_ra,
            "geocentric_dec_deg": geocentric_dec,
            "geocentric_dist_km": dist_km,
            "expected_topocentric_alt_deg": expected_alt,
            "expected_topocentric_az_deg": expected_az,
        }
    )

print(json.dumps(out, indent=2))