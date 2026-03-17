import json
import os
import urllib.request
import urllib.parse

def handler(event: dict, context) -> dict:
    """
    Геокодирование координат в адрес через Яндекс Geocoder API.
    Принимает lat и lng, возвращает адрес на русском языке.
    """
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    params = event.get("queryStringParameters") or {}
    lat = params.get("lat")
    lng = params.get("lng")

    if not lat or not lng:
        return {
            "statusCode": 400,
            "headers": cors_headers,
            "body": json.dumps({"error": "Требуются параметры lat и lng"}),
        }

    lat = float(lat)
    lng = float(lng)

    api_key = os.environ["YANDEX_MAPS_API_KEY"]

    url = (
        "https://geocode-maps.yandex.ru/1.x/?"
        + urllib.parse.urlencode({
            "apikey": api_key,
            "geocode": f"{lng},{lat}",
            "format": "json",
            "lang": "ru_RU",
            "kind": "house",
            "results": 1,
        })
    )

    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())

    members = (
        data
        .get("response", {})
        .get("GeoObjectCollection", {})
        .get("featureMember", [])
    )

    if members:
        geo = members[0].get("GeoObject", {})
        full = geo.get("metaDataProperty", {}).get("GeocoderMetaData", {}).get("text", "")
        components = (
            geo.get("metaDataProperty", {})
            .get("GeocoderMetaData", {})
            .get("Address", {})
            .get("Components", [])
        )
        street = next((c["name"] for c in components if c["kind"] == "street"), "")
        house = next((c["name"] for c in components if c["kind"] == "house"), "")
        locality = next((c["name"] for c in components if c["kind"] == "locality"), "")

        if street and locality:
            short_address = f"{street}{', ' + house if house else ''}, {locality}"
        elif full:
            parts = full.split(",")
            short_address = ", ".join(p.strip() for p in parts[-3:])
        else:
            short_address = f"{lat:.5f}, {lng:.5f}"
    else:
        short_address = f"{lat:.5f}, {lng:.5f}"
        full = short_address

    return {
        "statusCode": 200,
        "headers": {**cors_headers, "Content-Type": "application/json"},
        "body": json.dumps({
            "address": short_address,
            "full": full,
            "lat": lat,
            "lng": lng,
        }, ensure_ascii=False),
    }
